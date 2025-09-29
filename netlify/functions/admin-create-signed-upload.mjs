import { createClient } from '@supabase/supabase-js';
import { requireAdmin, corsHeaders, json } from '../lib/require-admin.mjs';

// Admin endpoint to create signed upload URL for training assets
export const handler = async (event, context) => {
    console.log('🚀 [admin-create-signed-upload] Request received:', {
        method: event.httpMethod,
        path: event.path
    });

    if (event.httpMethod === 'OPTIONS') {
        return { statusCode: 200, headers: corsHeaders, body: '' };
    }

    if (event.httpMethod !== 'POST') {
        return json(405, { ok: false, code: 'method_not_allowed', error: 'Method not allowed' });
    }

    // Check admin access using robust helper
    const gate = await requireAdmin(event);
    if (!gate.ok) {
        return json(gate.status, { ok: false, code: gate.code, error: gate.error });
    }
    
    const requesterEmail = gate.requesterEmail;
    const supabase = gate.supabase; // service client

    try {
        // Parse request body
        const body = JSON.parse(event.body || '{}');
        const { filename, contentType, size } = body;

        console.log(`[admin][create-signed-upload] requester=${requesterEmail} filename=${filename} size=${size}`);

        // Validate input
        if (!filename || !contentType || !size) {
            return json(400, { 
                ok: false,
                code: 'missing_fields',
                error: 'Missing required fields: filename, contentType, size' 
            });
        }

        // Validate file size (limit to 10MB for training assets)
        const maxSize = 10 * 1024 * 1024; // 10MB
        if (parseInt(size, 10) > maxSize) {
            return json(400, { 
                ok: false,
                code: 'file_too_large',
                error: `File size exceeds maximum of ${Math.round(maxSize / (1024 * 1024))}MB` 
            });
        }

        // Validate content type
        const allowedTypes = [
            'application/json', // JSONL files
            'text/plain',       // SCAD files  
            'image/svg+xml',    // SVG files
            'application/octet-stream' // Generic binary
        ];
        
        if (!allowedTypes.includes(contentType)) {
            return json(400, { 
                ok: false,
                code: 'invalid_content_type',
                error: 'Content type not allowed for training assets' 
            });
        }

        // Generate object path with timestamp
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
        const objectPath = `training-assets/${timestamp}-${filename}`;
        const bucketName = process.env.SUPABASE_STORAGE_BUCKET_TRAINING || 'training-assets';

        console.log('📁 [admin-create-signed-upload] Creating signed URL for:', { 
            bucket: bucketName, 
            path: objectPath 
        });

        // Create signed upload URL (expires in 1 hour)
        const { data: uploadData, error: uploadError } = await supabase.storage
            .from(bucketName)
            .createSignedUploadUrl(objectPath, {
                expiresIn: 3600, // 1 hour
                upsert: true
            });

        if (uploadError) {
            console.error('❌ [admin-create-signed-upload] Failed to create signed URL:', uploadError);
            return json(500, { 
                ok: false,
                code: 'upload_url_failed',
                error: 'Failed to create signed upload URL',
                details: uploadError.message
            });
        }

        console.log('✅ [admin-create-signed-upload] Signed URL created successfully');

        return json(200, {
            ok: true,
            uploadUrl: uploadData.signedUrl,
            objectPath: objectPath,
            token: uploadData.token,
            expiresIn: 3600,
            bucketName: bucketName
        });

    } catch (error) {
        console.error('🔥 [admin-create-signed-upload] Unexpected error:', error);
        return json(500, { 
            ok: false,
            code: 'internal_error',
            error: error.message 
        });
    }
};