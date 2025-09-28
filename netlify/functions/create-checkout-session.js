// netlify/functions/create-checkout-session.js

// CORS headers for flexicad.com.au
const corsHeaders = {
    'Access-Control-Allow-Origin': 'https://flexicad.com.au',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS'
};

exports.handler = async (event, context) => {
    const timestamp = new Date().toISOString();
    console.log(`[${timestamp}] [create-checkout-session] Request received:`, {
        method: event.httpMethod,
        origin: event.headers.origin
    });

    // Handle CORS preflight
    if (event.httpMethod === 'OPTIONS') {
        console.log(`[${timestamp}] [create-checkout-session] Handling CORS preflight`);
        return {
            statusCode: 204,
            headers: corsHeaders,
            body: ''
        };
    }

    if (event.httpMethod !== 'POST') {
        console.log(`[${timestamp}] [create-checkout-session] Method not allowed:`, event.httpMethod);
        return {
            statusCode: 405,
            headers: corsHeaders,
            body: JSON.stringify({
                error: {
                    code: 'METHOD_NOT_ALLOWED',
                    message: 'Only POST requests are allowed'
                }
            })
        };
    }

    // Validate environment variables
    if (!process.env.STRIPE_SECRET_KEY) {
        console.error(`[${timestamp}] [create-checkout-session] STRIPE_SECRET_KEY not configured`);
        return {
            statusCode: 500,
            headers: corsHeaders,
            body: JSON.stringify({
                error: {
                    code: 'MISSING_ENV',
                    message: 'STRIPE_SECRET_KEY is not set'
                }
            })
        };
    }

    // Initialize Stripe with secret key
    const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);

    try {
        let requestBody;
        try {
            requestBody = JSON.parse(event.body || '{}');
        } catch (parseError) {
            console.error(`[${timestamp}] [create-checkout-session] Invalid JSON:`, parseError);
            return {
                statusCode: 400,
                headers: corsHeaders,
                body: JSON.stringify({
                    error: {
                        code: 'INVALID_JSON',
                        message: 'Request body must be valid JSON'
                    }
                })
            };
        }

        const { email, plan = 'monthly', userId, promoCode, priceId } = requestBody;

        if (!email || typeof email !== 'string' || !email.trim()) {
            console.error(`[${timestamp}] [create-checkout-session] Missing or invalid email`);
            return {
                statusCode: 400,
                headers: corsHeaders,
                body: JSON.stringify({
                    error: {
                        code: 'MISSING_EMAIL',
                        message: 'Valid email address is required'
                    }
                })
            };
        }

        console.log(`[${timestamp}] [create-checkout-session] Creating session for:`, email.replace(/(.{3}).*@/, '$1***@'), 'Plan:', plan, 'Has promo:', !!promoCode);

        // Simple one-time payment amounts (in cents)
        const amounts = {
            monthly: 1000, // $10.00 AUD
            yearly: 5000   // $50.00 AUD
        };

        const amount = amounts[plan];
        if (!amount) {
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
                    price_data: {
                        currency: 'aud',
                        product_data: {
                            name: `FlexiCAD Designer - ${plan.charAt(0).toUpperCase() + plan.slice(1)}`,
                            description: `${plan === 'monthly' ? 'Monthly' : 'Yearly'} subscription to FlexiCAD Designer`,
                        },
                        recurring: {
                            interval: plan === 'monthly' ? 'month' : 'year',
                        },
                        unit_amount: amount,
                    },
                    quantity: 1,
                },
            ],
            mode: 'subscription',
            customer_email: email,
            success_url: `${process.env.URL || 'http://localhost:8888'}/payment-success.html?session_id={CHECKOUT_SESSION_ID}&checkout=success&user_id=${userId || ''}`,
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

        console.log(`[${timestamp}] [create-checkout-session] ✅ Checkout session created:`, session.id);

        return {
            statusCode: 200,
            headers: corsHeaders,
            body: JSON.stringify({
                url: session.url,
                id: session.id
            })
        };

    } catch (error) {
        console.error(`[${timestamp}] [create-checkout-session] ❌ Error:`, {
            message: error.message,
            stack: error.stack?.split('\n')[0], // Only first line of stack
            type: error.constructor.name
        });

        // Determine appropriate status code and error response
        let statusCode = 500;
        let errorCode = 'INTERNAL_ERROR';
        let errorMessage = 'Failed to create checkout session';

        if (error.message?.includes('Email is required') ||
            error.message?.includes('Invalid plan')) {
            statusCode = 400;
            errorCode = 'VALIDATION_ERROR';
            errorMessage = error.message;
        } else if (error.message?.includes('Invalid or expired promo code') ||
                   error.message?.includes('Promo code has expired')) {
            statusCode = 400;
            errorCode = 'INVALID_PROMO';
            errorMessage = error.message;
        } else if (error.type === 'StripeInvalidRequestError') {
            statusCode = 400;
            errorCode = 'STRIPE_ERROR';
            errorMessage = `Payment processing error: ${error.message}`;
        }

        return {
            statusCode,
            headers: corsHeaders,
            body: JSON.stringify({
                error: {
                    code: errorCode,
                    message: errorMessage
                }
            })
        };
    }
};