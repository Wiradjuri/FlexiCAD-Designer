// netlify/functions/test-env.js
exports.handler = async (event, context) => {
    const headers = {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type',
        'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    };

    if (event.httpMethod === 'OPTIONS') {
        return { statusCode: 200, headers, body: '' };
    }

    try {
        return {
            statusCode: 200,
            headers,
            body: JSON.stringify({
                supabase_url: process.env.SUPABASE_URL ? 'present' : 'missing',
                service_role: process.env.SUPABASE_SERVICE_ROLE_KEY ? 'present' : 'missing',
                anon_key: process.env.SUPABASE_ANON_KEY ? 'present' : 'missing',
                openai_key: process.env.OPENAI_API_KEY ? 'present' : 'missing'
            })
        };
    } catch (error) {
        return {
            statusCode: 500,
            headers,
            body: JSON.stringify({
                error: error.message
            })
        };
    }
};