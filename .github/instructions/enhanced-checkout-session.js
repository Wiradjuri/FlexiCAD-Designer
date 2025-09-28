const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
);

// Price configuration
const prices = {
    monthly: process.env.STRIPE_MONTHLY_PRICE_ID || 'price_1QA3nYPJgpJveDpNiE5HQOi5',
    yearly: process.env.STRIPE_YEARLY_PRICE_ID || 'price_1QA3nYPJgpJveDpNiE5HQOi5'
};

const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

exports.handler = async (event, context) => {
    if (event.httpMethod === 'OPTIONS') {
        return { statusCode: 200, headers, body: '' };
    }

    if (event.httpMethod !== 'POST') {
        return {
            statusCode: 405,
            headers,
            body: JSON.stringify({ error: 'Method not allowed' })
        };
    }

    try {
        const { 
            email, 
            fullName, 
            plan = 'monthly', 
            promoCode = null 
        } = JSON.parse(event.body);

        if (!email || !fullName) {
            throw new Error('Email and full name are required');
        }

        if (!prices[plan]) {
            throw new Error('Invalid plan selected');
        }

        // Validate promo code if provided
        let discountCoupon = null;
        if (promoCode) {
            const promoValidation = await validatePromoCode(promoCode);
            if (!promoValidation.valid) {
                throw new Error(promoValidation.error);
            }
            
            // Create Stripe coupon for this promo code
            discountCoupon = await createStripeCoupon(promoValidation.promo);
        }

        // Check if customer already exists
        let customerId = null;
        const customers = await stripe.customers.list({
            email: email,
            limit: 1
        });

        if (customers.data.length > 0) {
            customerId = customers.data[0].id;
        } else {
            // Create new customer
            const customer = await stripe.customers.create({
                email: email,
                name: fullName,
                metadata: {
                    source: 'flexicad_designer',
                    plan: plan
                }
            });
            customerId = customer.id;
        }

        // Build session configuration
        const sessionConfig = {
            customer: customerId,
            payment_method_types: ['card'],
            line_items: [{
                price: prices[plan],
                quantity: 1,
            }],
            mode: 'subscription',
            success_url: `${process.env.NETLIFY_SITE_URL || 'https://flexicad.com.au'}/payment-success.html?session_id={CHECKOUT_SESSION_ID}`,
            cancel_url: `${process.env.NETLIFY_SITE_URL || 'https://flexicad.com.au'}/payment.html?cancelled=true`,
            metadata: {
                user_email: email,
                user_name: fullName,
                plan: plan,
                promo_code: promoCode || ''
            },
            subscription_data: {
                metadata: {
                    user_email: email,
                    user_name: fullName,
                    plan: plan,
                    promo_code: promoCode || ''
                }
            },
            automatic_tax: {
                enabled: true
            },
            tax_id_collection: {
                enabled: true
            }
        };

        // Apply discount coupon if promo code is valid
        if (discountCoupon) {
            sessionConfig.discounts = [{
                coupon: discountCoupon.id
            }];
        }

        // Create checkout session
        const session = await stripe.checkout.sessions.create(sessionConfig);

        // Store session info in database for webhook processing
        const { error: dbError } = await supabase
            .from('stripe_sessions')
            .insert({
                session_id: session.id,
                customer_id: customerId,
                email: email,
                full_name: fullName,
                plan: plan,
                promo_code: promoCode,
                discount_amount: discountCoupon ? discountCoupon.percent_off : null,
                status: 'pending',
                created_at: new Date().toISOString()
            });

        if (dbError) {
            console.error('Database error:', dbError);
            // Continue anyway - webhook will handle the rest
        }

        return {
            statusCode: 200,
            headers,
            body: JSON.stringify({
                sessionId: session.id,
                url: session.url,
                customerId: customerId,
                discountApplied: !!discountCoupon,
                discountPercent: discountCoupon?.percent_off || 0
            })
        };

    } catch (error) {
        console.error('Checkout error:', error);
        return {
            statusCode: 500,
            headers,
            body: JSON.stringify({ 
                error: error.message || 'Failed to create checkout session' 
            })
        };
    }
};

// Validate promo code
async function validatePromoCode(code) {
    try {
        const { data: promo, error } = await supabase
            .from('promo_codes')
            .select('*')
            .eq('code', code.toUpperCase())
            .single();

        if (error || !promo) {
            return { valid: false, error: 'Invalid promo code' };
        }

        if (!promo.active) {
            return { valid: false, error: 'Promo code is inactive' };
        }

        if (promo.expires_at && new Date(promo.expires_at) < new Date()) {
            return { valid: false, error: 'Promo code has expired' };
        }

        return { valid: true, promo: promo };

    } catch (error) {
        console.error('Promo validation error:', error);
        return { valid: false, error: 'Error validating promo code' };
    }
}

// Create Stripe coupon from promo code
async function createStripeCoupon(promo) {
    try {
        // Check if coupon already exists
        try {
            const existingCoupon = await stripe.coupons.retrieve(promo.code);
            return existingCoupon;
        } catch (error) {
            // Coupon doesn't exist, create it
        }

        const couponConfig = {
            id: promo.code,
            name: promo.description || `${promo.discount_percent}% discount`,
            percent_off: promo.discount_percent,
            duration: 'once',
            metadata: {
                source: 'flexicad_promo',
                promo_id: promo.id
            }
        };

        // Set expiration if provided
        if (promo.expires_at) {
            couponConfig.redeem_by = Math.floor(new Date(promo.expires_at).getTime() / 1000);
        }

        return await stripe.coupons.create(couponConfig);

    } catch (error) {
        console.error('Error creating Stripe coupon:', error);
        throw new Error('Failed to apply promo code');
    }
}