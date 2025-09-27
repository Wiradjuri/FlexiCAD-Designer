// netlify/functions/create-checkout-session.js
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);

exports.handler = async (event, context) => {
    console.log('Creating checkout session...');
    
    if (event.httpMethod !== 'POST') {
        return {
            statusCode: 405,
            headers: {
                'Access-Control-Allow-Origin': '*',
                'Access-Control-Allow-Headers': 'Content-Type',
                'Access-Control-Allow-Methods': 'POST'
            },
            body: JSON.stringify({ error: 'Method not allowed' })
        };
    }

    try {
        const { email, plan = 'monthly', userId } = JSON.parse(event.body);

        if (!email) {
            throw new Error('Email is required');
        }

        console.log('Creating checkout session for:', email, 'Plan:', plan);

        // Price configuration
        const prices = {
            monthly: process.env.STRIPE_MONTHLY_PRICE_ID || 'price_monthly_default',
            yearly: process.env.STRIPE_YEARLY_PRICE_ID || 'price_yearly_default'
        };

        const priceId = prices[plan];
        if (!priceId) {
            throw new Error('Invalid plan selected');
        }

        // Create checkout session
        const session = await stripe.checkout.sessions.create({
            payment_method_types: ['card'],
            line_items: [
                {
                    price: priceId,
                    quantity: 1,
                },
            ],
            mode: 'subscription',
            customer_email: email,
            success_url: `${process.env.URL || 'http://localhost:8888'}/payment-success.html?session_id={CHECKOUT_SESSION_ID}&user_id=${userId || ''}`,
            cancel_url: `${process.env.URL || 'http://localhost:8888'}/register.html?payment=cancelled`,
            metadata: {
                user_email: email,
                user_id: userId || '',
                plan: plan
            }
        });

        console.log('✅ Checkout session created:', session.id);

        return {
            statusCode: 200,
            headers: {
                'Access-Control-Allow-Origin': '*',
                'Access-Control-Allow-Headers': 'Content-Type',
                'Access-Control-Allow-Methods': 'POST'
            },
            body: JSON.stringify({
                sessionId: session.id,
                url: session.url
            })
        };

    } catch (error) {
        console.error('❌ Error creating checkout session:', error);
        return {
            statusCode: 500,
            headers: {
                'Access-Control-Allow-Origin': '*',
                'Access-Control-Allow-Headers': 'Content-Type',
                'Access-Control-Allow-Methods': 'POST'
            },
            body: JSON.stringify({
                error: error.message || 'Failed to create checkout session'
            })
        };
    }
};