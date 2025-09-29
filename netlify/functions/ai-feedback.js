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
    
    // Handle both old format (number) and new format (object)
    let rating, qualityLabel, feedbackText;
    
    if (typeof feedback === 'object' && feedback !== null) {
      // New enhanced format
      rating = feedback.rating || feedback.quality_score;
      qualityLabel = feedback.quality_label;
      feedbackText = feedback.text;
    } else if (typeof feedback === 'number') {
      // Old format - just a number
      rating = feedback;
      const qualityLabels = { 1: 'unusable', 2: 'poor', 3: 'ok', 4: 'good', 5: 'excellent' };
      qualityLabel = qualityLabels[rating] || 'unknown';
    }
    
    // Validate rating
    if (rating !== undefined) {
      if (rating < 1 || rating > 5 || !Number.isInteger(rating)) {
        return {
          statusCode: 400,
          headers,
          body: JSON.stringify({ error: 'Rating must be an integer between 1 and 5' }),
        };
      }
      
      updateData.user_feedback = rating;
      updateData.updated_at = new Date().toISOString();
    }
    
    // Add feedback text if provided
    if (feedbackText) {
      updateData.feedback_text = feedbackText;
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

    // Also insert into ai_feedback table for admin review if rating is provided
    if (rating !== undefined) {
      try {
        // Get user email
        const { data: userProfile } = await supabaseService
          .from('profiles')
          .select('email')
          .eq('id', userId)
          .single();

        const feedbackData = {
          user_id: userId,
          user_email: userProfile?.email || 'unknown@example.com',
          session_id: session.id,
          template: session.design_category,
          design_id: sessionId,
          design_prompt: session.user_prompt,
          generated_code: session.generated_code,
          quality_score: rating,
          quality_label: qualityLabel,
          feedback_text: feedbackText,
          review_status: 'pending',
          generation_time_ms: session.generation_time_ms,
          tokens_used: session.tokens_used
        };

        await supabaseService
          .from('ai_feedback')
          .insert([feedbackData]);

        console.log('✅ Feedback stored in ai_feedback table for admin review');
      } catch (feedbackError) {
        console.error('⚠️ Failed to store in ai_feedback table:', feedbackError);
        // Don't fail the request if ai_feedback storage fails
      }
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