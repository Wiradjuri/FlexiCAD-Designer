const { createClient } = require('@supabase/supabase-js');

// Initialize Supabase client
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_ANON_KEY
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

    // Verify user authentication
    const authToken = event.headers.authorization?.replace('Bearer ', '');
    if (!authToken) {
      return {
        statusCode: 401,
        headers,
        body: JSON.stringify({ error: 'Authentication required' }),
      };
    }

    // Verify the token with Supabase and get user
    const { data: { user }, error: authError } = await supabase.auth.getUser(authToken);
    if (authError || !user) {
      return {
        statusCode: 401,
        headers,
        body: JSON.stringify({ error: 'Invalid authentication token' }),
      };
    }

    // Save design to database
    const { data, error } = await supabase
      .from('designs')
      .insert([
        {
          user_id: user.id,
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