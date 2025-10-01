// netlify/functions/admin-jsonl-preview.mjs
import { requireAdmin, json, corsHeaders } from '../lib/require-admin.mjs';

const BUCKET = process.env.SUPABASE_STORAGE_BUCKET_TRAINING || 'training-assets';
const MAX_BYTES = 64 * 1024; // 64KB head

export async function handler(event) {
  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers: corsHeaders };
  }

  const gate = await requireAdmin(event);
  if (!gate.ok) {
    return json(gate.status, { ok:false, code:'admin_required', error:'Admin access required' });
  }
  const { supabase } = gate;

  const params = event.queryStringParameters || {};
  const objectPath = params.object_path;
  const limit = Math.min(50, Math.max(1, parseInt(params.limit || '20')));

  console.log(`[${new Date().toISOString()}] === ADMIN-JSONL-PREVIEW START ===`, { objectPath, limit });

  if (!objectPath) {
    return json(400, { ok:false, code:'bad_request', error:'Missing object_path parameter' });
  }

  try {
    // Download file head
    const { data: blob, error: dlErr } = await supabase.storage.from(BUCKET).download(objectPath);
    if (dlErr) {
      return json(404, { ok:false, code:'not_found', error: dlErr.message });
    }

    const buf = Buffer.from(await blob.arrayBuffer());
    const head = buf.length > MAX_BYTES ? buf.subarray(0, MAX_BYTES) : buf;
    let text = head.toString('utf8');
    
    // Strip UTF-8 BOM
    if (text.charCodeAt(0) === 0xFEFF) text = text.slice(1);

    // Parse lines
    const lines = text.split(/\r\n|\n/);
    const result = [];
    let processed = 0;

    for (let i = 0; i < lines.length && processed < limit; i++) {
      const line = lines[i].trim();
      if (!line || line.startsWith('#')) continue;
      
      try {
        const parsed = JSON.parse(line);
        const keys = typeof parsed === 'object' && parsed !== null && !Array.isArray(parsed) 
          ? Object.keys(parsed) 
          : [];
        
        result.push({
          lineNumber: i + 1,
          keys,
          json: parsed,
          raw: line
        });
        processed++;
      } catch (e) {
        result.push({
          lineNumber: i + 1,
          keys: [],
          error: e.message,
          raw: line
        });
        processed++;
      }
    }

    const response = {
      ok: true,
      lines: result,
      sampleSizeBytes: head.length,
      assetSizeBytes: typeof blob.size === 'number' ? blob.size : buf.length,
      truncated: head.length < buf.length
    };

    console.log(`[${new Date().toISOString()}] === ADMIN-JSONL-PREVIEW COMPLETE ===`, {
      objectPath,
      lines: response.lines.length,
      sampleSize: response.sampleSizeBytes,
      truncated: response.truncated
    });

    return json(200, response);

  } catch (error) {
    console.error(`[${new Date().toISOString()}] ❌ ADMIN-JSONL-PREVIEW ERROR:`, error);
    return json(500, { ok:false, code:'internal_error', error: error.message });
  }
}