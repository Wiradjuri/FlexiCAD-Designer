// netlify/functions/create-profile-on-login.js
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
);

exports.handler = async (event, context) => {
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
        const { userId, email } = JSON.parse(event.body);

        if (!userId || !email) {
            throw new Error('User ID and email are required');
        }

        console.log('Creating profile for user:', userId, email);

        // Check if profile already exists
        const { data: existingProfile, error: checkError } = await supabase
            .from('profiles')
            .select('id')
            .eq('id', userId)
            .single();

        if (existingProfile) {
            return {
                statusCode: 200,
                headers: {
                    'Access-Control-Allow-Origin': '*',
                    'Access-Control-Allow-Headers': 'Content-Type'
                },
                body: JSON.stringify({
                    success: true,
                    message: 'Profile already exists',
                    profileExists: true
                })
            };
        }

        // Create new profile with paid status for development
        const { data: profile, error: insertError } = await supabase
            .from('profiles')
            .insert({
                id: userId,
                email: email,
                is_paid: true,
                is_active: true,
                subscription_plan: 'development',
                stripe_customer_id: 'dev_' + userId.substring(0, 8),
                payment_date: new Date().toISOString(),
                created_at: new Date().toISOString(),
                updated_at: new Date().toISOString()
            })
            .select()
            .single();

        if (insertError) {
            console.error('❌ Error creating profile:', insertError);
            throw new Error(`Failed to create profile: ${insertError.message}`);
        }

        console.log('✅ Profile created successfully:', profile);

        return {
            statusCode: 200,
            headers: {
                'Access-Control-Allow-Origin': '*',
                'Access-Control-Allow-Headers': 'Content-Type'
            },
            body: JSON.stringify({
                success: true,
                message: 'Profile created successfully',
                profile: profile,
                profileExists: false
            })
        };

    } catch (error) {
        console.error('❌ Error in create-profile-on-login:', error);
        return {
            statusCode: 500,
            headers: {
                'Access-Control-Allow-Origin': '*',
                'Access-Control-Allow-Headers': 'Content-Type'
            },
            body: JSON.stringify({
                error: error.message || 'Failed to create profile'
            })
        };
    }
};