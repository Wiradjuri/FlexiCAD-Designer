// netlify/functions/check-payment-status.js
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
);

exports.handler = async (event, context) => {
    console.log('Checking payment status...');
    
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
        const { userId } = JSON.parse(event.body);

        if (!userId) {
            throw new Error('User ID is required');
        }

        console.log('Checking payment status for user:', userId);

        // Query profile to check payment status
        const { data: profile, error } = await supabase
            .from('profiles')
            .select('is_paid, subscription_plan, is_active, stripe_customer_id, created_at')
            .eq('id', userId)
            .single();

        if (error && error.code !== 'PGRST116') {
            console.error('❌ Database error:', error);
            throw new Error(`Database query failed: ${error.message}`);
        }

        if (!profile) {
            // User not in database - needs to register and pay
            console.log('❌ User not found in database');
            return {
                statusCode: 200,
                headers: {
                    'Access-Control-Allow-Origin': '*',
                    'Access-Control-Allow-Headers': 'Content-Type',
                    'Access-Control-Allow-Methods': 'POST'
                },
                body: JSON.stringify({
                    hasPaid: false,
                    needsRegistration: true,
                    message: 'User needs to register and make payment'
                })
            };
        }

        // User exists, check payment status
        const hasPaid = profile.is_paid && profile.is_active;
        
        console.log(hasPaid ? '✅ User has valid payment' : '❌ User payment invalid');

        return {
            statusCode: 200,
            headers: {
                'Access-Control-Allow-Origin': '*',
                'Access-Control-Allow-Headers': 'Content-Type',
                'Access-Control-Allow-Methods': 'POST'
            },
            body: JSON.stringify({
                hasPaid: hasPaid,
                needsRegistration: false,
                paymentStatus: {
                    is_paid: profile.is_paid,
                    subscription_plan: profile.subscription_plan,
                    is_active: profile.is_active,
                    stripe_customer_id: profile.stripe_customer_id,
                    created_at: profile.created_at
                }
            })
        };

    } catch (error) {
        console.error('❌ Error checking payment status:', error);
        return {
            statusCode: 500,
            headers: {
                'Access-Control-Allow-Origin': '*',
                'Access-Control-Allow-Headers': 'Content-Type',
                'Access-Control-Allow-Methods': 'POST'
            },
            body: JSON.stringify({
                error: error.message || 'Failed to check payment status'
            })
        };
    }
};