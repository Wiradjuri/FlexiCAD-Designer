import Stripe from 'stripe';
import OpenAI from 'openai';
import { requireAdmin, corsHeaders, json } from '../lib/require-admin.mjs';

const stripeSecretKey = process.env.STRIPE_SECRET_KEY || '';
const openaiApiKey = process.env.OPENAI_API_KEY || '';
const stripeClient = stripeSecretKey ? new Stripe(stripeSecretKey) : null;
const openaiClient = openaiApiKey ? new OpenAI({ apiKey: openaiApiKey }) : null;

const ts = () => new Date().toISOString();

export async function handler(event) {
    if (event.httpMethod === 'OPTIONS') {
        return { statusCode: 200, headers: corsHeaders };
    }

    console.log(`[${ts()}] === ADMIN-HEALTH START ===`);

    const gate = await requireAdmin(event);
    if (!gate.ok) {
        console.warn(`[${ts()}] admin-health: failed admin gate (${gate.code})`);
        return json(gate.status, {
            ok: false,
            code: gate.code,
            error: gate.error
        });
    }

    const payload = {
        ok: true,
        admin: true,
        email: gate.requesterEmail,
        requesterId: gate.requesterId,
        timestamp: ts(),
        env: {
            node: process.version,
            mode: stripeSecretKey.startsWith('sk_live_') ? 'live' : 'test',
            rev: process.env.COMMIT_REF || process.env.NETLIFY_COMMIT_SHA || 'local',
            region: process.env.AWS_REGION || 'us-east-1'
        }
    };

    // Supabase health check
    try {
        const { error } = await gate.supabase
            .from('profiles')
            .select('id', { count: 'exact', head: true })
            .limit(1);
        payload.supabase = { ok: !error, connected: !error };
    } catch (error) {
        console.warn(`[${ts()}] admin-health: supabase check failed (${error.message})`);
        payload.supabase = { ok: false, connected: false, error: error.message };
    }

    // Stripe health check
    if (stripeClient) {
        try {
            const balance = await stripeClient.balance.retrieve();
            payload.stripe = {
                ok: true,
                mode: stripeSecretKey.startsWith('sk_live_') ? 'live' : 'test',
                hasBalance: Array.isArray(balance?.available)
            };
        } catch (error) {
            console.warn(`[${ts()}] admin-health: stripe check failed (${error.message})`);
            payload.stripe = {
                ok: false,
                mode: stripeSecretKey.startsWith('sk_live_') ? 'live' : 'test',
                error: error.message
            };
        }
    } else {
        payload.stripe = { ok: false, mode: 'unknown', error: 'STRIPE_SECRET_KEY not configured' };
    }

    // OpenAI health check
    if (openaiClient) {
        try {
            await openaiClient.models.list({ limit: 1 });
            payload.openai = {
                ok: true,
                model: process.env.OPENAI_MODEL || 'gpt-4o-mini'
            };
        } catch (error) {
            console.warn(`[${ts()}] admin-health: openai check failed (${error.message})`);
            payload.openai = {
                ok: false,
                error: error.message
            };
        }
    } else {
        payload.openai = { ok: false, error: 'OPENAI_API_KEY not configured' };
    }

    console.log(`[${ts()}] === ADMIN-HEALTH END ===`);
    return json(200, payload);
}

export default handler;