const { createClient } = require('@supabase/supabase-js');

// Admin endpoint to accept/reject feedback for training
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
        const { feedback_id, decision, reason, tags } = body;

        // Validate input
        if (!feedback_id || !decision || !['accept', 'reject'].includes(decision)) {
            return {
                statusCode: 400,
                headers,
                body: JSON.stringify({ error: 'Invalid feedback_id or decision' }),
            };
        }

        // Get the feedback record
        const { data: feedback, error: feedbackError } = await supabase
            .from('ai_feedback')
            .select('*')
            .eq('id', feedback_id)
            .single();

        if (feedbackError || !feedback) {
            return {
                statusCode: 404,
                headers,
                body: JSON.stringify({ error: 'Feedback not found' }),
            };
        }

        // Check if already reviewed (idempotent)
        if (feedback.review_status !== 'pending') {
            return {
                statusCode: 200,
                headers,
                body: JSON.stringify({ 
                    ok: true, 
                    message: `Feedback already ${feedback.review_status}`,
                    current_status: feedback.review_status
                }),
            };
        }

        const now = new Date().toISOString();
        const reviewStatus = decision === 'accept' ? 'accepted' : 'rejected';

        // Update feedback status
        const { error: updateError } = await supabase
            .from('ai_feedback')
            .update({
                review_status: reviewStatus,
                reviewed_by: user.email,
                reviewed_at: now
            })
            .eq('id', feedback_id);

        if (updateError) {
            console.error('Failed to update feedback:', updateError);
            return {
                statusCode: 500,
                headers,
                body: JSON.stringify({ error: 'Failed to update feedback' }),
            };
        }

        // If accepted, create training example
        if (decision === 'accept') {
            // Get the associated learning session for more context
            const { data: session } = await supabase
                .from('ai_learning_sessions')
                .select('*')
                .eq('id', feedback.session_id)
                .single();

            const trainingExample = {
                source_feedback_id: feedback_id,
                input_prompt: feedback.design_prompt || session?.user_prompt || '',
                generated_code: session?.generated_code || '',
                quality_score: feedback.quality_score,
                quality_label: feedback.quality_label,
                tags: tags || [],
                category: session?.design_category || 'general',
                complexity_level: session?.complexity_level || 'intermediate',
                created_by: user.email,
                active: true
            };

            const { error: trainingError } = await supabase
                .from('ai_training_examples')
                .insert([trainingExample]);

            if (trainingError) {
                console.error('Failed to create training example:', trainingError);
                // Don't fail the whole request, but log the error
            }
        }

        // Log to admin audit (if table exists)
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
                        tags: tags || null
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
                message: `Feedback ${reviewStatus} successfully`,
                feedback_id,
                decision: reviewStatus,
                training_example_created: decision === 'accept'
            }),
        };

    } catch (error) {
        console.error('Admin feedback decide error:', error);
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