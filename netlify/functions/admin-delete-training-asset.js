const { createClient } = require('@supabase/supabase-js');

// Admin endpoint to delete training assets
exports.handler = async (event, context) => {
    const headers = {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization',
        'Access-Control-Allow-Methods': 'DELETE, OPTIONS',
    };

    if (event.httpMethod === 'OPTIONS') {
        return { statusCode: 200, headers, body: '' };
    }

    if (event.httpMethod !== 'DELETE') {
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

        // Get asset ID from query parameters
        const params = event.queryStringParameters || {};
        const assetId = params.id;
        
        if (!assetId) {
            return {
                statusCode: 400,
                headers,
                body: JSON.stringify({ error: 'Asset ID required' }),
            };
        }

        // Delete from Supabase Storage
        const bucketName = process.env.SUPABASE_STORAGE_BUCKET_TRAINING || 'training-assets';
        const filePath = `uploads/${assetId}`;
        
        const { data, error: deleteError } = await supabase.storage
            .from(bucketName)
            .remove([filePath]);

        if (deleteError) {
            console.error('Delete file error:', deleteError);
            return {
                statusCode: 500,
                headers,
                body: JSON.stringify({ error: 'Failed to delete training asset' }),
            };
        }

        // Log to admin audit
        try {
            await supabase
                .from('admin_audit')
                .insert([{
                    admin_email: user.email,
                    action: 'training_asset_delete',
                    resource_type: 'training_asset',
                    resource_id: assetId,
                    details: {
                        bucketPath: filePath,
                        deletedAt: new Date().toISOString()
                    }
                }]);
        } catch (auditError) {
            console.warn('Failed to log admin audit:', auditError.message);
        }

        return {
            statusCode: 200,
            headers,
            body: JSON.stringify({
                ok: true,
                message: 'Training asset deleted successfully',
                assetId,
                deletedFiles: data
            }),
        };

    } catch (error) {
        console.error('Admin delete training asset error:', error);
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