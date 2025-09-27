// netlify/functions/create-payment-intent.js
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY)

// CORS headers
const headers = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Content-Type': 'application/json'
}

exports.handler = async (event, context) => {
  // Handle CORS preflight
  if (event.httpMethod === 'OPTIONS') {
    return {
      statusCode: 200,
      headers,
      body: ''
    }
  }

  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      headers,
      body: JSON.stringify({ error: 'Method not allowed' })
    }
  }

  try {
    if (!process.env.STRIPE_SECRET_KEY) {
      return {
        statusCode: 500,
        headers,
        body: JSON.stringify({ error: 'Server misconfigured' })
      }
    }

    const body = JSON.parse(event.body || '{}')
    const { plan, email } = body

    // Validate plan
    if (!plan || !['monthly', 'yearly'].includes(plan)) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'Invalid plan. Must be "monthly" or "yearly"' })
      }
    }

    // Set amount based on plan (in cents for AUD)
    const amount = plan === 'yearly' ? 5000 : 1000 // $50 or $10 AUD

    // Create payment intent
    const paymentIntent = await stripe.paymentIntents.create({
      amount,
      currency: 'aud',
      automatic_payment_methods: {
        enabled: true
      },
      metadata: {
        plan,
        email: email || 'unknown'
      }
    })

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        client_secret: paymentIntent.client_secret
      })
    }
  } catch (error) {
    console.error('Payment intent creation failed:', error)
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({
        error: 'Failed to create payment intent',
        message: error.message
      })
    }
  }
}
