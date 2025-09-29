const { createClient } = require('@supabase/supabase-js');

// Admin endpoint to list training assets
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
        const type = params.type; // filter by file type (.svg, .scad, .jsonl)
        const limit = parseInt(params.limit || '50', 10);
        
        // List files from Supabase Storage
        const bucketName = process.env.SUPABASE_STORAGE_BUCKET_TRAINING || 'training-assets';
        
        const { data: files, error: listError } = await supabase.storage
            .from(bucketName)
            .list('uploads', {
                limit,
                sortBy: { column: 'created_at', order: 'desc' }
            });

        if (listError) {
            console.error('List files error:', listError);
            return {
                statusCode: 500,
                headers,
                body: JSON.stringify({ error: 'Failed to list training assets' }),
            };
        }

        // Filter and process files
        let processedFiles = (files || [])
            .filter(file => file.name !== '.emptyFolderPlaceholder')
            .map(file => {
                const fileExt = file.name.split('.').pop()?.toLowerCase();
                return {
                    id: file.name,
                    name: file.metadata?.originalName || file.name,
                    type: `.${fileExt}`,
                    size: file.metadata?.size,
                    uploadedAt: file.created_at,
                    uploadedBy: file.metadata?.uploadedBy,
                    path: `uploads/${file.name}`
                };
            });

        // Apply type filter if specified
        if (type) {
            processedFiles = processedFiles.filter(file => file.type === type);
        }

        // Get signed URLs for recent files (optional)
        const assetsWithUrls = await Promise.all(
            processedFiles.slice(0, 10).map(async (asset) => {
                try {
                    const { data: urlData } = await supabase.storage
                        .from(bucketName)
                        .createSignedUrl(asset.path, 3600); // 1 hour
                    
                    return {
                        ...asset,
                        url: urlData?.signedUrl
                    };
                } catch (urlError) {
                    return asset; // Return without URL if error
                }
            })
        );

        return {
            statusCode: 200,
            headers,
            body: JSON.stringify({
                ok: true,
                assets: assetsWithUrls,
                total: processedFiles.length,
                bucket: bucketName,
                filters: {
                    type: type || null,
                    limit
                }
            }),
        };

    } catch (error) {
        console.error('Admin list training assets error:', error);
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