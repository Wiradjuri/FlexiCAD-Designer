const { createClient } = require('@supabase/supabase-js');

// Initialize Supabase client with service role key for admin operations
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

exports.handler = async (event, context) => {
  // CORS headers
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Access-Control-Allow-Methods': 'POST, GET, OPTIONS',
  };

  // Handle preflight requests
  if (event.httpMethod === 'OPTIONS') {
    return {
      statusCode: 200,
      headers,
      body: '',
    };
  }

  if (!['POST', 'GET'].includes(event.httpMethod)) {
    return {
      statusCode: 405,
      headers,
      body: JSON.stringify({ error: 'Method not allowed' }),
    };
  }

  try {
    let userId;
    
    if (event.httpMethod === 'GET') {
      // Extract userId from query parameters
      userId = event.queryStringParameters?.userId;
    } else {
      // Extract userId from request body
      const { userId: bodyUserId } = JSON.parse(event.body || '{}');
      userId = bodyUserId;
    }

    if (!userId) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'User ID is required' }),
      };
    }

    console.log('Checking payment status for user:', userId);

    // Check user's payment status using the new schema
    const { data, error } = await supabase
      .from('profiles')
      .select('is_paid, subscription_plan, payment_date, email, stripe_customer_id')
      .eq('id', userId)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        // No profile found - in payment-first system, this means user doesn't exist or wasn't created properly
        console.log('No profile found for user:', userId);
        return {
          statusCode: 200,
          headers,
          body: JSON.stringify({ 
            is_paid: false, 
            subscription_plan: 'none',
            payment_date: null,
            profile_exists: false,
            message: 'No payment record found'
          }),
        };
      }
      throw error;
    }

    console.log('Payment status result:', data);

    // In payment-first system, all users should be paid
    if (!data.is_paid) {
      console.error('🚨 User profile exists but is not paid - this should not happen in payment-first system');
    }

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        is_paid: data.is_paid || false,
        subscription_plan: data.subscription_plan || 'none',
        payment_date: data.payment_date,
        email: data.email,
        stripe_customer_id: data.stripe_customer_id,
        profile_exists: true
      }),
    };

  } catch (error) {
    console.error('Payment status check error:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ 
        error: 'Failed to check payment status',
        details: error.message
      }),
    };
  }
};