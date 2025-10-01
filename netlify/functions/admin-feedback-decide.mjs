// netlify/functions/admin-feedback-decide.mjs
import { requireAdmin, json, corsHeaders } from '../lib/require-admin.mjs';

const BUCKET = process.env.SUPABASE_STORAGE_BUCKET_TRAINING || 'training-assets';
const CURATED_PREFIX = process.env.CURATED_PREFIX || 'curated/templates';
const CURATED_GLOBAL_PATH = process.env.CURATED_GLOBAL_PATH || 'curated/global/approved.jsonl';

export async function handler(event) {
  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers: corsHeaders };
  }

  const gate = await requireAdmin(event);
  if (!gate.ok) {
    return json(gate.status, { ok:false, code:'admin_required', error:'Admin access required' });
  }
  const { supabase, requesterEmail, requesterId } = gate;

  let body;
  try { body = JSON.parse(event.body || '{}'); }
  catch { return json(400, { ok:false, code:'bad_json', error:'Malformed JSON body' }); }

  const { feedback_id, decision, tags, reason } = body;
  if (!feedback_id || !['accept', 'reject'].includes(decision)) {
    return json(400, { ok:false, code:'bad_request', error:'feedback_id and decision required' });
  }

  try {
    // Get feedback record
    const { data: fb, error: selectErr } = await supabase
      .from('ai_feedback')
      .select('*')
      .eq('id', feedback_id)
      .single();

    if (selectErr) {
      if (selectErr.code === 'PGRST116') {
        return json(404, { ok:false, code:'not_found', error:'Feedback not found' });
      }
      return json(500, { ok:false, code:'db_select', error: selectErr.message });
    }

    // Idempotent check
    if (fb.review_status !== 'pending') {
      return json(200, {
        ok: true,
        message: `Feedback already ${fb.review_status}`,
        feedback: {
          id: fb.id,
          review_status: fb.review_status,
          reviewed_by: fb.reviewed_by,
          reviewed_at: fb.reviewed_at
        }
      });
    }

    let promotedId = null;
    let curatedObjectPath = null;

    // Accept flow: promote to training assets
    if (decision === 'accept') {
      // 1. Create training example
      const exampleTags = Array.isArray(tags) ? tags : ['admin-approved'];
      exampleTags.push('origin:feedback', `feedback_id:${feedback_id}`);
      
      const { data: example, error: exampleErr } = await supabase
        .from('ai_training_examples')
        .upsert([{
          source_feedback_id: feedback_id,
          template: fb.template || null,
          input_prompt: fb.design_prompt || null,
          generated_code: fb.generated_code || null,
          quality_score: fb.quality_score ?? null,
          quality_label: (fb.quality_score ?? 0) >= 4 ? 'good' : 'bad',
          tags: exampleTags,
          created_by: requesterId
        }], { onConflict: 'source_feedback_id' })
        .select('id')
        .single();

      if (exampleErr) {
        return json(500, { ok:false, code:'db_insert_example', error: exampleErr.message });
      }
      promotedId = example.id;

      // 2. Create JSONL entry
      const jsonlEntry = {
        template: fb.template || 'general',
        input_prompt: fb.design_prompt || null,
        generated_code: fb.generated_code || null,
        quality_score: fb.quality_score ?? null,
        tags: exampleTags
      };
      const jsonlLine = JSON.stringify(jsonlEntry) + '\n';

      // 3. Append to both curated paths
      const paths = [`${CURATED_PREFIX}/approved.jsonl`, CURATED_GLOBAL_PATH];
      
      for (const path of paths) {
        try {
          // Try to read existing file
          const { data: existing } = await supabase.storage.from(BUCKET).download(path);
          let content = '';
          
          if (existing) {
            content = await existing.text();
          }
          
          // Append new line
          content += jsonlLine;
          
          // Upload updated content
          const { error: uploadErr } = await supabase.storage
            .from(BUCKET)
            .upload(path, new Blob([content], { type: 'application/x-ndjson' }), {
              upsert: true
            });
            
          if (uploadErr) {
            console.warn(`⚠️ [admin-feedback-decide] Failed to update ${path}:`, uploadErr.message);
          }
        } catch (appendErr) {
          console.warn(`⚠️ [admin-feedback-decide] JSONL append failed for ${path}:`, appendErr);
        }
      }
      
      curatedObjectPath = CURATED_GLOBAL_PATH;

      // 4. Register as training asset
      const assetTags = ['origin:curated-feedback', `feedback_id:${feedback_id}`];
      if (fb.template) assetTags.push(`template:${fb.template}`);
      
      const now = new Date().toISOString();
      await supabase.from('training_assets').upsert([{
        object_path: curatedObjectPath,
        asset_type: 'jsonl',
        filename: 'approved.jsonl',
        content_type: 'application/x-ndjson',
        size_bytes: jsonlLine.length, // approximate
        tags: assetTags,
        active: true,
        created_by: requesterId,
        created_at: now,
        updated_at: now
      }], { onConflict: 'object_path' });
    }

    // Update feedback status
    const { data: updated, error: updateErr } = await supabase
      .from('ai_feedback')
      .update({
        review_status: decision === 'accept' ? 'accepted' : 'rejected',
        reviewed_by: requesterEmail,
        reviewed_at: new Date().toISOString()
      })
      .eq('id', feedback_id)
      .select('id, review_status, reviewed_by, reviewed_at')
      .single();

    if (updateErr) {
      return json(500, { ok:false, code:'db_update', error: updateErr.message });
    }

    // Log audit
    await supabase.from('admin_audit').insert([{
      actor_email: requesterEmail,
      action: 'admin_feedback_decide',
      details: { feedback_id, decision, reason, promoted_example_id: promotedId }
    }]);

    console.log(`[admin][feedback-decide] requester=${requesterEmail} id=${feedback_id} decision=${decision}`);

    return json(200, {
      ok: true,
      feedback: updated,
      promoted_example_id: promotedId,
      curated_object_path: curatedObjectPath
    });

  } catch (error) {
    console.error('❌ [admin-feedback-decide] Error:', error);
    return json(500, { ok:false, code:'internal_error', error: error.message });
  }
}