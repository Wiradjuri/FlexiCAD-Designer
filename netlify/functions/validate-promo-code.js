const { createClient } = require('@supabase/supabase-js');

exports.handler = async (event, context) => {
    console.log('🎟️ Promo code validation request:', event.httpMethod);

    // Handle CORS preflight requests
    const headers = {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization',
        'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    };

    if (event.httpMethod === 'OPTIONS') {
        return {
            statusCode: 200,
            headers,
            body: ''
        };
    }

    if (event.httpMethod !== 'POST') {
        return {
            statusCode: 405,
            headers,
            body: JSON.stringify({ error: 'Method not allowed' })
        };
    }

    try {
        const { code } = JSON.parse(event.body);

        if (!code) {
            return {
                statusCode: 400,
                headers,
                body: JSON.stringify({ 
                    valid: false, 
                    error: 'Promo code is required' 
                })
            };
        }

        // Initialize Supabase client
        const supabase = createClient(
            process.env.SUPABASE_URL,
            process.env.SUPABASE_SERVICE_ROLE_KEY
        );

        console.log('🔍 Checking promo code:', code);

        // Query the promo code
        const { data: promoCode, error } = await supabase
            .from('promo_codes')
            .select('*')
            .eq('code', code.toUpperCase())
            .eq('active', true)
            .single();

        if (error || !promoCode) {
            console.log('❌ Promo code not found or inactive');
            return {
                statusCode: 200,
                headers,
                body: JSON.stringify({ 
                    valid: false, 
                    error: 'Invalid or expired promo code' 
                })
            };
        }

        // Check if promo code has expired
        if (promoCode.expires_at) {
            const expirationDate = new Date(promoCode.expires_at);
            const now = new Date();

            if (now > expirationDate) {
                console.log('❌ Promo code expired');
                return {
                    statusCode: 200,
                    headers,
                    body: JSON.stringify({ 
                        valid: false, 
                        error: 'This promo code has expired' 
                    })
                };
            }
        }

        console.log('✅ Valid promo code found:', promoCode);

        return {
            statusCode: 200,
            headers,
            body: JSON.stringify({
                valid: true,
                code: promoCode.code,
                discount_percent: promoCode.discount_percent,
                description: promoCode.description
            })
        };

    } catch (error) {
        console.error('❌ Promo validation error:', error);
        return {
            statusCode: 500,
            headers,
            body: JSON.stringify({ 
                valid: false,
                error: 'Internal server error' 
            })
        };
    }
};