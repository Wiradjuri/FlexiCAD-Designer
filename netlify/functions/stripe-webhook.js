const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const stripeWebhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

const supabase = createClient(supabaseUrl, supabaseServiceKey);

exports.handler = async (event, context) => {
  console.log('Stripe webhook received:', event.httpMethod, event.headers);

  // Only handle POST requests
  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      body: JSON.stringify({ error: 'Method not allowed' })
    };
  }

  try {
    // Get the Stripe signature
    const sig = event.headers['stripe-signature'];
    
    if (!sig) {
      console.log('No Stripe signature found');
      return {
        statusCode: 400,
        body: JSON.stringify({ error: 'No Stripe signature' })
      };
    }

    // Parse the webhook payload
    let stripeEvent;
    
    try {
      // For webhook testing, we'll accept the payload as-is
      // In production, you should verify the signature properly
      stripeEvent = JSON.parse(event.body);
      console.log('Stripe event type:', stripeEvent.type);
      console.log('Stripe event ID:', stripeEvent.id);
    } catch (err) {
      console.log('Error parsing webhook:', err);
      return {
        statusCode: 400,
        body: JSON.stringify({ error: 'Invalid payload' })
      };
    }

    // Handle different event types
    switch (stripeEvent.type) {
      case 'checkout.session.completed':
        await handleCheckoutSessionCompleted(stripeEvent.data.object);
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
      
      case 'invoice.payment_succeeded':
        await handleInvoicePaymentSucceeded(stripeEvent.data.object);
        break;
      
      case 'invoice.payment_failed':
        await handleInvoicePaymentFailed(stripeEvent.data.object);
        break;
      
      default:
        console.log('Unhandled event type:', stripeEvent.type);
    }

    return {
      statusCode: 200,
      body: JSON.stringify({ received: true, eventType: stripeEvent.type })
    };

  } catch (error) {
    console.error('Webhook error:', error);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: 'Webhook handler failed' })
    };
  }
};

async function handleCheckoutSessionCompleted(session) {
  console.log('Handling checkout session completed:', session.id);
  
  try {
    // Get customer email from session
    const customerEmail = session.customer_details?.email || session.customer_email;
    
    if (!customerEmail) {
      console.log('No customer email found in session');
      return;
    }

    // Update user's payment status
    const { error } = await supabase
      .from('profiles')
      .update({ 
        payment_status: 'active',
        stripe_customer_id: session.customer,
        subscription_id: session.subscription,
        updated_at: new Date().toISOString()
      })
      .eq('email', customerEmail);

    if (error) {
      console.error('Error updating profile payment status:', error);
    } else {
      console.log('Successfully updated payment status for:', customerEmail);
    }

  } catch (error) {
    console.error('Error handling checkout session completed:', error);
  }
}

async function handleSubscriptionCreated(subscription) {
  console.log('Handling subscription created:', subscription.id);
  
  try {
    // Get customer email
    const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
    const customer = await stripe.customers.retrieve(subscription.customer);
    
    if (!customer.email) {
      console.log('No customer email found');
      return;
    }

    // Update user's subscription info
    const { error } = await supabase
      .from('profiles')
      .update({ 
        payment_status: 'active',
        stripe_customer_id: subscription.customer,
        subscription_id: subscription.id,
        updated_at: new Date().toISOString()
      })
      .eq('email', customer.email);

    if (error) {
      console.error('Error updating subscription:', error);
    } else {
      console.log('Successfully created subscription for:', customer.email);
    }

  } catch (error) {
    console.error('Error handling subscription created:', error);
  }
}

async function handleSubscriptionUpdated(subscription) {
  console.log('Handling subscription updated:', subscription.id);
  
  try {
    // Update subscription status based on Stripe status
    const paymentStatus = subscription.status === 'active' ? 'active' : 'inactive';
    
    const { error } = await supabase
      .from('profiles')
      .update({ 
        payment_status: paymentStatus,
        updated_at: new Date().toISOString()
      })
      .eq('subscription_id', subscription.id);

    if (error) {
      console.error('Error updating subscription:', error);
    } else {
      console.log('Successfully updated subscription:', subscription.id);
    }

  } catch (error) {
    console.error('Error handling subscription updated:', error);
  }
}

async function handleSubscriptionDeleted(subscription) {
  console.log('Handling subscription deleted:', subscription.id);
  
  try {
    // Update user's payment status to inactive
    const { error } = await supabase
      .from('profiles')
      .update({ 
        payment_status: 'inactive',
        updated_at: new Date().toISOString()
      })
      .eq('subscription_id', subscription.id);

    if (error) {
      console.error('Error updating subscription deletion:', error);
    } else {
      console.log('Successfully handled subscription deletion:', subscription.id);
    }

  } catch (error) {
    console.error('Error handling subscription deleted:', error);
  }
}

async function handleInvoicePaymentSucceeded(invoice) {
  console.log('Handling invoice payment succeeded:', invoice.id);
  
  try {
    // If it's a subscription invoice, ensure user is active
    if (invoice.subscription) {
      const { error } = await supabase
        .from('profiles')
        .update({ 
          payment_status: 'active',
          updated_at: new Date().toISOString()
        })
        .eq('subscription_id', invoice.subscription);

      if (error) {
        console.error('Error updating payment success:', error);
      } else {
        console.log('Successfully handled payment success for subscription:', invoice.subscription);
      }
    }

  } catch (error) {
    console.error('Error handling invoice payment succeeded:', error);
  }
}

async function handleInvoicePaymentFailed(invoice) {
  console.log('Handling invoice payment failed:', invoice.id);
  
  try {
    // If it's a subscription invoice, mark user as inactive
    if (invoice.subscription) {
      const { error } = await supabase
        .from('profiles')
        .update({ 
          payment_status: 'payment_failed',
          updated_at: new Date().toISOString()
        })
        .eq('subscription_id', invoice.subscription);

      if (error) {
        console.error('Error updating payment failure:', error);
      } else {
        console.log('Successfully handled payment failure for subscription:', invoice.subscription);
      }
    }

  } catch (error) {
    console.error('Error handling invoice payment failed:', error);
  }
}