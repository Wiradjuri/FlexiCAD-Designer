// Secure public configuration endpoint
// Only exposes safe, public configuration values

exports.handler = async (event, context) => {
    try {
        // Return only public, non-sensitive configuration
        const publicConfig = {
            SUPABASE_URL: process.env.SUPABASE_URL,
            SUPABASE_ANON_KEY: process.env.SUPABASE_ANON_KEY,
            STRIPE_PUBLISHABLE_KEY: process.env.STRIPE_PUBLISHABLE_KEY,
            APP_NAME: 'FlexiCAD Designer',
            VERSION: '1.0.0',
            NETLIFY_FUNCTIONS_BASE: '/.netlify/functions',
            PAYMENT_FIRST: true,
            FEATURES: {
                STRICT_PAYMENT_ENFORCEMENT: true,
                DEBUG_AUTH: false, // Never expose debug info
                AUTO_LOGOUT_UNPAID: true,
                SESSION_MONITORING: true
            },
            PRICING: {
                MONTHLY: {
                    amount: 10,
                    currency: 'USD',
                    interval: 'month',
                    plan_id: 'monthly'
                },
                YEARLY: {
                    amount: 50,
                    currency: 'USD',
                    interval: 'year',
                    plan_id: 'yearly',
                    savings: 70
                }
            }
        };

        return {
            statusCode: 200,
            headers: {
                'Content-Type': 'application/json',
                'Cache-Control': 'public, max-age=300', // Cache for 5 minutes
                'Access-Control-Allow-Origin': '*'
            },
            body: JSON.stringify(publicConfig)
        };
    } catch (error) {
        console.error('Error getting public config:', error);
        return {
            statusCode: 500,
            body: JSON.stringify({ error: 'Failed to get configuration' })
        };
    }
};