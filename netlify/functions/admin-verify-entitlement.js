const { createClient } = require('@supabase/supabase-js');

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

        // Get email from query parameters
        const email = event.queryStringParameters?.email;
        if (!email) {
            return {
                statusCode: 400,
                headers,
                body: JSON.stringify({ error: 'Email parameter required' }),
            };
        }

        // Look up profile, auto-provision if missing (admin-only path)
        let profile;
        let provisioned = false;
        
        const { data: existingProfile, error: lookupError } = await supabase
            .from('profiles')
            .select('*')
            .eq('email', email)
            .single();

        if (lookupError && lookupError.code === 'PGRST116') {
            // Profile doesn't exist, auto-provision (admin-only)
            console.log(`[admin-verify-entitlement] Auto-provisioning profile for ${email}`);
            
            const { data: newProfile, error: createError } = await supabase
                .from('profiles')
                .insert({
                    email: email,
                    is_paid: false,
                    is_active: true,
                    created_at: new Date().toISOString()
                })
                .select()
                .single();

            if (createError) {
                throw new Error(`Failed to provision profile: ${createError.message}`);
            }
            
            profile = newProfile;
            provisioned = true;
        } else if (lookupError) {
            throw lookupError;
        } else {
            profile = existingProfile;
        }

        // Check for webhook events (if table exists)
        let lastWebhookAt = null;
        try {
            const { data: webhookEvents } = await supabase
                .from('webhook_events')
                .select('created_at')
                .eq('customer_email', email)
                .order('created_at', { ascending: false })
                .limit(1);
            
            if (webhookEvents && webhookEvents.length > 0) {
                lastWebhookAt = webhookEvents[0].created_at;
            }
        } catch (error) {
            // webhook_events table might not exist yet
            console.log('[admin-verify-entitlement] webhook_events table not available');
        }

        const isPaid = profile.is_paid && profile.subscription_plan;
        const hasRecentWebhook = lastWebhookAt && 
            (new Date() - new Date(lastWebhookAt)) < (24 * 60 * 60 * 1000); // 24 hours

        const result = {
            ok: true,
            email: email,
            profile: {
                exists: true,
                provisioned: provisioned,
                is_paid: profile.is_paid,
                subscription_plan: profile.subscription_plan,
                payment_date: profile.payment_date,
                is_active: profile.is_active
            },
            entitlement: {
                entitled: isPaid,
                reason: isPaid ? 'valid_subscription' : 'no_subscription'
            },
            webhook: {
                lastWebhookAt: lastWebhookAt,
                hasRecent: hasRecentWebhook
            },
            test: {
                pass: isPaid && (hasRecentWebhook || !lastWebhookAt), // Pass if paid, even without recent webhook for tests
                reason: isPaid ? 
                    (hasRecentWebhook ? 'paid_with_webhook' : 'paid_no_recent_webhook') :
                    'not_paid'
            }
        };

        if (provisioned) {
            console.log(`[admin-verify-entitlement] Provisioned profile for ${email}`);
        }

        return {
            statusCode: 200,
            headers,
            body: JSON.stringify(result),
        };

    } catch (error) {
        console.error('[admin-verify-entitlement] Error:', error);
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