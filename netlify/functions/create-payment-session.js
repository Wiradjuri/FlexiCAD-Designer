const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);

exports.handler = async (event, context) => {
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
    return {
      statusCode: 405,
      headers,
      body: JSON.stringify({ error: 'Method not allowed' }),
    };
  }

  try {
    // Log the incoming request for debugging
    console.log('Request body:', event.body);
    
    if (!event.body) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'Request body is empty' }),
      };
    }

    const { plan, email, userId } = JSON.parse(event.body);

    if (!plan || !email) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'Missing required parameters' }),
      };
    }

    // Define pricing based on plan
    const priceData = {
      monthly: {
        price: 1000, // $10.00 in cents
        interval: 'month',
        name: 'FlexiCAD Monthly Plan'
      },
      yearly: {
        price: 5000, // $50.00 in cents
        interval: 'year',
        name: 'FlexiCAD Yearly Plan'
      }
    };

    const planData = priceData[plan];
    if (!planData) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'Invalid plan selected' }),
      };
    }

    // Create a checkout session
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      line_items: [
        {
          price_data: {
            currency: 'usd',
            product_data: {
              name: planData.name,
              description: `FlexiCAD Designer ${plan} subscription`,
            },
            unit_amount: planData.price,
            recurring: {
              interval: planData.interval,
            },
          },
          quantity: 1,
        },
      ],
      mode: 'subscription',
      customer_email: email,
      metadata: {
        user_id: userId || '',
        plan: plan,
        email: email
      },
      success_url: `${process.env.URL || 'http://localhost:8888'}/home.html?checkout=success`,
      cancel_url: `${process.env.URL || 'http://localhost:8888'}/index.html?checkout=cancelled`,
      billing_address_collection: 'required',
      allow_promotion_codes: true,
    });

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({ 
        sessionId: session.id,
        url: session.url
      }),
    };

  } catch (error) {
    console.error('Payment session creation error:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ 
        error: 'Failed to create payment session',
        details: error.message
      }),
    };
  }
};