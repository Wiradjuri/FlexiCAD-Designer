// netlify/functions/fix-user-payment.js
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
);

exports.handler = async (event, context) => {
    // Add CORS headers
    const headers = {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization',
        'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
    };

    // Handle preflight requests
    if (event.httpMethod === 'OPTIONS') {
        return { statusCode: 200, headers, body: '' };
    }

    try {
        const { email } = JSON.parse(event.body || '{}');
        
        if (!email) {
            return {
                statusCode: 400,
                headers,
                body: JSON.stringify({ error: 'Email is required' })
            };
        }

        console.log('Fixing payment status for user:', email);

        // First, try to find user in profiles table by email
        const { data: existingProfile, error: profileError } = await supabase
            .from('profiles')
            .select('*')
            .eq('email', email)
            .single();

        if (existingProfile) {
            console.log('Found existing profile, updating payment status...');
            
            // Update existing profile
            const { data, error } = await supabase
                .from('profiles')
                .update({
                    is_paid: true,
                    is_active: true,
                    subscription_plan: 'monthly',
                    stripe_customer_id: 'manual_fix_' + Date.now(),
                    payment_date: new Date().toISOString(),
                    updated_at: new Date().toISOString()
                })
                .eq('email', email)
                .select();

            if (error) {
                throw new Error(`Database update error: ${error.message}`);
            }

            console.log('✅ Payment status fixed for existing user:', email);

            return {
                statusCode: 200,
                headers,
                body: JSON.stringify({
                    success: true,
                    message: 'Payment status fixed successfully',
                    action: 'updated',
                    profile: data[0]
                })
            };
        }

        // If no profile exists, get user from auth and create profile
        const { data: { users }, error: authError } = await supabase.auth.admin.listUsers();
        
        if (authError) {
            throw new Error(`Auth error: ${authError.message}`);
        }

        const user = users.find(u => u.email === email);
        
        if (!user) {
            return {
                statusCode: 404,
                headers,
                body: JSON.stringify({ error: 'User not found in auth system or database' })
            };
        }

        // Create new profile
        const { data, error } = await supabase
            .from('profiles')
            .insert({
                id: user.id,
                email: user.email,
                is_paid: true,
                is_active: true,
                subscription_plan: 'monthly',
                stripe_customer_id: 'manual_fix_' + Date.now(),
                payment_date: new Date().toISOString(),
                created_at: new Date().toISOString(),
                updated_at: new Date().toISOString()
            })
            .select();

        if (error) {
            throw new Error(`Database insert error: ${error.message}`);
        }

        console.log('✅ Payment status fixed for new profile:', email);

        return {
            statusCode: 200,
            headers,
            body: JSON.stringify({
                success: true,
                message: 'Payment status fixed successfully',
                action: 'created',
                user_id: user.id,
                profile: data[0]
            })
        };

    } catch (error) {
        console.error('❌ Error fixing payment status:', error);
        
        return {
            statusCode: 500,
            headers,
            body: JSON.stringify({
                error: 'Failed to fix payment status',
                details: error.message
            })
        };
    }
};