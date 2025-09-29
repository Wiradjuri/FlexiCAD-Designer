/**
 * Admin Training Assets List
 * Endpoint: GET /api/admin-list-training-assets
 * 
 * Lists training assets with signed URLs for previewing
 * Phase 4.4.3 Implementation - Training Assets Viewer
 */

import { requireAdmin } from '../lib/require-admin.mjs';

export const handler = async (event, context) => {
  // CORS preflight
  if (event.httpMethod === 'OPTIONS') {
    return {
      statusCode: 200,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
        'Access-Control-Allow-Methods': 'GET, OPTIONS',
      },
      body: '',
    };
  }

  if (event.httpMethod !== 'GET') {
    return {
      statusCode: 405,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ error: 'Method not allowed' }),
    };
  }

  try {
    // Verify admin authentication
    const { requesterId, supabase } = await requireAdmin(event);

    // Parse query parameters
    const params = new URLSearchParams(event.queryStringParameters || '');
    const page = Math.max(1, parseInt(params.get('page') || '1'));
    const limit = Math.min(100, Math.max(1, parseInt(params.get('limit') || '20')));
    const search = params.get('search') || '';
    const status = params.get('status') || 'all'; // all, active, inactive
    
    console.log(`👤 Admin ${requesterId} listing training assets (page ${page}, limit ${limit})`);

    // Build query
    let query = supabase
      .from('training_assets')
      .select('*', { count: 'exact' })
      .order('created_at', { ascending: false });

    // Apply filters
    if (search) {
      query = query.or(`name.ilike.%${search}%,description.ilike.%${search}%`);
    }

    if (status === 'active') {
      query = query.eq('status', 'active');
    } else if (status === 'inactive') {
      query = query.neq('status', 'active');
    }

    // Apply pagination
    const offset = (page - 1) * limit;
    query = query.range(offset, offset + limit - 1);

    const { data: assets, error: listError, count } = await query;

    if (listError) {
      console.error('Error listing training assets:', listError);
      return {
        statusCode: 500,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ error: 'Failed to list training assets' }),
      };
    }

    // Generate signed URLs for JSONL previews
    const assetsWithUrls = await Promise.all(
      (assets || []).map(async (asset) => {
        let previewUrl = null;
        let downloadUrl = null;
        
        if (asset.storage_path) {
          try {
            // Get signed URL for preview (5 minutes)
            const { data: previewUrlData } = await supabase.storage
              .from('training-assets')
              .createSignedUrl(asset.storage_path, 300);
            
            // Get signed URL for download (1 hour)
            const { data: downloadUrlData } = await supabase.storage
              .from('training-assets')
              .createSignedUrl(asset.storage_path, 3600);

            previewUrl = previewUrlData?.signedUrl;
            downloadUrl = downloadUrlData?.signedUrl;
          } catch (urlError) {
            console.error(`Failed to generate URLs for ${asset.name}:`, urlError);
          }
        }

        return {
          ...asset,
          preview_url: previewUrl,
          download_url: downloadUrl,
          file_size_mb: asset.file_size ? (asset.file_size / (1024 * 1024)).toFixed(2) : null
        };
      })
    );

    const totalPages = Math.ceil((count || 0) / limit);

    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        ok: true,
        items: assetsWithUrls,
        total: count || 0,
        page,
        limit,
        totalPages,
        hasNext: page < totalPages,
        hasPrev: page > 1
      }),
    };

  } catch (error) {
    console.error('Admin list training assets error:', error);
    return {
      statusCode: 500,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ error: 'Internal server error' }),
    };
  }
};