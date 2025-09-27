// netlify/functions/handle-payment-success.js
const { createClient } = require('@supabase/supabase-js');
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);

const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
);

exports.handler = async (event, context) => {
    console.log('Handling payment success...');
    
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
        const { sessionId, userId, tempPassword } = JSON.parse(event.body);

        if (!sessionId) {
            throw new Error('Session ID is required');
        }

        console.log('Processing payment success for session:', sessionId);

        // Retrieve the checkout session from Stripe
        const session = await stripe.checkout.sessions.retrieve(sessionId);
        
        if (session.payment_status !== 'paid') {
            throw new Error('Payment not completed');
        }

        const email = session.customer_email || session.metadata.user_email;
        const plan = session.metadata.plan || 'monthly';
        const stripeCustomerId = session.customer;

        if (!email) {
            throw new Error('Email not found in session');
        }

        console.log('Payment verified for:', email, 'Plan:', plan);

        // Create user in Supabase auth (now that payment is confirmed)
        const { data: authData, error: authError } = await supabase.auth.admin.createUser({
            email: email,
            password: tempPassword,
            email_confirm: true,
            user_metadata: {
                full_name: email.split('@')[0]
            }
        });

        if (authError) {
            console.error('❌ Error creating user:', authError);
            throw new Error(`Failed to create user: ${authError.message}`);
        }

        console.log('✅ User created in auth:', authData.user.id);

        // Create profile with payment information
        const { error: profileError } = await supabase.rpc('create_paid_profile', {
            user_id: authData.user.id,
            user_email: email,
            user_name: email.split('@')[0],
            plan: plan,
            customer_id: stripeCustomerId
        });

        if (profileError) {
            console.error('❌ Error creating profile:', profileError);
            // Clean up - delete auth user if profile creation failed
            await supabase.auth.admin.deleteUser(authData.user.id);
            throw new Error(`Failed to create profile: ${profileError.message}`);
        }

        console.log('✅ Profile created successfully');

        return {
            statusCode: 200,
            headers: {
                'Access-Control-Allow-Origin': '*',
                'Access-Control-Allow-Headers': 'Content-Type',
                'Access-Control-Allow-Methods': 'POST'
            },
            body: JSON.stringify({
                success: true,
                userId: authData.user.id,
                email: email,
                plan: plan
            })
        };

    } catch (error) {
        console.error('❌ Error handling payment success:', error);
        return {
            statusCode: 500,
            headers: {
                'Access-Control-Allow-Origin': '*',
                'Access-Control-Allow-Headers': 'Content-Type',
                'Access-Control-Allow-Methods': 'POST'
            },
            body: JSON.stringify({
                error: error.message || 'Failed to process payment success'
            })
        };
    }
};