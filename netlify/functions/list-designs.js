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
    'Access-Control-Allow-Methods': 'GET, OPTIONS',
  };

  // Handle preflight requests
  if (event.httpMethod === 'OPTIONS') {
    return {
      statusCode: 200,
      headers,
      body: '',
    };
  }

  // Only allow GET requests
  if (event.httpMethod !== 'GET') {
    return {
      statusCode: 405,
      headers,
      body: JSON.stringify({ error: 'Method not allowed' }),
    };
  }

  try {
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

    // Parse query parameters for pagination
    const queryParams = new URLSearchParams(event.queryStringParameters || {});
    const page = Math.max(1, parseInt(queryParams.get('page')) || 1);
    const limit = Math.min(50, Math.max(1, parseInt(queryParams.get('limit')) || 20));
    const offset = (page - 1) * limit;

    // Optional search/filter parameters
    const search = queryParams.get('search');
    const sortBy = queryParams.get('sort') || 'created_at';
    const sortOrder = queryParams.get('order')?.toLowerCase() === 'asc' ? 'asc' : 'desc';

    // Build the query
    let query = supabase
      .from('designs')
      .select('id, name, prompt, code, created_at', { count: 'exact' })
      .eq('user_id', user.id);

    // Add search filter if provided
    if (search && search.trim()) {
      query = query.or(`name.ilike.%${search.trim()}%,prompt.ilike.%${search.trim()}%`);
    }

    // Add sorting
    const validSortFields = ['name', 'created_at'];
    const sortField = validSortFields.includes(sortBy) ? sortBy : 'created_at';
    query = query.order(sortField, { ascending: sortOrder === 'asc' });

    // Add pagination
    query = query.range(offset, offset + limit - 1);

    // Execute query
    const { data: designs, error, count } = await query;

    if (error) {
      console.error('Database error:', error);
      return {
        statusCode: 500,
        headers,
        body: JSON.stringify({ 
          error: 'Failed to retrieve designs from database' 
        }),
      };
    }

    // Calculate pagination info
    const totalPages = Math.ceil((count || 0) / limit);
    const hasNextPage = page < totalPages;
    const hasPreviousPage = page > 1;

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        designs: designs || [],
        pagination: {
          page,
          limit,
          total: count || 0,
          totalPages,
          hasNextPage,
          hasPreviousPage
        },
        search: search || null
      }),
    };

  } catch (error) {
    console.error('Error listing designs:', error);

    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ 
        error: 'Internal server error while retrieving designs' 
      }),
    };
  }
};