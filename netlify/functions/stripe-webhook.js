const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
const { createClient } = require('@supabase/supabase-js');

// Initialize Supabase client with service role key for admin operations
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

exports.handler = async (event, context) => {
  console.log('🔔 Stripe webhook received');

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
    console.log('❌ Method not allowed:', event.httpMethod);
    return {
      statusCode: 405,
      headers,
      body: JSON.stringify({ error: 'Method not allowed' }),
    };
  }

  // Verify webhook signature
  const sig = event.headers['stripe-signature'];
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

  if (!webhookSecret) {
    console.error('❌ STRIPE_WEBHOOK_SECRET not configured');
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: 'Webhook secret not configured' }),
    };
  }

  let stripeEvent;

  try {
    // Verify the webhook signature
    stripeEvent = stripe.webhooks.constructEvent(event.body, sig, webhookSecret);
    console.log('✅ Webhook signature verified for event:', stripeEvent.type);
  } catch (err) {
    console.error('❌ Webhook signature verification failed:', err.message);
    return {
      statusCode: 400,
      headers,
      body: JSON.stringify({ 
        error: 'Webhook signature verification failed',
        details: err.message 
      }),
    };
  }

  try {
    // Handle different Stripe events
    switch (stripeEvent.type) {
      case 'checkout.session.completed':
        console.log('🎉 Processing checkout.session.completed');
        await handleCheckoutSessionCompleted(stripeEvent.data.object);
        break;
      
      case 'customer.subscription.deleted':
        console.log('🚫 Processing subscription cancellation');
        await handleSubscriptionCancelled(stripeEvent.data.object);
        break;
      
      case 'invoice.payment_failed':
        console.log('💳 Processing payment failure');
        await handlePaymentFailed(stripeEvent.data.object);
        break;
      
      default:
        console.log(`ℹ️ Unhandled event type: ${stripeEvent.type}`);
    }

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({ 
        received: true,
        event_type: stripeEvent.type,
        timestamp: new Date().toISOString()
      }),
    };

  } catch (error) {
    console.error('❌ Webhook handler error:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ 
        error: 'Webhook handler failed',
        details: error.message,
        event_type: stripeEvent.type 
      }),
    };
  }
};

/**
 * Handle successful checkout completion
 * This is where we create the Supabase account AFTER payment succeeds
 */
async function handleCheckoutSessionCompleted(session) {
  console.log('💳 Processing successful checkout for session:', session.id);
  
  const { email, password, plan } = session.metadata;
  const customerId = session.customer;
  const subscriptionId = session.subscription;
  
  // Validate required metadata
  if (!email || !password || !plan) {
    console.error('❌ Missing required metadata in checkout session:', session.metadata);
    throw new Error('Missing registration data in checkout session metadata');
  }

  console.log('👤 Creating Supabase account for:', { email, plan });

  try {
    // Step 1: Check if account already exists (email uniqueness)
    console.log('🔍 Checking if email already exists:', email);
    
    const { data: existingProfile, error: checkError } = await supabase
      .from('profiles')
      .select('email, id')
      .eq('email', email)
      .single();

    if (checkError && checkError.code !== 'PGRST116') { // PGRST116 = no rows returned
      console.error('❌ Error checking existing email:', checkError);
      throw new Error(`Database error checking email: ${checkError.message}`);
    }

    if (existingProfile) {
      console.error('🚫 Email already exists in system:', email);
      throw new Error(`Account already exists for email: ${email}. Duplicate payment detected.`);
    }

    // Step 2: Create Supabase auth user using Admin API
    console.log('🏗️ Creating auth user via Admin API');
    
    const { data: authUser, error: authError } = await supabase.auth.admin.createUser({
      email: email,
      password: password,
      email_confirm: true, // Auto-confirm since payment succeeded
      user_metadata: {
        subscription_plan: plan,
        stripe_customer_id: customerId,
        created_via: 'stripe_webhook',
        payment_date: new Date().toISOString()
      }
    });

    if (authError) {
      console.error('❌ Failed to create auth user:', authError);
      
      // Handle duplicate user creation attempts
      if (authError.message.includes('already registered') || 
          authError.message.includes('already been registered')) {
        console.error('🚨 Duplicate user registration attempt for:', email);
        throw new Error(`User already exists: ${email}`);
      }
      
      throw new Error(`Auth user creation failed: ${authError.message}`);
    }

    console.log('✅ Auth user created successfully:', authUser.user.id);

    // Step 3: Create profile record with payment information
    console.log('📝 Creating profile record');
    
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .insert([{
        id: authUser.user.id,
        email: email,
        is_paid: true, // Mark as paid since payment succeeded
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
      
      // CRITICAL: If profile creation fails, clean up the auth user
      console.log('🧹 Cleaning up auth user due to profile creation failure');
      try {
        await supabase.auth.admin.deleteUser(authUser.user.id);
        console.log('✅ Auth user cleanup completed');
      } catch (cleanupError) {
        console.error('❌ Failed to clean up auth user:', cleanupError);
      }
      
      throw new Error(`Profile creation failed: ${profileError.message}`);
    }

    console.log('✅ Profile created successfully');
    
    // Log successful registration for analytics/monitoring
    console.log('🎊 REGISTRATION COMPLETED:', {
      userId: authUser.user.id,
      email: email,
      plan: plan,
      customerId: customerId,
      subscriptionId: subscriptionId,
      timestamp: new Date().toISOString()
    });

    // Success metrics logging
    console.log(`📊 METRICS: REGISTRATION_SUCCESS | ${email} | ${plan} | ${customerId}`);

  } catch (error) {
    console.error('❌ Checkout completion processing failed:', error);
    
    // Log error for monitoring/alerts
    console.error(`🚨 METRICS: REGISTRATION_FAILED | ${email} | ${plan} | ${customerId} | ${error.message}`);
    
    // Re-throw to return error status to Stripe (will retry webhook)
    throw error;
  }
}

/**
 * Handle subscription cancellation
 */
async function handleSubscriptionCancelled(subscription) {
  console.log('🚫 Processing subscription cancellation:', subscription.id);
  
  try {
    // Get customer details from Stripe
    const customer = await stripe.customers.retrieve(subscription.customer);
    
    if (!customer.email) {
      throw new Error('Customer email not found for subscription cancellation');
    }

    console.log('📧 Marking user as unpaid due to cancellation:', customer.email);

    // Mark user as unpaid (but keep account for reactivation)
    const { error: updateError } = await supabase
      .from('profiles')
      .update({ 
        is_paid: false,
        subscription_cancelled_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .eq('stripe_customer_id', customer.id);

    if (updateError) {
      console.error('❌ Failed to update user payment status:', updateError);
      throw new Error(`Failed to revoke access: ${updateError.message}`);
    }

    console.log('✅ User access revoked due to subscription cancellation:', customer.email);
    
    // Log cancellation for analytics
    console.log(`📊 METRICS: SUBSCRIPTION_CANCELLED | ${customer.email} | ${subscription.id}`);

  } catch (error) {
    console.error('❌ Subscription cancellation processing failed:', error);
    throw error;
  }
}

/**
 * Handle payment failures
 */
async function handlePaymentFailed(invoice) {
  console.log('💳 Processing payment failure for invoice:', invoice.id);
  
  try {
    const customerId = invoice.customer;
    const customer = await stripe.customers.retrieve(customerId);
    
    if (!customer.email) {
      throw new Error('Customer email not found for payment failure');
    }

    console.log('⚠️ Payment failed for user:', customer.email);
    
    // Log payment failure (don't immediately revoke access - give retry opportunities)
    console.log(`📊 METRICS: PAYMENT_FAILED | ${customer.email} | ${invoice.id}`);

    // You might want to send notification emails or implement retry logic here
    
  } catch (error) {
    console.error('❌ Payment failure processing failed:', error);
    // Don't throw error for payment failures - just log them
  }
}