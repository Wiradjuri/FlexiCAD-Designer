// AI Feedback and Learning System
// Allows users to rate generations and provide corrections

const { createClient } = require('@supabase/supabase-js');

const supabaseService = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

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
    const { sessionId, feedback, finalCode, correctionType, correctionDescription } = JSON.parse(event.body);

    if (!sessionId) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'Session ID is required' }),
      };
    }

    // Authentication
    const authHeader = event.headers.authorization || event.headers.Authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return {
        statusCode: 401,
        headers,
        body: JSON.stringify({ error: 'Authorization token required' }),
      };
    }

    const token = authHeader.replace('Bearer ', '');
    let userId;

    try {
      const tokenParts = token.split('.');
      const payload = JSON.parse(Buffer.from(tokenParts[1], 'base64').toString());
      userId = payload.sub || payload.user_id;

      if (!userId) {
        throw new Error('No user ID found in token');
      }
    } catch (err) {
      return {
        statusCode: 401,
        headers,
        body: JSON.stringify({ error: 'Invalid token' }),
      };
    }

    // Verify payment status
    const { data: profile, error: profileError } = await supabaseService
      .from('profiles')
      .select('is_paid, is_active')
      .eq('id', userId)
      .single();

    if (profileError || !profile?.is_paid || !profile?.is_active) {
      return {
        statusCode: 403,
        headers,
        body: JSON.stringify({ error: 'Payment required' }),
      };
    }

    // Find the learning session
    const { data: session, error: sessionError } = await supabaseService
      .from('ai_learning_sessions')
      .select('*')
      .eq('session_id', sessionId)
      .eq('user_id', userId)
      .single();

    if (sessionError || !session) {
      return {
        statusCode: 404,
        headers,
        body: JSON.stringify({ error: 'Session not found' }),
      };
    }

    // Update the session with feedback
    const updateData = {};
    
    if (feedback !== undefined) {
      updateData.user_feedback = feedback;
      updateData.updated_at = new Date().toISOString();
    }

    if (finalCode) {
      updateData.final_code = finalCode;
      updateData.was_modified = true;
    }

    const { error: updateError } = await supabaseService
      .from('ai_learning_sessions')
      .update(updateData)
      .eq('id', session.id);

    if (updateError) {
      console.error('Error updating session:', updateError);
      return {
        statusCode: 500,
        headers,
        body: JSON.stringify({ error: 'Failed to update session' }),
      };
    }

    // If user provided corrections, store them separately
    if (finalCode && finalCode !== session.generated_code && correctionType) {
      const { error: correctionError } = await supabaseService
        .from('ai_corrections')
        .insert({
          session_id: session.id,
          user_id: userId,
          original_code: session.generated_code,
          corrected_code: finalCode,
          correction_type: correctionType,
          description: correctionDescription || null
        });

      if (correctionError) {
        console.error('Error storing correction:', correctionError);
        // Don't fail the request if correction storage fails
      }
    }

    // If feedback is high (4-5), this will trigger the knowledge base update via database trigger

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        success: true,
        message: 'Feedback recorded successfully',
        sessionId: sessionId
      }),
    };

  } catch (error) {
    console.error('Error recording feedback:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: 'Failed to record feedback' }),
    };
  }
};