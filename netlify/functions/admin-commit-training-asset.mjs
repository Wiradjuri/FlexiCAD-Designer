// netlify/functions/admin-commit-training-asset.mjs
import { requireAdmin, json, corsHeaders } from '../lib/require-admin.mjs';

const BUCKET = process.env.SUPABASE_STORAGE_BUCKET_TRAINING || 'training-assets';
const MAX_BYTES = 64 * 1024; // 64KB head
const MAX_LINES = 20;

export async function handler(event) {
  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers: corsHeaders };
  }

  const gate = await requireAdmin(event);
  if (!gate.ok) {
    return json(gate.status, { ok:false, code:'admin_required', error:'Admin access required' });
  }
  const { supabase, requesterEmail, requesterId } = gate;

  // Parse + validate body
  let body;
  try { body = JSON.parse(event.body || '{}'); }
  catch { return json(400, { ok:false, code:'bad_json', error:'Malformed JSON body' }); }

  let { object_path, assetType, filename, size, contentType, tags } = body || {};
  if (!assetType && filename) {
    const ext = (filename.split('.').pop() || '').toLowerCase();
    if (['svg','scad','jsonl'].includes(ext)) assetType = ext;
  }

  if (!object_path || !filename || !contentType || typeof size !== 'number' || !assetType) {
    return json(400, { ok:false, code:'bad_request',
      error:'Required: object_path, filename, contentType, size, assetType' });
  }
  if (!['svg','scad','jsonl'].includes(assetType)) {
    return json(400, { ok:false, code:'bad_type', error:`Unsupported assetType: ${assetType}` });
  }
  if (!Array.isArray(tags)) tags = [];

  // JSONL small-sample validation
  let sampleValidated = false;
  let sampleCount = 0;
  if (assetType === 'jsonl') {
    const { data: blob, error: dlErr } = await supabase.storage.from(BUCKET).download(object_path);
    if (dlErr) return json(500, { ok:false, code:'storage_download', error: dlErr.message });

    const buf = Buffer.from(await blob.arrayBuffer());
    const head = buf.length > MAX_BYTES ? buf.subarray(0, MAX_BYTES) : buf;
    let text = head.toString('utf8');
    // strip UTF-8 BOM
    if (text.charCodeAt(0) === 0xFEFF) text = text.slice(1);

    const lines = text.split(/\r\n|\n/);
    for (let i = 0; i < lines.length && sampleCount < MAX_LINES; i++) {
      const line = lines[i].trim();
      if (!line || line.startsWith('#')) continue;
      try {
        JSON.parse(line);
        sampleCount++;
      } catch (e) {
        return json(400, {
          ok: false,
          code: 'invalid_jsonl',
          lineNumber: i + 1,
          snippet: line.slice(0, 120),
          error: e.message
        });
      }
    }
    sampleValidated = sampleCount > 0;
  }

  // Upsert meta (object_path as natural key)
  const now = new Date().toISOString();

  const { data: existing, error: selErr } = await supabase
    .from('training_assets')
    .select('id')
    .eq('object_path', object_path)
    .maybeSingle();
  if (selErr) return json(500, { ok:false, code:'db_select', error: selErr.message });

  let id;
  if (existing) {
    const { data: upd, error: updErr } = await supabase
      .from('training_assets')
      .update({
        asset_type: assetType,
        filename,
        content_type: contentType,
        size_bytes: size,
        tags,
        active: true,
        updated_at: now
      })
      .eq('id', existing.id)
      .select('id')
      .single();
    if (updErr) return json(500, { ok:false, code:'db_update', error: updErr.message });
    id = upd.id;
  } else {
    const { data: ins, error: insErr } = await supabase
      .from('training_assets')
      .insert([{
        object_path,
        asset_type: assetType,
        filename,
        content_type: contentType,
        size_bytes: size,
        tags,
        active: true,
        created_by: requesterId,
        created_at: now,
        updated_at: now
      }])
      .select('id')
      .single();
    if (insErr) return json(500, { ok:false, code:'db_insert', error: insErr.message });
    id = ins.id;
  }

  await supabase.from('admin_audit').insert([{
    actor_email: requesterEmail,
    action: 'admin_commit_training_asset',
    details: { object_path, assetType, filename, size, tags, sampleValidated, sampleCount }
  }]);

  return json(200, { ok:true, id, object_path, sampleValidated, sampleCount });
}