const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
const { createClient } = require('@supabase/supabase-js');

// Initialize Supabase with service role key for admin operations
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

exports.handler = async (event, context) => {
  console.log('🛒 create-checkout-session function called');

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

  if (event.httpMethod !== 'POST') {
    console.log('❌ Method not allowed:', event.httpMethod);
    return {
      statusCode: 405,
      headers,
      body: JSON.stringify({ error: 'Method not allowed' }),
    };
  }

  try {
    console.log('📝 Request body:', event.body);
    
    if (!event.body) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'Request body is required' }),
      };
    }

    const { email, password, plan } = JSON.parse(event.body);

    // Validate required parameters
    if (!email || !password || !plan) {
      console.log('❌ Missing required parameters:', { email: !!email, password: !!password, plan });
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ 
          error: 'Missing required parameters',
          required: ['email', 'password', 'plan'],
          received: { email: !!email, password: !!password, plan: !!plan }
        }),
      };
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      console.log('❌ Invalid email format:', email);
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'Invalid email format' }),
      };
    }

    // Validate password strength
    if (password.length < 6) {
      console.log('❌ Password too short');
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'Password must be at least 6 characters' }),
      };
    }

    // Validate plan
    if (!['monthly', 'yearly'].includes(plan)) {
      console.log('❌ Invalid plan:', plan);
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'Plan must be either "monthly" or "yearly"' }),
      };
    }

    console.log('🔍 Validating email address:', email);

    // CRITICAL: Check if email already exists (enforce uniqueness BEFORE payment)
    const { data: existingProfile, error: checkError } = await supabase
      .from('profiles')
      .select('email, id')
      .eq('email', email)
      .single();

    if (checkError && checkError.code !== 'PGRST116') { // PGRST116 = no rows returned
      console.error('❌ Database error checking email:', checkError);
      return {
        statusCode: 500,
        headers,
        body: JSON.stringify({ 
          error: 'Failed to validate email address',
          details: 'Database connection issue'
        }),
      };
    }

    if (existingProfile) {
      console.log('🚫 Email already exists in system:', email);
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ 
          error: 'This email is already linked to a paid FlexiCAD account. Please use the login form instead.',
          code: 'EMAIL_EXISTS'
        }),
      };
    }

    console.log('✅ Email is available, creating Stripe checkout session');

    // Define pricing based on plan
    const priceData = {
      monthly: {
        price: 1000, // $10.00 AUD in cents 
        interval: 'month',
        name: 'FlexiCAD Monthly Plan'
      },
      yearly: {
        price: 5000, // $50.00 AUD in cents (5 months free)
        interval: 'year',
        name: 'FlexiCAD Yearly Plan'
      }
    };

    const selectedPlan = priceData[plan];

    // Create Stripe checkout session (NO Supabase account created here!)
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      line_items: [
        {
          price_data: {
            currency: process.env.PAYMENT_CURRENCY || 'aud',
            product_data: {
              name: selectedPlan.name,
              description: `FlexiCAD Designer ${plan} subscription - AI-powered 3D design platform with unlimited access`,
            },
            unit_amount: selectedPlan.price,
            recurring: {
              interval: selectedPlan.interval,
            },
          },
          quantity: 1,
        },
      ],
      mode: 'subscription',
      customer_email: email,
      
      // CRITICAL: Store registration data in metadata for webhook processing
      metadata: {
        email: email,
        password: password, // Webhook will use this to create the Supabase account
        plan: plan,
        registration_flow: 'payment_first',
        created_at: new Date().toISOString()
      },
      
      // Success/Cancel URLs
      success_url: `${process.env.URL || 'http://localhost:8888'}/home.html?checkout=success&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${process.env.URL || 'http://localhost:8888'}/register.html?checkout=cancelled&plan=${plan}`,
      
      // Additional checkout configuration
      billing_address_collection: 'required',
      allow_promotion_codes: true,
      tax_id_collection: {
        enabled: true
      },
      
      // Set expiration (30 minutes)
      expires_at: Math.floor(Date.now() / 1000) + (30 * 60),
      
      // Custom checkout appearance
      custom_text: {
        submit: {
          message: 'Your FlexiCAD Designer account will be created automatically after successful payment'
        }
      }
    });

    console.log('✅ Stripe checkout session created successfully:', session.id);

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({ 
        sessionId: session.id,
        url: session.url,
        message: 'Checkout session created - redirecting to payment...',
        plan: plan,
        email: email // Safe to return email since it's going to same user
      }),
    };

  } catch (error) {
    console.error('❌ Checkout session creation failed:', error);
    
    // Handle Stripe-specific errors
    if (error.type && error.type.startsWith('Stripe')) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ 
          error: 'Payment processing error',
          details: error.message
        }),
      };
    }

    // Handle JSON parsing errors
    if (error instanceof SyntaxError) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ 
          error: 'Invalid request format',
          details: 'Request body must be valid JSON'
        }),
      };
    }

    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ 
        error: 'Failed to create checkout session',
        details: error.message
      }),
    };
  }
};