// netlify/functions/admin-list-training-assets.mjs
import { requireAdmin, json, corsHeaders } from '../lib/require-admin.mjs';

const BUCKET = process.env.SUPABASE_STORAGE_BUCKET_TRAINING || 'training-assets';
const CURATED_GLOBAL_PATH = process.env.CURATED_GLOBAL_PATH || 'curated/global/approved.jsonl';

export async function handler(event) {
  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers: corsHeaders };
  }

  const gate = await requireAdmin(event);
  if (!gate.ok) {
    return json(gate.status, { ok:false, code:'admin_required', error:'Admin access required' });
  }
  const { supabase, requesterEmail } = gate;

  // Parse query params
  const params = event.queryStringParameters || {};
  const assetType = params.assetType || '';
  const q = params.q || '';
  const page = Math.max(1, parseInt(params.page || '1'));
  const limit = Math.min(100, Math.max(1, parseInt(params.limit || '20')));

  const startedAt = new Date().toISOString();
  console.log(`[${startedAt}] === ADMIN-LIST-TRAINING-ASSETS START ===`, { requesterEmail, assetType, q, page, limit });

  try {
    // 1. Get training_assets from database
    let query = supabase
      .from('training_assets')
      .select('id, object_path, asset_type, filename, content_type, size_bytes, tags, created_at', { count: 'exact' })
      .eq('active', true)
      .order('created_at', { ascending: false });

    // Apply filters
    if (assetType && ['svg', 'scad', 'jsonl'].includes(assetType)) {
      query = query.eq('asset_type', assetType);
    }
    if (q) {
      query = query.ilike('filename', `%${q}%`);
    }

    const { data: rawAssets, error: listError, count } = await query;
    if (listError) {
      console.error('❌ [admin-list-training-assets] Database error:', listError);
      return json(500, { ok:false, code:'db_error', error: listError.message });
    }

    const allAssets = [];

    // 2. Add curated global JSONL as synthetic entry if not filtered out
    if (!assetType || assetType === 'jsonl') {
      try {
        const { data: curatedStat, error: statError } = await supabase.storage
          .from(BUCKET)
          .list(CURATED_GLOBAL_PATH.split('/').slice(0, -1).join('/'), {
            search: CURATED_GLOBAL_PATH.split('/').pop()
          });

        if (!statError && curatedStat?.length > 0) {
          const curatedFile = curatedStat[0];
          const curatedFilename = CURATED_GLOBAL_PATH.split('/').pop() || 'approved.jsonl';
          allAssets.push({
            id: null, // Synthetic entry
            object_path: CURATED_GLOBAL_PATH,
            asset_type: 'jsonl',
            filename: curatedFilename,
            content_type: 'application/x-ndjson',
            size_bytes: curatedFile.metadata?.size || null,
            tags: ['origin:curated-feedback'],
            created_at: curatedFile.created_at || null,
            url: null,
            source: 'Curated'
          });
        }
      } catch (curatedError) {
        console.warn(`[${new Date().toISOString()}] ⚠️ ADMIN-LIST-TRAINING-ASSETS curated stat failed:`, curatedError.message);
      }
    }

    // 3. Process database assets with signed URLs and source tags  
    const dbAssets = await Promise.all(
      (rawAssets || []).map(async (asset) => {
        let url = null;
        
        if (['svg', 'scad'].includes(asset.asset_type) && asset.object_path) {
          try {
            const { data: urlData } = await supabase.storage
              .from(BUCKET)
              .createSignedUrl(asset.object_path, 3600); // 60min
            url = urlData?.signedUrl || null;
          } catch (urlError) {
            console.warn(`⚠️ [admin-list-training-assets] Failed to create signed URL for ${asset.object_path}:`, urlError.message);
          }
        }

        // Determine source based on tags and object_path
        let source = 'Admin Upload';
        if (asset.tags?.includes('origin:curated-feedback')) {
          source = 'Curated';
        } else if (asset.object_path?.includes('curated/')) {
          source = 'Curated';
        }

        return {
          id: asset.id,
          object_path: asset.object_path,
          asset_type: asset.asset_type,
          filename: asset.filename,
          content_type: asset.content_type,
          size_bytes: asset.size_bytes,
          tags: asset.tags || [],
          created_at: asset.created_at,
          url,
          download_url: url,
          source
        };
      })
    );

    // 4. Combine and sort all assets (synthetic + database)
    allAssets.push(...dbAssets);
    
    // Sort by created_at desc (nulls last for synthetic entries)
    allAssets.sort((a, b) => {
      if (!a.created_at && !b.created_at) return 0;
      if (!a.created_at) return 1;
      if (!b.created_at) return -1;
      return new Date(b.created_at) - new Date(a.created_at);
    });

    // 5. Apply client-side pagination to combined results
    const startIdx = (page - 1) * limit;
    const endIdx = startIdx + limit;
    const paginatedAssets = allAssets.slice(startIdx, endIdx);

    const totalBytes = allAssets.reduce((sum, asset) => sum + (asset.size_bytes || 0), 0);

    console.log(`[${new Date().toISOString()}] === ADMIN-LIST-TRAINING-ASSETS COMPLETE ===`, {
      requesterEmail,
      assetType,
      totalAssets: allAssets.length,
      returned: paginatedAssets.length,
      totalBytes
    });

    return json(200, {
      ok: true,
      assets: paginatedAssets,
      pagination: {
        total: allAssets.length,
        page,
        limit,
        dbCount: count || 0,
        syntheticCount: allAssets.length - (count || 0)
      },
      stats: {
        totalBytes
      }
    });

  } catch (error) {
    console.error(`[${new Date().toISOString()}] ❌ ADMIN-LIST-TRAINING-ASSETS ERROR:`, error);
    return json(500, { ok:false, code:'server_error', error: error.message });
  }
}