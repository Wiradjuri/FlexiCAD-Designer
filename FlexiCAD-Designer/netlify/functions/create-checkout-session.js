// netlify/functions/create-checkout-session.js
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);

/** Simple CORS helper */
function corsify(body, statusCode = 200) {
  return {
    statusCode,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Headers': 'Content-Type',
      'Access-Control-Allow-Methods': 'POST, OPTIONS'
    },
    body: JSON.stringify(body)
  };
}

exports.handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') return corsify({ ok: true });
  if (event.httpMethod !== 'POST') return corsify({ error: 'Method not allowed' }, 405);

  try {
    const { priceId, customer_email, successUrl, cancelUrl } = JSON.parse(event.body || '{}');
    if (!priceId || !successUrl || !cancelUrl) throw new Error('Missing params');
    const session = await stripe.checkout.sessions.create({
      mode: 'subscription',
      payment_method_types: ['card'],
      line_items: [{ price: priceId, quantity: 1 }],
      success_url: successUrl,
      cancel_url: cancelUrl,
      customer_email
    });
    return corsify({ url: session.url });
  } catch (err) {
    return corsify({ error: err.message }, 400);
  }
};
