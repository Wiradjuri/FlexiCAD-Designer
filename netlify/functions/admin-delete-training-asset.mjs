// netlify/functions/admin-delete-training-asset.mjs
import { requireAuth, requireAdmin, json, corsHeaders } from '../lib/require-auth.mjs';

const BUCKET = process.env.SUPABASE_STORAGE_BUCKET_TRAINING || 'training-assets';

export async function handler(event) {
  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers: corsHeaders };
  }

  const gate = await requireAdmin(event);
  if (!gate.ok) {
    return json(gate.status, { ok:false, code:'admin_required', error:'Admin access required' });
  }
  const { supabase, requesterEmail } = gate;

  let body;
  try { body = JSON.parse(event.body || '{}'); }
  catch { return json(400, { ok:false, code:'bad_json', error:'Malformed JSON body' }); }

  const { id } = body;
  if (!id) {
    return json(400, { ok:false, code:'bad_request', error:'Missing id parameter' });
  }

  try {
    // Get the asset to get object_path for storage deletion
    const { data: asset, error: selectError } = await supabase
      .from('training_assets')
      .select('object_path, filename')
      .eq('id', id)
      .single();

    if (selectError) {
      if (selectError.code === 'PGRST116') {
        return json(404, { ok:false, code:'not_found', error:'Training asset not found' });
      }
      return json(500, { ok:false, code:'db_error', error: selectError.message });
    }

    // Delete from storage if object_path exists
    if (asset.object_path) {
      try {
        const { error: storageError } = await supabase.storage
          .from(BUCKET)
          .remove([asset.object_path]);
        if (storageError) {
          console.warn(`⚠️ [admin-delete-training-asset] Storage deletion failed for ${asset.object_path}:`, storageError.message);
        }
      } catch (storageError) {
        console.warn(`⚠️ [admin-delete-training-asset] Storage deletion error:`, storageError);
      }
    }

    // Delete from database
    const { error: deleteError } = await supabase
      .from('training_assets')
      .delete()
      .eq('id', id);

    if (deleteError) {
      return json(500, { ok:false, code:'db_delete_error', error: deleteError.message });
    }

    // Log audit entry
    await supabase.from('admin_audit').insert([{
      actor_email: requesterEmail,
      action: 'admin_delete_training_asset',
      details: { id, filename: asset.filename, object_path: asset.object_path }
    }]);

    console.log(`[admin][assets][delete] requester=${requesterEmail} id=${id} filename=${asset.filename}`);

    return json(200, { ok: true });

  } catch (error) {
    console.error('❌ [admin-delete-training-asset] Error:', error);
    return json(500, { ok:false, code:'internal_error', error: error.message });
  }
}