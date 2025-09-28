const { createClient } = require('@supabase/supabase-js');

exports.handler = async (event, context) => {
  // Enable CORS
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Content-Type': 'application/json'
  };

  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers, body: '' };
  }

  try {
    console.log('🔍 Debug: Attempting to list users...');

    // Initialize Supabase admin client
    const supabaseUrl = process.env.SUPABASE_URL;
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    console.log('🔍 Debug: Environment check', {
      hasUrl: !!supabaseUrl,
      hasServiceKey: !!supabaseServiceKey,
      urlStart: supabaseUrl?.substring(0, 30) + '...'
    });

    if (!supabaseUrl || !supabaseServiceKey) {
      return {
        statusCode: 500,
        headers,
        body: JSON.stringify({ 
          error: 'Missing Supabase configuration',
          details: {
            hasUrl: !!supabaseUrl,
            hasServiceKey: !!supabaseServiceKey
          }
        })
      };
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    console.log('🔍 Debug: Supabase client created, attempting to query profiles...');

    // First, let's try to get profiles (easier than auth users)
    const { data: profiles, error: profileError } = await supabase
      .from('profiles')
      .select('*')
      .limit(10);

    console.log('🔍 Debug: Profiles query result', { 
      profileCount: profiles?.length, 
      error: profileError?.message 
    });

    // Try to get auth users (this requires service role)
    let authUsers = null;
    let authError = null;
    
    try {
      const authResult = await supabase.auth.admin.listUsers();
      authUsers = authResult.data;
      authError = authResult.error;
      console.log('🔍 Debug: Auth users query result', { 
        userCount: authUsers?.users?.length, 
        error: authError?.message 
      });
    } catch (err) {
      console.log('🔍 Debug: Auth query failed:', err.message);
      authError = err;
    }

    // Prepare response
    const result = {
      success: true,
      timestamp: new Date().toISOString(),
      environment: {
        hasSupabaseUrl: !!supabaseUrl,
        hasServiceKey: !!supabaseServiceKey,
        supabaseUrl: supabaseUrl?.substring(0, 50) + '...'
      },
      profiles: {
        count: profiles?.length || 0,
        data: profiles || [],
        error: profileError?.message || null
      },
      authUsers: {
        count: authUsers?.users?.length || 0,
        data: authUsers?.users?.map(user => ({
          id: user.id,
          email: user.email,
          emailConfirmed: !!user.email_confirmed_at,
          created: user.created_at,
          lastSignIn: user.last_sign_in_at
        })) || [],
        error: authError?.message || null
      }
    };

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify(result, null, 2)
    };

  } catch (error) {
    console.error('🔍 Debug: Function error:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ 
        error: 'Internal server error',
        details: error.message,
        stack: error.stack
      }, null, 2)
    };
  }
};