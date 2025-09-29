const { createClient } = require('@supabase/supabase-js');
const formidable = require('formidable');
const fs = require('fs');
const path = require('path');

// Admin endpoint to upload training assets (SVG/SCAD/JSONL)
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

        // Parse multipart form data
        const form = formidable({
            maxFileSize: 10 * 1024 * 1024, // 10MB max
            allowEmptyFiles: false,
            multiples: true
        });

        return new Promise((resolve) => {
            form.parse(event.body, async (err, fields, files) => {
                if (err) {
                    resolve({
                        statusCode: 400,
                        headers,
                        body: JSON.stringify({ error: 'Failed to parse upload' })
                    });
                    return;
                }

                const file = files.file && files.file[0] ? files.file[0] : files.file;
                
                if (!file) {
                    resolve({
                        statusCode: 400,
                        headers,
                        body: JSON.stringify({ error: 'No file provided' })
                    });
                    return;
                }

                // Validate file type
                const allowedTypes = ['.svg', '.scad', '.jsonl'];
                const fileExt = path.extname(file.originalFilename || '').toLowerCase();
                
                if (!allowedTypes.includes(fileExt)) {
                    resolve({
                        statusCode: 400,
                        headers,
                        body: JSON.stringify({ 
                            error: `Invalid file type. Allowed: ${allowedTypes.join(', ')}` 
                        })
                    });
                    return;
                }

                try {
                    // Read file content
                    const fileContent = fs.readFileSync(file.filepath);
                    
                    // Basic content validation
                    const contentStr = fileContent.toString('utf8');
                    if (fileExt === '.jsonl') {
                        // Validate JSONL format
                        const lines = contentStr.split('\n').filter(l => l.trim());
                        for (const line of lines) {
                            JSON.parse(line); // This will throw if invalid JSON
                        }
                    }

                    // Generate unique filename
                    const timestamp = Date.now();
                    const safeFilename = `${timestamp}_${file.originalFilename.replace(/[^a-zA-Z0-9.-]/g, '_')}`;
                    
                    // Upload to Supabase Storage
                    const bucketName = process.env.SUPABASE_STORAGE_BUCKET_TRAINING || 'training-assets';
                    
                    const { data: uploadData, error: uploadError } = await supabase.storage
                        .from(bucketName)
                        .upload(`uploads/${safeFilename}`, fileContent, {
                            contentType: file.mimetype || 'application/octet-stream',
                            metadata: {
                                uploadedBy: user.email,
                                originalName: file.originalFilename,
                                fileType: fileExt,
                                uploadedAt: new Date().toISOString()
                            }
                        });

                    if (uploadError) {
                        console.error('Upload error:', uploadError);
                        resolve({
                            statusCode: 500,
                            headers,
                            body: JSON.stringify({ error: 'Failed to upload file' })
                        });
                        return;
                    }

                    // Get signed URL for access
                    const { data: urlData } = await supabase.storage
                        .from(bucketName)
                        .createSignedUrl(`uploads/${safeFilename}`, 86400); // 24 hours

                    // Log to admin audit
                    try {
                        await supabase
                            .from('admin_audit')
                            .insert([{
                                admin_email: user.email,
                                action: 'training_asset_upload',
                                resource_type: 'training_asset',
                                resource_id: safeFilename,
                                details: {
                                    originalName: file.originalFilename,
                                    fileType: fileExt,
                                    fileSize: file.size,
                                    bucketPath: uploadData.path
                                }
                            }]);
                    } catch (auditError) {
                        console.warn('Failed to log admin audit:', auditError.message);
                    }

                    resolve({
                        statusCode: 200,
                        headers,
                        body: JSON.stringify({
                            ok: true,
                            asset: {
                                id: safeFilename,
                                name: file.originalFilename,
                                type: fileExt,
                                size: file.size,
                                path: uploadData.path,
                                url: urlData?.signedUrl,
                                uploadedAt: new Date().toISOString()
                            }
                        })
                    });

                } catch (uploadError) {
                    console.error('Asset upload error:', uploadError);
                    resolve({
                        statusCode: 500,
                        headers,
                        body: JSON.stringify({ 
                            error: uploadError.message 
                        })
                    });
                }
            });
        });

    } catch (error) {
        console.error('Admin upload training asset error:', error);
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