const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
);

const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

exports.handler = async (event, context) => {
    if (event.httpMethod === 'OPTIONS') {
        return { statusCode: 200, headers, body: '' };
    }

    if (event.httpMethod !== 'POST') {
        return {
            statusCode: 405,
            headers,
            body: JSON.stringify({ error: 'Method not allowed' })
        };
    }

    try {
        const { 
            sessionId, 
            rating, 
            feedback, 
            finalCode, 
            correctionType 
        } = JSON.parse(event.body);

        // Get user from auth token
        const authHeader = event.headers.authorization;
        if (!authHeader) {
            throw new Error('No authorization header');
        }

        const token = authHeader.replace('Bearer ', '');
        const { data: { user }, error: authError } = await supabase.auth.getUser(token);
        
        if (authError || !user) {
            throw new Error('Invalid authentication');
        }

        // Validate inputs
        if (!sessionId) {
            throw new Error('Session ID is required');
        }

        if (rating && (rating < 1 || rating > 5)) {
            throw new Error('Rating must be between 1 and 5');
        }

        // Update the learning session with feedback
        const updateData = {
            updated_at: new Date().toISOString()
        };

        if (rating) {
            updateData.user_feedback = rating;
        }

        if (feedback) {
            updateData.feedback_text = feedback;
        }

        if (finalCode) {
            updateData.final_code = finalCode;
            updateData.was_modified = true;
        }

        const { data: updatedSession, error: updateError } = await supabase
            .from('ai_learning_sessions')
            .update(updateData)
            .eq('session_id', sessionId)
            .eq('user_id', user.id)
            .select()
            .single();

        if (updateError) {
            throw new Error(`Failed to update session: ${updateError.message}`);
        }

        // If code was corrected, store the correction details
        if (finalCode && updatedSession.generated_code !== finalCode) {
            await supabase
                .from('ai_corrections')
                .insert({
                    session_id: updatedSession.id,
                    user_id: user.id,
                    original_code: updatedSession.generated_code,
                    corrected_code: finalCode,
                    correction_type: correctionType || 'improvement',
                    description: feedback
                });
        }

        // If rating is high (4-5), the trigger will automatically add to knowledge base
        let addedToKnowledgeBase = false;
        if (rating >= 4) {
            addedToKnowledgeBase = true;
        }

        return {
            statusCode: 200,
            headers,
            body: JSON.stringify({
                success: true,
                message: 'Feedback recorded successfully',
                sessionUpdated: true,
                addedToKnowledgeBase: addedToKnowledgeBase,
                sessionId: sessionId
            })
        };

    } catch (error) {
        console.error('Feedback error:', error);
        return {
            statusCode: 500,
            headers,
            body: JSON.stringify({ error: error.message })
        };
    }
};
