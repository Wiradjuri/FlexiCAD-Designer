// netlify/functions/create-checkout-session.js
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_ANON_KEY
);

exports.handler = async (event, context) => {
  console.log('🎯 Checkout session creation started');

  // Enable CORS
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Content-Type': 'application/json'
  };

  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers, body: '' };
  }

  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      headers,
      body: JSON.stringify({ error: 'Method not allowed' })
    };
  }

  try {
    const { email, password, plan } = JSON.parse(event.body);

    // Validate input
    if (!email || !password || !plan) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'Missing required fields: email, password, plan' })
      };
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'Invalid email format' })
      };
    }

    // Validate password strength
    if (password.length < 6) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'Password must be at least 6 characters long' })
      };
    }

    console.log('✅ Input validation passed for:', email);

    // Check if user already exists in profiles table (payment-first enforcement)
    const { data: existingProfile, error: profileError } = await supabase
      .from('profiles')
      .select('email, is_paid, is_active')
      .eq('email', email.toLowerCase())
      .single();

    if (existingProfile) {
      if (existingProfile.is_paid && existingProfile.is_active) {
        console.log('❌ Email already exists with active account:', email);
        return {
          statusCode: 400,
          headers,
          body: JSON.stringify({ 
            error: 'This email is already linked to a paid FlexiCAD account',
            code: 'EMAIL_EXISTS'
          })
        };
      } else {
        console.log('❌ Email exists but inactive:', email);
        return {
          statusCode: 400,
          headers,
          body: JSON.stringify({ 
            error: 'This email is registered but requires payment activation. Please contact support.',
            code: 'EMAIL_INACTIVE'
          })
        };
      }
    }

    console.log('✅ Email availability confirmed for:', email);

    // Define pricing plans
    const pricing = {
      monthly: {
        price: 1000, // $10.00 in cents
        currency: 'usd',
        interval: 'month',
        display_name: 'Monthly Plan'
      },
      yearly: {
        price: 5000, // $50.00 in cents
        currency: 'usd', 
        interval: 'year',
        display_name: 'Yearly Plan'
      }
    };

    if (!pricing[plan]) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'Invalid plan selected. Choose monthly or yearly.' })
      };
    }

    const selectedPlan = pricing[plan];
    console.log('✅ Plan selected:', plan, selectedPlan);

    // Create Stripe checkout session
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      line_items: [
        {
          price_data: {
            currency: selectedPlan.currency,
            product_data: {
              name: 'FlexiCAD Designer',
              description: `${selectedPlan.display_name} - AI-powered 3D design tool`,
              images: ['https://your-domain.com/logo.png'], // Optional: Add your logo
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
      metadata: {
        email: email,
        password: password, // Store temporarily for webhook (encrypted in transit)
        plan: plan,
        type: 'flexicad_subscription',
        timestamp: new Date().toISOString()
      },
      subscription_data: {
        metadata: {
          email: email,
          plan: plan,
          type: 'flexicad_subscription'
        }
      },
      success_url: `${process.env.URL || 'http://localhost:8888'}/payment-success.html?checkout=success&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${process.env.URL || 'http://localhost:8888'}/index.html?checkout=cancelled`,
      allow_promotion_codes: true,
      billing_address_collection: 'auto',
      tax_id_collection: {
        enabled: true
      }
    });

    console.log('✅ Checkout session created:', session.id);

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        sessionId: session.id,
        url: session.url,
        message: 'Checkout session created successfully. Redirecting to payment...'
      })
    };

  } catch (error) {
    console.error('❌ Checkout session creation failed:', error);
    
    // Handle specific Stripe errors
    let errorMessage = 'Failed to create checkout session';
    if (error.type === 'StripeCardError') {
      errorMessage = 'Card error: ' + error.message;
    } else if (error.type === 'StripeRateLimitError') {
      errorMessage = 'Too many requests. Please try again later.';
    } else if (error.type === 'StripeInvalidRequestError') {
      errorMessage = 'Invalid request: ' + error.message;
    } else if (error.type === 'StripeAPIError') {
      errorMessage = 'Payment service temporarily unavailable. Please try again.';
    } else if (error.type === 'StripeConnectionError') {
      errorMessage = 'Network error. Please check your connection and try again.';
    } else if (error.type === 'StripeAuthenticationError') {
      errorMessage = 'Payment service configuration error. Please contact support.';
    }
    
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ 
        error: errorMessage,
        details: process.env.NODE_ENV === 'development' ? error.message : undefined
      })
    };
  }
};