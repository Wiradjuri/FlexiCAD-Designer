// netlify/functions/simple-payment-fix.js
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

        console.log('Simple payment fix for user:', email);

        // Update any profile with this email to have paid status
        const { data, error } = await supabase
            .from('profiles')
            .update({
                is_paid: true,
                is_active: true,
                subscription_plan: 'monthly',
                updated_at: new Date().toISOString()
            })
            .eq('email', email)
            .select();

        if (error) {
            console.error('Database error:', error);
            throw new Error(`Database error: ${error.message}`);
        }

        if (!data || data.length === 0) {
            return {
                statusCode: 404,
                headers,
                body: JSON.stringify({ 
                    error: 'No profile found with that email. User might not be in the profiles table yet.' 
                })
            };
        }

        console.log('✅ Payment status fixed successfully');

        return {
            statusCode: 200,
            headers,
            body: JSON.stringify({
                success: true,
                message: 'Payment status updated successfully',
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