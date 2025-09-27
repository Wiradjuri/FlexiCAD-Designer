const { createClient } = require('@supabase/supabase-js');

exports.handler = async (event, context) => {
  // Enable CORS
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS'
  };

  // Handle preflight requests
  if (event.httpMethod === 'OPTIONS') {
    return {
      statusCode: 200,
      headers,
      body: ''
    };
  }

  try {
    // Initialize Supabase client server-side
    const supabase = createClient(
      process.env.SUPABASE_URL,
      process.env.SUPABASE_ANON_KEY
    );

    const body = JSON.parse(event.body || '{}');
    const { action, email, password } = body;

    let result;

    switch (action) {
      case 'signup':
        result = await supabase.auth.signUp({
          email,
          password
        });
        break;
      
      case 'signin':
        result = await supabase.auth.signInWithPassword({
          email,
          password
        });
        
        // If successful, create a session token or return user data
        if (result.data.user && result.data.session) {
          // Store session info that can be used by other functions
          result.sessionToken = result.data.session.access_token;
          result.userId = result.data.user.id;
        }
        break;
      
      case 'resend':
        result = await supabase.auth.resend({
          type: 'signup',
          email
        });
        break;
      
      case 'test':
        // Simple connection test
        result = { 
          data: { message: 'Supabase connection working from server-side' }, 
          error: null 
        };
        break;
      
      default:
        return {
          statusCode: 400,
          headers,
          body: JSON.stringify({ error: 'Invalid action' })
        };
    }

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify(result)
    };

  } catch (error) {
    console.error('Auth proxy error:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ 
        error: error.message,
        details: 'Server-side authentication failed'
      })
    };
  }
};