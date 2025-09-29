const { createClient } = require('@supabase/supabase-js');

// Session echo endpoint for admin testing
exports.handler = async (event, context) => {
    const headers = {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization',
        'Access-Control-Allow-Methods': 'GET, OPTIONS',
    };

    if (event.httpMethod === 'OPTIONS') {
        return { statusCode: 200, headers, body: '' };
    }

    if (event.httpMethod !== 'GET') {
        return {
            statusCode: 405,
            headers,
            body: JSON.stringify({ error: 'Method not allowed' }),
        };
    }

    try {
        // Get auth token
        const authHeader = event.headers.authorization || event.headers.Authorization;
        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            return {
                statusCode: 200,
                headers,
                body: JSON.stringify({ 
                    email: null,
                    entitled: false,
                    error: 'No authorization token provided'
                }),
            };
        }

        const token = authHeader.substring(7);
        const supabase = createClient(
            process.env.SUPABASE_URL,
            process.env.SUPABASE_ANON_KEY
        );

        // Get user from token
        const { data: { user }, error: authError } = await supabase.auth.getUser(token);
        
        if (authError || !user) {
            return {
                statusCode: 200,
                headers,
                body: JSON.stringify({ 
                    email: null,
                    entitled: false,
                    error: 'Invalid or expired token'
                }),
            };
        }

        // Check payment status
        const { data: profile, error: profileError } = await supabase
            .from('profiles')
            .select('is_paid, subscription_plan')
            .eq('id', user.id)
            .single();

        const entitled = profile && profile.is_paid;

        return {
            statusCode: 200,
            headers,
            body: JSON.stringify({
                email: user.email,
                entitled: entitled,
                plan: profile?.subscription_plan || null,
                timestamp: new Date().toISOString()
            }),
        };

    } catch (error) {
        console.error('Session echo error:', error);
        return {
            statusCode: 200,
            headers,
            body: JSON.stringify({ 
                email: null,
                entitled: false,
                error: error.message 
            }),
        };
    }
};