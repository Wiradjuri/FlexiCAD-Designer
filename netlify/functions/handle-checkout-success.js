const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
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
    'Access-Control-Allow-Headers': 'Content-Type, Authorization, Stripe-Signature',
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
    return {
      statusCode: 405,
      headers,
      body: JSON.stringify({ error: 'Method not allowed' }),
    };
  }

  const sig = event.headers['stripe-signature'];
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

  let stripeEvent;

  try {
    // Verify the webhook signature
    stripeEvent = stripe.webhooks.constructEvent(event.body, sig, webhookSecret);
    console.log('✅ Webhook signature verified:', stripeEvent.type);
  } catch (err) {
    console.error('❌ Webhook signature verification failed:', err.message);
    return {
      statusCode: 400,
      headers,
      body: JSON.stringify({ error: 'Webhook signature verification failed' }),
    };
  }

  try {
    // Handle the event
    switch (stripeEvent.type) {
      case 'checkout.session.completed':
        await handleCheckoutCompleted(stripeEvent.data.object);
        break;
      
      case 'customer.subscription.deleted':
        await handleSubscriptionCancelled(stripeEvent.data.object);
        break;
      
      default:
        console.log(`ℹ️ Unhandled event type: ${stripeEvent.type}`);
    }

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({ received: true }),
    };

  } catch (error) {
    console.error('❌ Webhook handler error:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ 
        error: 'Webhook handler failed',
        details: error.message 
      }),
    };
  }
};

async function handleCheckoutCompleted(session) {
  console.log('🎉 Processing checkout completion for session:', session.id);
  
  const { email, password, plan } = session.metadata;
  const customerId = session.customer;
  const subscriptionId = session.subscription;
  
  if (!email || !password || !plan) {
    console.error('❌ Missing required metadata in checkout session');
    throw new Error('Missing registration data in checkout session');
  }

  console.log('📝 Creating Supabase user for:', email);

  try {
    // Step 1: Create auth user using admin API
    const { data: authUser, error: authError } = await supabase.auth.admin.createUser({
      email: email,
      password: password,
      email_confirm: true, // Auto-confirm email since payment succeeded
      user_metadata: {
        subscription_plan: plan,
        stripe_customer_id: customerId,
        created_via: 'payment_first'
      }
    });

    if (authError) {
      console.error('❌ Failed to create auth user:', authError);
      
      // If user already exists, this is a problem - should not happen with our email check
      if (authError.message.includes('already registered') || authError.message.includes('already been registered')) {
        console.error('🚫 Duplicate registration attempt for:', email);
        // TODO: Consider refunding the payment here
        throw new Error(`Email ${email} is already registered. Payment may need refund.`);
      }
      
      throw authError;
    }

    console.log('✅ Auth user created:', authUser.user.id);

    // Step 2: Create profile record with payment info
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .insert([{
        id: authUser.user.id,
        email: email,
        is_paid: true,
        stripe_customer_id: customerId,
        stripe_subscription_id: subscriptionId,
        subscription_plan: plan,
        payment_date: new Date().toISOString(),
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      }])
      .select()
      .single();

    if (profileError) {
      console.error('❌ Failed to create profile:', profileError);
      
      // If profile creation fails, we should clean up the auth user
      console.log('🧹 Cleaning up auth user due to profile creation failure');
      await supabase.auth.admin.deleteUser(authUser.user.id);
      
      throw profileError;
    }

    console.log('✅ Profile created successfully');
    console.log('🎊 User registration completed successfully:', {
      userId: authUser.user.id,
      email: email,
      plan: plan,
      customerId: customerId
    });

    // Log successful registration for analytics
    console.log(`📊 REGISTRATION_SUCCESS: ${email} | ${plan} | ${customerId}`);

  } catch (error) {
    console.error('❌ Failed to process checkout completion:', error);
    
    // Log the error for manual investigation
    console.error(`🚨 REGISTRATION_FAILED: ${email} | ${plan} | ${customerId} | ${error.message}`);
    
    // Re-throw to return error status to Stripe
    throw error;
  }
}

async function handleSubscriptionCancelled(subscription) {
  console.log('🚫 Processing subscription cancellation:', subscription.id);
  
  try {
    // Get customer details
    const customer = await stripe.customers.retrieve(subscription.customer);
    
    if (!customer.email) {
      throw new Error('Customer email not found');
    }

    console.log('🔄 Marking user as unpaid due to cancellation:', customer.email);

    // Mark user as unpaid (but keep the account)
    const { error } = await supabase
      .from('profiles')
      .update({ 
        is_paid: false,
        updated_at: new Date().toISOString()
      })
      .eq('email', customer.email);

    if (error) {
      throw error;
    }

    console.log('✅ User access revoked due to subscription cancellation:', customer.email);
    
    // Log cancellation for analytics
    console.log(`📊 SUBSCRIPTION_CANCELLED: ${customer.email} | ${subscription.id}`);

  } catch (error) {
    console.error('❌ Failed to process subscription cancellation:', error);
    throw error;
  }
}