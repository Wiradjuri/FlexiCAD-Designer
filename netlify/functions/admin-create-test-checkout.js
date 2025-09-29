const { createClient } = require('@supabase/supabase-js');
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);

exports.handler = async (event, context) => {
    const headers = {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization',
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
    };

    if (event.httpMethod === 'OPTIONS') {
        return { statusCode: 200, headers, body: '' };
    }

    if (event.httpMethod !== 'POST') {
        return {
            statusCode: 405,
            headers,
            body: JSON.stringify({ error: 'Method not allowed' }),
        };
    }

    try {
        // Verify admin access
        const authHeader = event.headers.authorization || event.headers.Authorization;
        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            return {
                statusCode: 401,
                headers,
                body: JSON.stringify({ error: 'Authorization required' }),
            };
        }

        const token = authHeader.substring(7);
        const supabase = createClient(
            process.env.SUPABASE_URL,
            process.env.SUPABASE_SERVICE_ROLE_KEY
        );

        const { data: { user }, error: authError } = await supabase.auth.getUser(token);
        
        if (authError || !user || user.email !== 'bmuzza1992@gmail.com') {
            return {
                statusCode: 403,
                headers,
                body: JSON.stringify({ error: 'Admin access required' }),
            };
        }

        // Parse request body
        const body = JSON.parse(event.body || '{}');
        const testEmail = body.email || `admin+e2e-${Date.now()}@example.com`;
        
        // Ensure we're in test mode
        if (!process.env.STRIPE_SECRET_KEY?.startsWith('sk_test_')) {
            return {
                statusCode: 400,
                headers,
                body: JSON.stringify({ 
                    error: 'Live keys detected - switch to Test Mode to use admin tests',
                    mode: 'live'
                }),
            };
        }

        const stripePriceTest = process.env.STRIPE_PRICE_TEST;
        if (!stripePriceTest) {
            return {
                statusCode: 500,
                headers,
                body: JSON.stringify({ error: 'STRIPE_PRICE_TEST not configured' }),
            };
        }

        // Create idempotency key for this test
        const idempotencyKey = `admin-test-${user.id}-${Date.now()}`;

        // Create Stripe checkout session
        const session = await stripe.checkout.sessions.create({
            payment_method_types: ['card'],
            line_items: [{
                price: stripePriceTest,
                quantity: 1,
            }],
            mode: 'subscription',
            success_url: `${process.env.URL || 'http://localhost:8888'}/payment-success.html?session_id={CHECKOUT_SESSION_ID}`,
            cancel_url: `${process.env.URL || 'http://localhost:8888'}/payment.html`,
            customer_email: testEmail,
            metadata: {
                testEmail: testEmail,
                adminTest: 'true',
                createdBy: user.email
            }
        }, {
            idempotencyKey: idempotencyKey
        });

        console.log(`[admin-create-test-checkout] Created test checkout for ${testEmail}, session: ${session.id}`);

        return {
            statusCode: 200,
            headers,
            body: JSON.stringify({
                ok: true,
                url: session.url,
                testEmail: testEmail,
                sessionId: session.id
            }),
        };

    } catch (error) {
        console.error('[admin-create-test-checkout] Error:', error);
        return {
            statusCode: 500,
            headers,
            body: JSON.stringify({ 
                ok: false,
                error: error.message 
            }),
        };
    }
};