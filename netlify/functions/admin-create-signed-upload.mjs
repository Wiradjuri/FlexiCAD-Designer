import { createClient } from '@supabase/supabase-js';
import { requireAuth, requireAdmin, json, corsHeaders } from '../lib/require-auth.mjs';

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
        const { filename, contentType, size, assetType } = body;

        console.log(`[admin][create-signed-upload] requester=${requesterEmail} filename=${filename} size=${size || 'unknown'}`);

        // Validate required input
        if (!filename || !contentType) {
            return json(400, { 
                ok: false,
                code: 'missing_fields',
                error: 'Missing required fields: filename, contentType' 
            });
        }

        // Derive assetType from filename if not provided
        let derivedAssetType = assetType;
        if (!derivedAssetType) {
            const ext = filename.split('.').pop().toLowerCase();
            if (['svg', 'scad', 'jsonl'].includes(ext)) {
                derivedAssetType = ext;
            } else {
                return json(400, { 
                    ok: false,
                    code: 'unsupported_extension',
                    error: 'Unsupported file extension. Must be: svg, scad, or jsonl' 
                });
            }
        }

        // Validate file size if provided (limit to 10MB for training assets)
        if (size) {
            const maxSize = 10 * 1024 * 1024; // 10MB
            if (parseInt(size, 10) > maxSize) {
                return json(400, { 
                    ok: false,
                    code: 'file_too_large',
                    error: `File size exceeds maximum of ${Math.round(maxSize / (1024 * 1024))}MB` 
                });
            }
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

        // Generate date-prefixed object path
        const now = new Date();
        const year = now.getFullYear();
        const month = String(now.getMonth() + 1).padStart(2, '0');
        const day = String(now.getDate()).padStart(2, '0');
        const uuid = Math.random().toString(36).substring(2, 15);
        const safeFilename = filename.replace(/[^a-zA-Z0-9.-]/g, '_');
        const objectPath = `${year}/${month}/${day}/${uuid}_${safeFilename}`;
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
            bucket: bucketName,
            object_path: objectPath,
            token: uploadData.token,
            assetType: derivedAssetType
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