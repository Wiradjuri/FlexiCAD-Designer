const { createClient } = require('@supabase/supabase-js');

// Admin health check endpoint
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

        // Check system components
        const healthChecks = {
            timestamp: new Date().toISOString(),
            email: user.email
        };

        // Environment info
        healthChecks.env = {
            node: process.version,
            mode: process.env.STRIPE_SECRET_KEY?.startsWith('sk_live_') ? 'live' : 'test',
            rev: process.env.COMMIT_REF || process.env.NETLIFY_COMMIT_SHA || 'local',
            region: process.env.AWS_REGION || 'us-east-1'
        };

        // Supabase health check
        try {
            const { data, error } = await supabase.from('profiles').select('count').limit(1);
            healthChecks.supabase = { 
                ok: !error,
                connected: !error 
            };
        } catch (error) {
            healthChecks.supabase = { 
                ok: false, 
                connected: false,
                error: error.message 
            };
        }

        // Stripe health check
        const stripeSecretKey = process.env.STRIPE_SECRET_KEY;
        const stripePriceTest = process.env.STRIPE_PRICE_TEST;
        let stripeOk = false;
        let stripeMode = 'unknown';
        let stripePriceOk = false;

        if (stripeSecretKey) {
            stripeMode = stripeSecretKey.startsWith('sk_live_') ? 'live' : 'test';
            try {
                const stripe = require('stripe')(stripeSecretKey);
                // Test connectivity with price lookup
                if (stripePriceTest) {
                    await stripe.prices.retrieve(stripePriceTest);
                    stripePriceOk = true;
                }
                stripeOk = true;
            } catch (error) {
                console.error('Stripe health check failed:', error.message);
            }
        }

        healthChecks.stripe = {
            ok: stripeOk,
            mode: stripeMode,
            priceOk: stripePriceOk,
            priceId: stripePriceTest ? stripePriceTest.substring(0, 12) + '...' : null,
            lastWebhookAt: null // TODO: implement webhook tracking
        };

        // OpenAI health check  
        const openaiApiKey = process.env.OPENAI_API_KEY;
        let openaiOk = false;
        if (openaiApiKey) {
            try {
                const OpenAI = require('openai');
                const openai = new OpenAI({ apiKey: openaiApiKey });
                // Minimal test - just list models
                await openai.models.list();
                openaiOk = true;
            } catch (error) {
                console.error('OpenAI health check failed:', error.message);
            }
        }

        healthChecks.openai = {
            ok: openaiOk,
            model: process.env.OPENAI_MODEL || 'gpt-4o-mini'
        };

        return {
            statusCode: 200,
            headers,
            body: JSON.stringify({
                ok: true,
                ...healthChecks
            }),
        };

    } catch (error) {
        console.error('Health check error:', error);
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