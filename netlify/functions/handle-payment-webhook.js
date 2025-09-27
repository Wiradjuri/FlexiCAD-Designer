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
      
      case 'customer.subscription.created':
        await handleSubscriptionCreated(stripeEvent.data.object);
        break;
      
      case 'customer.subscription.updated':
        await handleSubscriptionUpdated(stripeEvent.data.object);
        break;
      
      case 'customer.subscription.deleted':
        await handleSubscriptionDeleted(stripeEvent.data.object);
        break;
      
      default:
        console.log(`Unhandled event type: ${stripeEvent.type}`);
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
  console.log('🎉 Checkout completed for session:', session.id);
  
  const customerEmail = session.customer_email;
  const customerId = session.customer;
  const subscriptionId = session.subscription;
  
  // Determine plan from metadata or line items
  let plan = session.metadata?.plan || 'monthly';
  
  try {
    // Mark user as paid in Supabase
    const { error } = await supabase.rpc('mark_user_as_paid', {
      user_email: customerEmail,
      customer_id: customerId,
      subscription_id: subscriptionId,
      plan: plan
    });

    if (error) {
      throw error;
    }

    console.log('✅ User marked as paid:', customerEmail, 'Plan:', plan);
  } catch (error) {
    console.error('❌ Failed to mark user as paid:', error);
    throw error;
  }
}

async function handleSubscriptionCreated(subscription) {
  console.log('📅 Subscription created:', subscription.id);
  
  try {
    // Get customer details
    const customer = await stripe.customers.retrieve(subscription.customer);
    
    if (!customer.email) {
      throw new Error('Customer email not found');
    }

    // Determine plan from subscription
    const plan = subscription.items.data[0]?.price?.recurring?.interval === 'year' ? 'yearly' : 'monthly';

    // Update user payment status
    const { error } = await supabase.rpc('mark_user_as_paid', {
      user_email: customer.email,
      customer_id: subscription.customer,
      subscription_id: subscription.id,
      plan: plan
    });

    if (error) {
      throw error;
    }

    console.log('✅ Subscription processed:', customer.email, 'Plan:', plan);
  } catch (error) {
    console.error('❌ Failed to process subscription:', error);
    throw error;
  }
}

async function handleSubscriptionUpdated(subscription) {
  console.log('🔄 Subscription updated:', subscription.id);
  // Handle subscription changes if needed
}

async function handleSubscriptionDeleted(subscription) {
  console.log('❌ Subscription cancelled:', subscription.id);
  
  try {
    // Get customer details
    const customer = await stripe.customers.retrieve(subscription.customer);
    
    if (!customer.email) {
      throw new Error('Customer email not found');
    }

    // Mark user as unpaid
    const { error } = await supabase
      .from('profiles')
      .update({ 
        is_paid: false,
        subscription_plan: 'none',
        updated_at: new Date().toISOString()
      })
      .eq('email', customer.email);

    if (error) {
      throw error;
    }

    console.log('✅ User marked as unpaid due to subscription cancellation:', customer.email);
  } catch (error) {
    console.error('❌ Failed to process subscription cancellation:', error);
    throw error;
  }
}