import { createClient } from '@supabase/supabase-js';

// Admin endpoint to accept/reject feedback for training with proper state management
export const handler = async (event, context) => {
    console.log('🚀 [admin-feedback-decide] Request received:', {
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
        
        // Use service-role client for admin operations (bypasses RLS)
        const supabase = createClient(
            process.env.SUPABASE_URL,
            process.env.SUPABASE_SERVICE_ROLE_KEY,
            { auth: { persistSession: false } }
        );

        // Verify user auth but use service role for data operations
        const { data: { user }, error: authError } = await supabase.auth.getUser(token);
        
        if (authError || !user || user.email !== process.env.ADMIN_EMAIL) {
            console.log('❌ [admin-feedback-decide] Admin access denied:', { 
                email: user?.email, 
                expected: process.env.ADMIN_EMAIL 
            });
            return {
                statusCode: 403,
                headers,
                body: JSON.stringify({ ok: false, code: 'forbidden', error: 'Admin access required' }),
            };
        }

        // Parse and validate request body
        const body = JSON.parse(event.body || '{}');
        const { feedback_id, decision, reason, tags } = body;

        // Validate input
        if (!feedback_id || !decision || !['accept', 'reject'].includes(decision)) {
            return {
                statusCode: 400,
                headers,
                body: JSON.stringify({ 
                    ok: false,
                    code: 'invalid_input',
                    error: 'feedback_id and decision (accept/reject) are required'
                }),
            };
        }

        console.log(`🎯 [admin-feedback-decide] ${user.email} ${decision}ing feedback ${feedback_id}`);

        // Start transaction-like operations
        let promotedExampleId = null;

        // Step 1: Get the feedback record
        const { data: feedback, error: feedbackError } = await supabase
            .from('ai_feedback')
            .select('*')
            .eq('id', feedback_id)
            .single();

        if (feedbackError || !feedback) {
            console.log('❌ [admin-feedback-decide] Feedback not found:', feedback_id);
            return {
                statusCode: 404,
                headers,
                body: JSON.stringify({ 
                    ok: false,
                    code: 'not_found',
                    error: 'Feedback not found',
                    feedback_id 
                }),
            };
        }

        // Check if already reviewed (idempotent operation)
        if (feedback.review_status !== 'pending') {
            console.log(`ℹ️ [admin-feedback-decide] Feedback ${feedback_id} already ${feedback.review_status}`);
            return {
                statusCode: 200,
                headers,
                body: JSON.stringify({
                    ok: true,
                    message: `Feedback already ${feedback.review_status}`,
                    feedback: {
                        id: feedback.id,
                        review_status: feedback.review_status,
                        reviewed_by: feedback.reviewed_by,
                        reviewed_at: feedback.reviewed_at
                    },
                    promoted_example_id: null // already processed
                }),
            };
        }

        const now = new Date().toISOString();
        const reviewStatus = decision === 'accept' ? 'accepted' : 'rejected';

        // Step 2: If accepting, create training example first (idempotent on source_feedback_id)
        if (decision === 'accept') {
            const trainingExample = {
                source_feedback_id: feedback_id,
                input_prompt: feedback.design_prompt,
                generated_code: feedback.generated_code,
                quality_score: feedback.quality_score || 5,
                quality_label: feedback.quality_label || 'admin-approved',
                tags: tags || ['admin-approved'],
                category: feedback.template_name || 'general',
                complexity_level: 'intermediate', // default
                created_by: user.email,
                active: true
            };

            const { data: example, error: exampleError } = await supabase
                .from('ai_training_examples')
                .upsert([trainingExample], { 
                    onConflict: 'source_feedback_id',
                    ignoreDuplicates: false 
                })
                .select()
                .single();

            if (exampleError) {
                console.error('❌ [admin-feedback-decide] Failed to create training example:', exampleError);
                return {
                    statusCode: 500,
                    headers,
                    body: JSON.stringify({ 
                        ok: false,
                        code: 'training_example_failed',
                        error: 'Failed to create training example',
                        details: exampleError.message
                    }),
                };
            }

            promotedExampleId = example.id;
            console.log(`✅ [admin-feedback-decide] Created/updated training example ${promotedExampleId} from feedback ${feedback_id}`);
        }

        // Step 3: Update feedback status
        const { data: updatedFeedback, error: updateError } = await supabase
            .from('ai_feedback')
            .update({
                review_status: reviewStatus,
                reviewed_by: user.email,
                reviewed_at: now,
                updated_at: now
            })
            .eq('id', feedback_id)
            .select()
            .single();

        if (updateError) {
            console.error('❌ [admin-feedback-decide] Failed to update feedback status:', updateError);
            return {
                statusCode: 500,
                headers,
                body: JSON.stringify({ 
                    ok: false,
                    code: 'update_failed',
                    error: 'Failed to update feedback status',
                    details: updateError.message
                }),
            };
        }

        // Step 4: Log audit entry (don't fail request if this fails)
        try {
            await supabase
                .from('admin_audit')
                .insert([{
                    admin_email: user.email,
                    action: `feedback_${decision}`,
                    resource_type: 'ai_feedback',
                    resource_id: feedback_id,
                    details: {
                        original_status: feedback.review_status,
                        new_status: reviewStatus,
                        reason: reason || null,
                        tags: tags || null,
                        promoted_example_id: promotedExampleId
                    }
                }]);
        } catch (auditError) {
            console.warn('⚠️ [admin-feedback-decide] Failed to log audit entry:', auditError.message);
            // Don't fail the request for audit logging issues
        }

        console.log(`✅ [admin-feedback-decide] Feedback ${feedback_id} ${reviewStatus} by ${user.email}`);

        // Return success with updated row
        return {
            statusCode: 200,
            headers,
            body: JSON.stringify({
                ok: true,
                message: `Feedback ${reviewStatus} successfully`,
                feedback: {
                    id: updatedFeedback.id,
                    review_status: updatedFeedback.review_status,
                    reviewed_by: updatedFeedback.reviewed_by,
                    reviewed_at: updatedFeedback.reviewed_at
                },
                promoted_example_id: promotedExampleId
            }),
        };

    } catch (error) {
        console.error('🔥 [admin-feedback-decide] Unexpected error:', error);
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