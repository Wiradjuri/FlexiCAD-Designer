// netlify/functions/create-checkout-session.js
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);

exports.handler = async (event, context) => {
    console.log('Creating checkout session...');
    
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
        const { email, plan = 'monthly', userId, promoCode } = JSON.parse(event.body);

        if (!email) {
            throw new Error('Email is required');
        }

        console.log('Creating checkout session for:', email, 'Plan:', plan, 'Promo:', promoCode);

        // Price configuration
        const prices = {
            monthly: process.env.STRIPE_MONTHLY_PRICE_ID || 'price_monthly_default',
            yearly: process.env.STRIPE_YEARLY_PRICE_ID || 'price_yearly_default'
        };

        const priceId = prices[plan];
        if (!priceId) {
            throw new Error('Invalid plan selected');
        }

        let discountAmount = 0;
        let promoValid = false;

        // Validate promo code if provided
        if (promoCode) {
            const { createClient } = require('@supabase/supabase-js');
            const supabase = createClient(
                process.env.SUPABASE_URL,
                process.env.SUPABASE_SERVICE_ROLE_KEY
            );

            const { data: promo, error: promoError } = await supabase
                .from('promo_codes')
                .select('*')
                .eq('code', promoCode.toUpperCase())
                .eq('active', true)
                .single();

            if (promoError || !promo) {
                throw new Error('Invalid or expired promo code');
            }

            // Check if promo code is expired
            if (promo.expires_at && new Date(promo.expires_at) < new Date()) {
                throw new Error('Promo code has expired');
            }

            discountAmount = promo.discount_percent;
            promoValid = true;
            console.log(`✅ Valid promo code applied: ${discountAmount}% discount`);
        }

        // Create checkout session
        const sessionConfig = {
            payment_method_types: ['card'],
            line_items: [
                {
                    price: priceId,
                    quantity: 1,
                },
            ],
            mode: 'subscription',
            customer_email: email,
            success_url: `${process.env.URL || 'http://localhost:8888'}/payment-success.html?session_id={CHECKOUT_SESSION_ID}&user_id=${userId || ''}`,
            cancel_url: `${process.env.URL || 'http://localhost:8888'}/register.html?payment=cancelled`,
            metadata: {
                user_email: email,
                user_id: userId || '',
                plan: plan,
                promo_code: promoCode || '',
                discount_applied: discountAmount
            }
        };

        // Add discount coupon if promo code is valid
        if (promoValid && discountAmount > 0) {
            // Create or use existing Stripe coupon
            const coupon = await stripe.coupons.create({
                percent_off: discountAmount,
                duration: 'once', // Apply discount to first payment only
                name: `${promoCode} - ${discountAmount}% off`
            });
            
            sessionConfig.discounts = [{
                coupon: coupon.id
            }];
        }

        const session = await stripe.checkout.sessions.create(sessionConfig);

        console.log('✅ Checkout session created:', session.id);

        return {
            statusCode: 200,
            headers: {
                'Access-Control-Allow-Origin': '*',
                'Access-Control-Allow-Headers': 'Content-Type',
                'Access-Control-Allow-Methods': 'POST'
            },
            body: JSON.stringify({
                sessionId: session.id,
                url: session.url
            })
        };

    } catch (error) {
        console.error('❌ Error creating checkout session:', error);
        return {
            statusCode: 500,
            headers: {
                'Access-Control-Allow-Origin': '*',
                'Access-Control-Allow-Headers': 'Content-Type',
                'Access-Control-Allow-Methods': 'POST'
            },
            body: JSON.stringify({
                error: error.message || 'Failed to create checkout session'
            })
        };
    }
};