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
    'Access-Control-Allow-Methods': 'DELETE, OPTIONS',
  };

  // Handle preflight requests
  if (event.httpMethod === 'OPTIONS') {
    return {
      statusCode: 200,
      headers,
      body: '',
    };
  }

  // Only allow DELETE requests
  if (event.httpMethod !== 'DELETE') {
    return {
      statusCode: 405,
      headers,
      body: JSON.stringify({ error: 'Method not allowed' }),
    };
  }

  try {
    // Parse request body
    const { id } = JSON.parse(event.body || '{}');

    // Validate required fields
    if (!id) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ 
          error: 'Design ID is required' 
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

    // First, verify the design exists and belongs to the user
    const { data: existingDesign, error: fetchError } = await supabase
      .from('designs')
      .select('id, name, user_id')
      .eq('id', id)
      .eq('user_id', user.id)
      .single();

    if (fetchError) {
      if (fetchError.code === 'PGRST116') {
        // No rows returned
        return {
          statusCode: 404,
          headers,
          body: JSON.stringify({ 
            error: 'Design not found or access denied' 
          }),
        };
      }
      
      console.error('Database fetch error:', fetchError);
      return {
        statusCode: 500,
        headers,
        body: JSON.stringify({ 
          error: 'Failed to verify design ownership' 
        }),
      };
    }

    if (!existingDesign) {
      return {
        statusCode: 404,
        headers,
        body: JSON.stringify({ 
          error: 'Design not found or access denied' 
        }),
      };
    }

    // Delete the design
    const { error: deleteError } = await supabase
      .from('designs')
      .delete()
      .eq('id', id)
      .eq('user_id', user.id);

    if (deleteError) {
      console.error('Database delete error:', deleteError);
      return {
        statusCode: 500,
        headers,
        body: JSON.stringify({ 
          error: 'Failed to delete design from database' 
        }),
      };
    }

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        message: 'Design deleted successfully',
        deletedDesign: {
          id: existingDesign.id,
          name: existingDesign.name
        }
      }),
    };

  } catch (error) {
    console.error('Error deleting design:', error);

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
        error: 'Internal server error while deleting design' 
      }),
    };
  }
};