// ======================================================================
// CRITICAL MISSING FUNCTIONS FOR FLEXICAD DESIGNER
// ======================================================================

// 1. Enhanced save-design.js (with AI session linking)
// netlify/functions/save-design.js
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
);

const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
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
        const { name, prompt, code, ai_session_id = null } = JSON.parse(event.body);

        // Get user from auth token
        const authHeader = event.headers.authorization;
        if (!authHeader) {
            throw new Error('No authorization header');
        }

        const token = authHeader.replace('Bearer ', '');
        const { data: { user }, error: authError } = await supabase.auth.getUser(token);
        
        if (authError || !user) {
            throw new Error('Invalid authentication');
        }

        // Save design with AI session link
        const { data: design, error } = await supabase
            .from('designs')
            .insert({
                user_id: user.id,
                name: name,
                prompt: prompt,
                code: code,
                ai_session_id: ai_session_id
            })
            .select()
            .single();

        if (error) throw error;

        return {
            statusCode: 200,
            headers,
            body: JSON.stringify({
                success: true,
                design: design
            })
        };

    } catch (error) {
        console.error('Save design error:', error);
        return {
            statusCode: 500,
            headers,
            body: JSON.stringify({ error: error.message })
        };
    }
};

// ======================================================================
// 2. get-public-config.js (Secure configuration endpoint)
// netlify/functions/get-public-config.js

exports.handler = async (event, context) => {
    const headers = {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type',
        'Access-Control-Allow-Methods': 'GET, OPTIONS',
        'Cache-Control': 'public, max-age=300' // Cache for 5 minutes
    };

    if (event.httpMethod === 'OPTIONS') {
        return { statusCode: 200, headers, body: '' };
    }

    if (event.httpMethod !== 'GET') {
        return {
            statusCode: 405,
            headers,
            body: JSON.stringify({ error: 'Method not allowed' })
        };
    }

    try {
        // Only expose public-safe configuration
        const config = {
            SUPABASE_URL: process.env.SUPABASE_URL,
            SUPABASE_ANON_KEY: process.env.SUPABASE_ANON_KEY,
            STRIPE_PUBLISHABLE_KEY: process.env.STRIPE_PUBLISHABLE_KEY,
            APP_NAME: 'FlexiCAD Designer',
            VERSION: '1.0.0',
            NETLIFY_FUNCTIONS_BASE: '/.netlify/functions'
        };

        return {
            statusCode: 200,
            headers: {
                ...headers,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(config)
        };

    } catch (error) {
        console.error('Config error:', error);
        return {
            statusCode: 500,
            headers,
            body: JSON.stringify({ error: 'Configuration not available' })
        };
    }
};

// ======================================================================
// 3. stripe-webhook.js (Enhanced with promo code tracking)
// netlify/functions/stripe-webhook.js

const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
);

exports.handler = async (event, context) => {
    const sig = event.headers['stripe-signature'];
    let webhookEvent;

    try {
        webhookEvent = stripe.webhooks.constructEvent(
            event.body,
            sig,
            process.env.STRIPE_WEBHOOK_SECRET
        );
    } catch (err) {
        console.error('Webhook signature verification failed:', err.message);
        return { statusCode: 400, body: `Webhook Error: ${err.message}` };
    }

    try {
        switch (webhookEvent.type) {
            case 'checkout.session.completed':
                await handleCheckoutCompleted(webhookEvent.data.object);
                break;
            
            case 'customer.subscription.updated':
                await handleSubscriptionUpdated(webhookEvent.data.object);
                break;
            
            case 'customer.subscription.deleted':
                await handleSubscriptionDeleted(webhookEvent.data.object);
                break;
            
            default:
                console.log(`Unhandled event type: ${webhookEvent.type}`);
        }

        return { statusCode: 200, body: JSON.stringify({ received: true }) };

    } catch (error) {
        console.error('Webhook handling error:', error);
        return { statusCode: 500, body: 'Webhook handler failed' };
    }
};

async function handleCheckoutCompleted(session) {
    try {
        // Get customer details
        const customer = await stripe.customers.retrieve(session.customer);
        
        // Get subscription details
        const subscription = await stripe.subscriptions.retrieve(session.subscription);
        
        // Create user account in Supabase
        const { data: authUser, error: authError } = await supabase.auth.admin.createUser({
            email: customer.email,
            password: generateRandomPassword(),
            email_confirm: true,
            user_metadata: {
                full_name: customer.name,
                stripe_customer_id: customer.id
            }
        });

        if (authError) {
            console.error('Auth user creation error:', authError);
            return;
        }

        // Create profile
        const { error: profileError } = await supabase
            .from('profiles')
            .insert({
                id: authUser.user.id,
                email: customer.email,
                full_name: customer.name,
                is_paid: true,
                is_active: true,
                subscription_plan: session.metadata.plan || 'monthly',
                stripe_customer_id: customer.id,
                payment_date: new Date().toISOString()
            });

        if (profileError) {
            console.error('Profile creation error:', profileError);
        }

        // Update session record
        await supabase
            .from('stripe_sessions')
            .update({
                status: 'completed',
                subscription_id: subscription.id,
                user_id: authUser.user.id
            })
            .eq('session_id', session.id);

        console.log(`✅ User account created for ${customer.email}`);

    } catch (error) {
        console.error('Checkout completion error:', error);
    }
}

async function handleSubscriptionUpdated(subscription) {
    try {
        const customer = await stripe.customers.retrieve(subscription.customer);
        
        // Update user status based on subscription
        const isActive = subscription.status === 'active';
        
        const { error } = await supabase
            .from('profiles')
            .update({
                is_active: isActive,
                updated_at: new Date().toISOString()
            })
            .eq('stripe_customer_id', customer.id);

        if (error) {
            console.error('Profile update error:', error);
        }

    } catch (error) {
        console.error('Subscription update error:', error);
    }
}

async function handleSubscriptionDeleted(subscription) {
    try {
        const customer = await stripe.customers.retrieve(subscription.customer);
        
        // Deactivate user
        const { error } = await supabase
            .from('profiles')
            .update({
                is_active: false,
                updated_at: new Date().toISOString()
            })
            .eq('stripe_customer_id', customer.id);

        if (error) {
            console.error('Profile deactivation error:', error);
        }

    } catch (error) {
        console.error('Subscription deletion error:', error);
    }
}

function generateRandomPassword() {
    return Math.random().toString(36).slice(-12) + Math.random().toString(36).slice(-12);
}

// ======================================================================
// 4. validate-promo.js (Promo code validation endpoint)
// netlify/functions/validate-promo.js

const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
);

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

        // Check promo code in database
        const { data: promo, error } = await supabase
            .from('promo_codes')
            .select('*')
            .eq('code', code.toUpperCase())
            .single();

        if (error || !promo) {
            return {
                statusCode: 200,
                headers,
                body: JSON.stringify({ 
                    valid: false, 
                    error: 'Invalid promo code' 
                })
            };
        }

        if (!promo.active) {
            return {
                statusCode: 200,
                headers,
                body: JSON.stringify({ 
                    valid: false, 
                    error: 'Promo code is inactive' 
                })
            };
        }

        if (promo.expires_at && new Date(promo.expires_at) < new Date()) {
            return {
                statusCode: 200,
                headers,
                body: JSON.stringify({ 
                    valid: false, 
                    error: 'Promo code has expired' 
                })
            };
        }

        return {
            statusCode: 200,
            headers,
            body: JSON.stringify({
                valid: true,
                code: promo.code,
                discount: promo.discount_percent,
                description: promo.description
            })
        };

    } catch (error) {
        console.error('Promo validation error:', error);
        return {
            statusCode: 500,
            headers,
            body: JSON.stringify({ 
                valid: false, 
                error: 'Validation failed' 
            })
        };
    }
};

// ======================================================================
// 5. REQUIRED ENVIRONMENT VARIABLES
// ======================================================================
/*
Make sure you have these in your Netlify Environment Variables:

SUPABASE_URL=https://fifqqnflxwfgnidawxzw.supabase.co
SUPABASE_ANON_KEY=your_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
STRIPE_SECRET_KEY=sk_live_or_test_key
STRIPE_PUBLISHABLE_KEY=pk_live_or_test_key
STRIPE_WEBHOOK_SECRET=whsec_webhook_secret
STRIPE_MONTHLY_PRICE_ID=price_monthly_id
STRIPE_YEARLY_PRICE_ID=price_yearly_id
OPENAI_API_KEY=your_openai_key
NETLIFY_SITE_URL=https://flexicad.com.au
*/