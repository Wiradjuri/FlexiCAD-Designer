const { createClient } = require('@supabase/supabase-js');

// Admin endpoint to delete training assets
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
        const { id } = body;
        
        if (!id) {
            return {
                statusCode: 400,
                headers,
                body: JSON.stringify({ error: 'Asset ID required' }),
            };
        }

        // Get asset record from database
        const { data: asset, error: fetchError } = await supabase
            .from('training_assets')
            .select('*')
            .eq('id', id)
            .single();

        if (fetchError || !asset) {
            return {
                statusCode: 404,
                headers,
                body: JSON.stringify({ error: 'Training asset not found' }),
            };
        }

        // Delete from database (soft delete by setting active = false)
        const { error: dbDeleteError } = await supabase
            .from('training_assets')
            .update({ active: false, updated_at: new Date().toISOString() })
            .eq('id', id);

        if (dbDeleteError) {
            console.error('🔥 [admin_delete_training_asset] Database delete error:', dbDeleteError);
            return {
                statusCode: 500,
                headers,
                body: JSON.stringify({ error: 'Failed to delete training asset from database' }),
            };
        }

        // Also delete from Supabase Storage
        const bucketName = process.env.SUPABASE_STORAGE_BUCKET_TRAINING || 'training-assets';
        const { error: storageDeleteError } = await supabase.storage
            .from(bucketName)
            .remove([asset.object_path]);

        // Don't fail if storage deletion fails - the DB record is already marked inactive
        if (storageDeleteError) {
            console.warn('⚠️ [admin_delete_training_asset] Storage delete failed:', storageDeleteError.message);
        }

        // Log to admin audit
        try {
            await supabase
                .from('admin_audit')
                .insert([{
                    admin_email: user.email,
                    action: 'training_asset_delete',
                    resource_type: 'training_asset',
                    resource_id: id,
                    details: {
                        filename: asset.filename,
                        object_path: asset.object_path,
                        asset_type: asset.asset_type,
                        deletedAt: new Date().toISOString(),
                        storage_deleted: !storageDeleteError
                    }
                }]);
        } catch (auditError) {
            console.warn('⚠️ [admin_delete_training_asset] Failed to log admin audit:', auditError.message);
        }

        console.log(`🗑️ [admin_delete_training_asset] Deleted: ${asset.filename} (${id})`);

        return {
            statusCode: 200,
            headers,
            body: JSON.stringify({
                ok: true,
                message: 'Training asset deleted successfully',
                id,
                filename: asset.filename,
                storage_deleted: !storageDeleteError
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