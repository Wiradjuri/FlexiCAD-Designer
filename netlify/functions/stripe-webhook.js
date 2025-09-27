// netlify/functions/stripe-webhook.js
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
const { createClient } = require('@supabase/supabase-js');

// Use service role key for admin operations (can bypass RLS)
const supabaseAdmin = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

exports.handler = async (event, context) => {
  console.log('🎯 Webhook received:', event.httpMethod);

  const sig = event.headers['stripe-signature'];
  const endpointSecret = process.env.STRIPE_WEBHOOK_SECRET;

  let stripeEvent;

  try {
    // Verify webhook signature for security
    stripeEvent = stripe.webhooks.constructEvent(event.body, sig, endpointSecret);
    console.log('✅ Webhook signature verified for event:', stripeEvent.type);
  } catch (err) {
    console.error('❌ Webhook signature verification failed:', err.message);
    return {
      statusCode: 400,
      body: JSON.stringify({ error: `Webhook Error: ${err.message}` })
    };
  }

  // Handle the event
  try {
    switch (stripeEvent.type) {
      case 'checkout.session.completed':
        await handleCheckoutCompleted(stripeEvent.data.object);
        break;
        
      case 'customer.subscription.updated':
        await handleSubscriptionUpdated(stripeEvent.data.object);
        break;
        
      case 'customer.subscription.deleted':
        await handleSubscriptionDeleted(stripeEvent.data.object);
        break;
        
      case 'invoice.payment_succeeded':
        await handlePaymentSucceeded(stripeEvent.data.object);
        break;
        
      case 'invoice.payment_failed':
        await handlePaymentFailed(stripeEvent.data.object);
        break;
        
      default:
        console.log(`ℹ️ Unhandled event type: ${stripeEvent.type}`);
    }

    return {
      statusCode: 200,
      body: JSON.stringify({ received: true })
    };

  } catch (error) {
    console.error('❌ Webhook handler error:', error);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: 'Webhook handler failed' })
    };
  }
};

async function handleCheckoutCompleted(session) {
  console.log('🎯 Processing checkout completion:', session.id);

  try {
    const { email, password, plan } = session.metadata;

    if (!email || !password) {
      throw new Error('Missing email or password in session metadata');
    }

    console.log('📧 Creating account for:', email);

    // STEP 1: Check if user already exists (safety check)
    const { data: existingProfile } = await supabaseAdmin
      .from('profiles')
      .select('id, email')
      .eq('email', email.toLowerCase())
      .single();

    if (existingProfile) {
      console.log('⚠️ User already exists, updating payment status:', email);
      
      // Update existing profile to paid status
      const { error: updateError } = await supabaseAdmin
        .from('profiles')
        .update({
          is_paid: true,
          is_active: true,
          subscription_plan: plan,
          stripe_customer_id: session.customer,
          updated_at: new Date().toISOString()
        })
        .eq('email', email.toLowerCase());

      if (updateError) {
        throw new Error(`Profile update failed: ${updateError.message}`);
      }

      console.log('✅ Existing profile updated to paid status');
      return;
    }

    // STEP 2: Create Supabase user account (ONLY after payment success)
    const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
      email: email,
      password: password,
      email_confirm: true, // Auto-confirm email since payment was successful
      user_metadata: {
        subscription_plan: plan,
        created_via: 'stripe_checkout',
        stripe_customer_id: session.customer
      }
    });

    if (authError) {
      console.error('❌ Failed to create Supabase user:', authError);
      throw new Error(`User creation failed: ${authError.message}`);
    }

    console.log('✅ Supabase user created:', authData.user.id);

    // STEP 3: Create profile record with payment information
    const { error: profileError } = await supabaseAdmin
      .from('profiles')
      .insert({
        id: authData.user.id,
        email: email.toLowerCase(),
        is_paid: true,
        is_active: true,
        subscription_plan: plan,
        stripe_customer_id: session.customer,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      });

    if (profileError) {
      console.error('❌ Failed to create profile:', profileError);
      
      // Try to clean up the created user if profile creation fails
      try {
        await supabaseAdmin.auth.admin.deleteUser(authData.user.id);
        console.log('🧹 Cleaned up user after profile creation failure');
      } catch (cleanupError) {
        console.error('❌ Failed to cleanup user:', cleanupError);
      }
      
      throw new Error(`Profile creation failed: ${profileError.message}`);
    }

    console.log('✅ Profile created for user:', authData.user.id);
    console.log('🎉 Account creation complete - user can now log in with:', email);

    // Optional: Send welcome email or notification here
    // await sendWelcomeEmail(email, plan);

  } catch (error) {
    console.error('❌ Checkout completion handler failed:', error);
    
    // In production, you might want to:
    // 1. Send an alert to administrators
    // 2. Log to external monitoring service
    // 3. Queue for retry with exponential backoff
    
    throw error;
  }
}

async function handleSubscriptionUpdated(subscription) {
  console.log('🔄 Processing subscription update:', subscription.id);

  try {
    const customerId = subscription.customer;
    const isActive = subscription.status === 'active';
    const planInterval = subscription.items.data[0]?.price?.recurring?.interval;

    console.log('📊 Subscription status:', {
      customer: customerId,
      status: subscription.status,
      interval: planInterval
    });

    // Update profile status based on subscription
    const { error } = await supabaseAdmin
      .from('profiles')
      .update({ 
        is_active: isActive,
        is_paid: isActive,
        subscription_plan: planInterval || 'monthly',
        updated_at: new Date().toISOString()
      })
      .eq('stripe_customer_id', customerId);

    if (error) {
      console.error('❌ Failed to update subscription status:', error);
    } else {
      console.log('✅ Subscription status updated for customer:', customerId);
    }

  } catch (error) {
    console.error('❌ Subscription update handler failed:', error);
  }
}

async function handleSubscriptionDeleted(subscription) {
  console.log('🗑️ Processing subscription deletion:', subscription.id);

  try {
    const customerId = subscription.customer;

    // Deactivate user account but keep profile for potential reactivation
    const { error } = await supabaseAdmin
      .from('profiles')
      .update({ 
        is_active: false,
        is_paid: false,
        updated_at: new Date().toISOString()
      })
      .eq('stripe_customer_id', customerId);

    if (error) {
      console.error('❌ Failed to deactivate account:', error);
    } else {
      console.log('✅ Account deactivated due to subscription cancellation:', customerId);
    }

  } catch (error) {
    console.error('❌ Subscription deletion handler failed:', error);
  }
}

async function handlePaymentSucceeded(invoice) {
  console.log('💰 Processing successful payment:', invoice.id);

  try {
    const customerId = invoice.customer;

    // Ensure account is active after successful payment
    const { error } = await supabaseAdmin
      .from('profiles')
      .update({ 
        is_active: true,
        is_paid: true,
        updated_at: new Date().toISOString()
      })
      .eq('stripe_customer_id', customerId);

    if (error) {
      console.error('❌ Failed to activate account after payment:', error);
    } else {
      console.log('✅ Account activated after successful payment:', customerId);
    }

  } catch (error) {
    console.error('❌ Payment success handler failed:', error);
  }
}

async function handlePaymentFailed(invoice) {
  console.log('💳 Processing failed payment:', invoice.id);

  try {
    const customerId = invoice.customer;

    // Optionally deactivate account after failed payment
    // You might want to give users a grace period before deactivating
    console.log('⚠️ Payment failed for customer:', customerId);
    
    // For now, just log. You might implement grace period logic here
    // const { error } = await supabaseAdmin
    //   .from('profiles')
    //   .update({ 
    //     is_active: false,
    //     updated_at: new Date().toISOString()
    //   })
    //   .eq('stripe_customer_id', customerId);

  } catch (error) {
    console.error('❌ Payment failure handler failed:', error);
  }
}

// Optional: Welcome email function
async function sendWelcomeEmail(email, plan) {
  try {
    // Implement your email service here (SendGrid, Mailgun, etc.)
    console.log('📧 Would send welcome email to:', email, 'for plan:', plan);
  } catch (error) {
    console.error('❌ Welcome email failed:', error);
  }
}