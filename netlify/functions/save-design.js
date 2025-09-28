const { createClient } = require('@supabase/supabase-js');

// Initialize Supabase client with service role for database operations
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

exports.handler = async (event, context) => {
  // CORS headers
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
  };

  // Handle preflight requests
  if (event.httpMethod === 'OPTIONS') {
    return {
      statusCode: 200,
      headers,
      body: '',
    };
  }

  // Only allow POST requests
  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      headers,
      body: JSON.stringify({ error: 'Method not allowed' }),
    };
  }

  try {
    // Parse request body
    const { name, prompt, code } = JSON.parse(event.body || '{}');

    // Validate required fields
    if (!name || !code) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ 
          error: 'Name and code are required fields' 
        }),
      };
    }

    if (typeof name !== 'string' || name.trim().length === 0) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ 
          error: 'Valid design name is required' 
        }),
      };
    }

    if (typeof code !== 'string' || code.trim().length === 0) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ 
          error: 'Valid OpenSCAD code is required' 
        }),
      };
    }

    // Verify user authentication by extracting user ID from JWT
    const authToken = event.headers.authorization?.replace('Bearer ', '');
    if (!authToken) {
      return {
        statusCode: 401,
        headers,
        body: JSON.stringify({ error: 'Authentication required' }),
      };
    }

    let userId;
    try {
      // Decode JWT payload to get user ID
      const tokenParts = authToken.split('.');
      if (tokenParts.length !== 3) {
        throw new Error('Invalid JWT format');
      }
      
      const payload = JSON.parse(Buffer.from(tokenParts[1], 'base64').toString());
      userId = payload.sub || payload.user_id;
      
      if (!userId) {
        throw new Error('No user ID found in token');
      }
    } catch (err) {
      console.error('Failed to extract user ID from token:', err);
      return {
        statusCode: 401,
        headers,
        body: JSON.stringify({ error: 'Invalid token format' }),
      };
    }

    // Verify payment status before saving
    try {
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('is_paid, is_active, email')
        .eq('id', userId)
        .single();

      if (profileError || !profile?.is_paid || !profile?.is_active) {
        console.error('User payment check failed:', profileError);
        return {
          statusCode: 403,
          headers,
          body: JSON.stringify({ error: 'Payment required' }),
        };
      }

      console.log('Saving design for user:', profile.email);
    } catch (authErr) {
      console.error('Payment verification error:', authErr);
      return {
        statusCode: 500,
        headers,
        body: JSON.stringify({ error: 'Authentication verification failed' }),
      };
    }

    // Save design to database using service role (bypasses RLS)
    const { data, error } = await supabase
      .from('ai_designs')
      .insert([
        {
          user_id: userId,
          name: name.trim(),
          prompt: prompt ? prompt.trim() : null,
          code: code.trim(),
          created_at: new Date().toISOString()
        }
      ])
      .select()
      .single();

    if (error) {
      console.error('Database error:', error);
      
      // Handle specific database errors
      if (error.code === '23505') {
        return {
          statusCode: 409,
          headers,
          body: JSON.stringify({ 
            error: 'A design with this name already exists' 
          }),
        };
      }

      return {
        statusCode: 500,
        headers,
        body: JSON.stringify({ 
          error: 'Failed to save design to database' 
        }),
      };
    }

    return {
      statusCode: 201,
      headers,
      body: JSON.stringify({
        message: 'Design saved successfully',
        design: {
          id: data.id,
          name: data.name,
          prompt: data.prompt,
          created_at: data.created_at
        }
      }),
    };

  } catch (error) {
    console.error('Error saving design:', error);

    // Handle JSON parsing errors
    if (error instanceof SyntaxError) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ 
          error: 'Invalid JSON in request body' 
        }),
      };
    }

    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ 
        error: 'Internal server error while saving design' 
      }),
    };
  }
};