const { createClient } = require('@supabase/supabase-js');

// Admin endpoint to create signed upload URL for training assets
exports.handler = async (event, context) => {
    const headers = {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization',
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
    };

    if (event.httpMethod === 'OPTIONS') {
        return { statusCode: 200, headers, body: '' };
    }

    if (event.httpMethod !== 'POST') {
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

        // Parse request body
        const body = JSON.parse(event.body || '{}');
        const { filename, contentType, assetType, tags } = body;

        // Validate input
        if (!filename || !contentType || !assetType) {
            return {
                statusCode: 400,
                headers,
                body: JSON.stringify({ 
                    error: 'Missing required fields: filename, contentType, assetType' 
                }),
            };
        }

        const allowedTypes = ['svg', 'scad', 'jsonl'];
        if (!allowedTypes.includes(assetType)) {
            return {
                statusCode: 400,
                headers,
                body: JSON.stringify({ 
                    error: `Invalid asset type. Allowed: ${allowedTypes.join(', ')}` 
                }),
            };
        }

        // Generate safe object path
        const now = new Date();
        const year = now.getFullYear();
        const month = String(now.getMonth() + 1).padStart(2, '0');
        const day = String(now.getDate()).padStart(2, '0');
        const uuid = crypto.randomUUID();
        
        // Sanitize filename
        const safeFilename = filename
            .replace(/[^a-zA-Z0-9.-]/g, '_')
            .substring(0, 100); // Limit length
        
        const objectPath = `${year}/${month}/${day}/${uuid}_${safeFilename}`;
        
        // Create signed upload URL
        const bucketName = process.env.SUPABASE_STORAGE_BUCKET_TRAINING || 'training-assets';
        
        const { data: signedUpload, error: uploadError } = await supabase.storage
            .from(bucketName)
            .createSignedUploadUrl(objectPath);

        if (uploadError) {
            console.error('🔥 [admin_create_signed_upload] Failed to create signed upload URL:', uploadError);
            return {
                statusCode: 500,
                headers,
                body: JSON.stringify({ error: 'Failed to create signed upload URL' }),
            };
        }

        console.log(`📤 [admin_create_signed_upload] Created signed upload for: ${filename} (${assetType})`);

        return {
            statusCode: 200,
            headers,
            body: JSON.stringify({
                ok: true,
                bucket: bucketName,
                object_path: objectPath,
                signed_url: signedUpload.signedUrl,
                token: signedUpload.token,
                filename,
                assetType,
                tags: tags || []
            }),
        };

    } catch (error) {
        console.error('🔥 [admin_create_signed_upload] Error:', error);
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