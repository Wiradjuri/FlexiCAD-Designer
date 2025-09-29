import { createClient } from '@supabase/supabase-js';

// Admin endpoint to commit training asset metadata after successful upload - Enhanced JSONL validation
export const handler = async (event, context) => {
    console.log('🚀 [admin-commit-training-asset] Request received:', {
        method: event.httpMethod,
        path: event.path
    });

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
            body: JSON.stringify({ ok: false, code: 'method_not_allowed', error: 'Method not allowed' }),
        };
    }

    try {
        // Verify admin access
        const authHeader = event.headers.authorization || event.headers.Authorization;
        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            return {
                statusCode: 401,
                headers,
                body: JSON.stringify({ ok: false, code: 'unauthorized', error: 'Authorization required' }),
            };
        }

        const token = authHeader.substring(7);
        const supabase = createClient(
            process.env.SUPABASE_URL,
            process.env.SUPABASE_SERVICE_ROLE_KEY,
            { auth: { persistSession: false } }
        );

        const { data: { user }, error: authError } = await supabase.auth.getUser(token);
        
        if (authError || !user || user.email !== process.env.ADMIN_EMAIL) {
            console.log('❌ [admin-commit-training-asset] Admin access denied:', { 
                email: user?.email, 
                expected: process.env.ADMIN_EMAIL 
            });
            return {
                statusCode: 403,
                headers,
                body: JSON.stringify({ ok: false, code: 'forbidden', error: 'Admin access required' }),
            };
        }

        // Parse request body
        const body = JSON.parse(event.body || '{}');
        const { object_path, assetType, filename, size, contentType, tags } = body;

        // Validate input
        if (!object_path || !assetType || !filename || !size || !contentType) {
            return {
                statusCode: 400,
                headers,
                body: JSON.stringify({ 
                    ok: false,
                    code: 'missing_fields',
                    error: 'Missing required fields: object_path, assetType, filename, size, contentType' 
                }),
            };
        }

        // Validate asset type
        if (!['svg', 'scad', 'jsonl'].includes(assetType)) {
            return {
                statusCode: 400,
                headers,
                body: JSON.stringify({ 
                    ok: false,
                    code: 'invalid_asset_type',
                    error: 'assetType must be: svg, scad, or jsonl' 
                }),
            };
        }

        console.log('📝 [admin-commit-training-asset] Processing asset:', { filename, assetType, size });

        // Enhanced JSONL validation with BOM and CRLF handling
        let validationResult = { 
            valid: true, 
            sampleValidated: false, 
            sampleCount: 0, 
            errors: [] 
        };
        
        if (assetType === 'jsonl') {
            try {
                console.log('🔍 [admin-commit-training-asset] Validating JSONL file...');
                
                // Read first ≤ 64KB from Storage object for performance
                const maxValidationSize = 64 * 1024; // 64KB limit
                const bucketName = process.env.SUPABASE_STORAGE_BUCKET_TRAINING || 'training-assets';
                
                const { data: fileData, error: downloadError } = await supabase.storage
                    .from(bucketName)
                    .download(object_path);

                if (downloadError) {
                    console.warn('⚠️ [admin-commit-training-asset] Could not download file for validation:', downloadError);
                    return {
                        statusCode: 400,
                        headers,
                        body: JSON.stringify({ 
                            ok: false,
                            code: 'file_not_accessible',
                            error: 'Could not access uploaded file for validation',
                            details: downloadError.message
                        }),
                    };
                }

                if (fileData) {
                    // Read file content as text
                    let content = await fileData.text();
                    
                    // Strip UTF-8 BOM if present
                    if (content.charCodeAt(0) === 0xFEFF) {
                        content = content.substring(1);
                        console.log('🧹 [admin-commit-training-asset] Stripped UTF-8 BOM from file');
                    }
                    
                    // Limit content size for validation performance
                    if (content.length > maxValidationSize) {
                        content = content.substring(0, maxValidationSize);
                        console.log(`📏 [admin-commit-training-asset] Validating first ${maxValidationSize} bytes of JSONL file`);
                    }
                    
                    // Split by CRLF or LF, skip blanks and comments
                    const lines = content
                        .split(/\r\n|\n/)
                        .map((line, index) => ({ line: line.trim(), number: index + 1 }))
                        .filter(({ line }) => line.length > 0 && !line.startsWith('#'));
                    
                    console.log(`📋 [admin-commit-training-asset] Found ${lines.length} non-empty lines to validate`);
                    
                    // Validate first N=20 non-blank lines for performance
                    const maxLinesToValidate = Math.min(20, lines.length);
                    let validatedCount = 0;
                    
                    for (let i = 0; i < maxLinesToValidate; i++) {
                        const { line, number } = lines[i];
                        
                        try {
                            const parsed = JSON.parse(line);
                            validatedCount++;
                            
                            // Check if parsed result is an object
                            if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed)) {
                                validationResult.errors.push(`Line ${number}: Expected JSON object, got ${Array.isArray(parsed) ? 'array' : typeof parsed}`);
                                validationResult.valid = false;
                            } else {
                                // Check for recommended training data fields
                                const recommendedKeys = ['input_prompt', 'generated_code'];
                                const missingKeys = recommendedKeys.filter(key => !(key in parsed));
                                
                                if (missingKeys.length > 0) {
                                    validationResult.errors.push(`Line ${number}: Missing recommended keys: ${missingKeys.join(', ')}`);
                                    validationResult.valid = false;
                                }
                            }
                            
                        } catch (jsonError) {
                            const errorSnippet = line.length > 50 ? line.substring(0, 47) + '...' : line;
                            validationResult.errors.push(`Line ${number}: Invalid JSON - ${jsonError.message} | ${errorSnippet}`);
                            validationResult.valid = false;
                            
                            // Stop validation after first few errors to avoid spam
                            if (validationResult.errors.length >= 5) {
                                validationResult.errors.push('... (stopping validation after 5 errors)');
                                break;
                            }
                        }
                    }
                    
                    validationResult.sampleValidated = true;
                    validationResult.sampleCount = validatedCount;
                    
                    console.log(`✅ [admin-commit-training-asset] JSONL validation complete: ${validatedCount} lines checked, ${validationResult.errors.length} errors`);
                }
            } catch (validationError) {
                console.error('❌ [admin-commit-training-asset] JSONL validation error:', validationError);
                validationResult.errors.push(`Validation failed: ${validationError.message}`);
                validationResult.valid = false;
            }
        }

        // If JSONL validation failed, return error with precise details
        if (assetType === 'jsonl' && !validationResult.valid) {
            return {
                statusCode: 400,
                headers,
                body: JSON.stringify({ 
                    ok: false,
                    code: 'invalid_jsonl',
                    error: 'Invalid JSONL file',
                    lineNumber: validationResult.errors[0]?.match(/Line (\d+):/)?.[1] || null,
                    snippet: validationResult.errors[0]?.split(' | ')[1] || null,
                    validation_errors: validationResult.errors,
                    help: 'Each line must be valid JSON object with input_prompt and generated_code fields'
                }),
            };
        }

        // Upsert metadata into training_assets table (idempotent on object_path)
        const assetData = {
            object_path,
            asset_type: assetType,
            filename,
            content_type: contentType,
            size_bytes: parseInt(size, 10),
            tags: tags || [],
            created_by: user.email,
            active: true,
            updated_at: new Date().toISOString()
        };

        const { data: insertedAsset, error: insertError } = await supabase
            .from('training_assets')
            .upsert([assetData], {
                onConflict: 'object_path',
                ignoreDuplicates: false
            })
            .select()
            .single();

        if (insertError) {
            console.error('❌ [admin-commit-training-asset] Failed to upsert asset:', insertError);
            return {
                statusCode: 500,
                headers,
                body: JSON.stringify({ 
                    ok: false,
                    code: 'database_error',
                    error: 'Failed to commit training asset metadata',
                    details: insertError.message
                }),
            };
        }

        // Log to admin audit (don't fail request if this fails)
        try {
            await supabase
                .from('admin_audit')
                .insert([{
                    admin_email: user.email,
                    action: 'training_asset_commit',
                    resource_type: 'training_asset',
                    resource_id: insertedAsset.id,
                    details: {
                        object_path,
                        filename,
                        assetType,
                        size,
                        tags: tags || [],
                        validation: validationResult
                    }
                }]);
        } catch (auditError) {
            console.warn('⚠️ [admin-commit-training-asset] Failed to log admin audit:', auditError.message);
        }

        console.log(`✅ [admin-commit-training-asset] Successfully committed: ${filename} (${assetType}) → ${insertedAsset.id}`);

        return {
            statusCode: 200,
            headers,
            body: JSON.stringify({
                ok: true,
                id: insertedAsset.id,
                object_path,
                asset: insertedAsset,
                sampleValidated: validationResult.sampleValidated,
                sampleCount: validationResult.sampleCount,
                validation_errors: validationResult.errors
            }),
        };

    } catch (error) {
        console.error('🔥 [admin-commit-training-asset] Unexpected error:', error);
        return {
            statusCode: 500,
            headers,
            body: JSON.stringify({ 
                ok: false,
                code: 'internal_error',
                error: error.message 
            }),
        };
    }
};