const { createClient } = require('@supabase/supabase-js');

// Admin endpoint to list training assets from database
exports.handler = async (event, context) => {
    const headers = {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization',
        'Access-Control-Allow-Methods': 'GET, OPTIONS',
    };

    if (event.httpMethod === 'OPTIONS') {
        return { statusCode: 200, headers, body: '' };
    }

    if (event.httpMethod !== 'GET') {
        return {
            statusCode: 405,
            headers,
            body: JSON.stringify({ error: 'Method not allowed' }),
        };
    }

    try {
        // Verify admin access
        const authHeader = event.headers.authorization || event.headers.Authorization;
        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            return {
                statusCode: 401,
                headers,
                body: JSON.stringify({ error: 'Authorization required' }),
            };
        }

        const token = authHeader.substring(7);
        const supabase = createClient(
            process.env.SUPABASE_URL,
            process.env.SUPABASE_SERVICE_ROLE_KEY
        );

        const { data: { user }, error: authError } = await supabase.auth.getUser(token);
        
        if (authError || !user || user.email !== 'bmuzza1992@gmail.com') {
            return {
                statusCode: 403,
                headers,
                body: JSON.stringify({ error: 'Admin access required' }),
            };
        }

        // Parse query parameters
        const params = event.queryStringParameters || {};
        const assetType = params.assetType; // filter by 'svg', 'scad', 'jsonl'
        const q = params.q || ''; // search query
        const page = parseInt(params.page || '1', 10);
        const limit = parseInt(params.limit || '50', 10);
        const offset = (page - 1) * limit;

        // Build query
        let query = supabase
            .from('training_assets')
            .select('*', { count: 'exact' })
            .eq('active', true)
            .order('created_at', { ascending: false })
            .range(offset, offset + limit - 1);

        // Apply filters
        if (assetType) {
            query = query.eq('asset_type', assetType);
        }

        if (q.trim()) {
            query = query.or(`filename.ilike.%${q}%,tags.cs.{${q}}`);
        }

        const { data: assets, error: assetsError, count } = await query;

        if (assetsError) {
            console.error('🔥 [admin_list_training_assets] Query error:', assetsError);
            return {
                statusCode: 500,
                headers,
                body: JSON.stringify({ error: 'Failed to list training assets' }),
            };
        }

        // Generate signed URLs for assets
        const bucketName = process.env.SUPABASE_STORAGE_BUCKET_TRAINING || 'training-assets';
        const assetsWithUrls = await Promise.all(
            (assets || []).map(async (asset) => {
                try {
                    const { data: urlData } = await supabase.storage
                        .from(bucketName)
                        .createSignedUrl(asset.object_path, 3600); // 1 hour

                    return {
                        ...asset,
                        url: urlData?.signedUrl
                    };
                } catch (urlError) {
                    console.warn(`Failed to create signed URL for ${asset.object_path}:`, urlError.message);
                    return asset; // Return without URL if error
                }
            })
        );

        console.log(`📋 [admin_list_training_assets] Listed ${assets?.length || 0} assets (${assetType || 'all'} types)`);

        return {
            statusCode: 200,
            headers,
            body: JSON.stringify({
                ok: true,
                assets: assetsWithUrls,
                pagination: {
                    page,
                    limit,
                    total: count || 0,
                    totalPages: Math.ceil((count || 0) / limit)
                },
                filters: {
                    assetType: assetType || null,
                    search: q || null
                }
            }),
        };

    } catch (error) {
        console.error('🔥 [admin_list_training_assets] Error:', error);
        return {
            statusCode: 500,
            headers,
            body: JSON.stringify({ 
                ok: false,
                error: error.message 
            }),
        };
    }
};