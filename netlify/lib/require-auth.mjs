// netlify/lib/require-auth.mjs
import { createClient } from '@supabase/supabase-js';

export const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Authorization, Content-Type',
  'Access-Control-Allow-Methods': 'GET,POST,OPTIONS',
};

export const json = (status, body) => ({
  statusCode: status,
  headers: {
    'content-type': 'application/json',
    ...corsHeaders,
  },
  body: JSON.stringify(body),
});

export async function requireAuth(event) {
  try {
    const auth = event.headers?.authorization || event.headers?.Authorization || '';
    const jwt = auth?.startsWith('Bearer ') ? auth.slice(7).trim() : '';

    if (!jwt) {
      return { ok: false, status: 401, code: 'auth_required', error: 'Missing Authorization bearer token' };
    }

    const supabase = createClient(
      process.env.SUPABASE_URL,
      process.env.SUPABASE_ANON_KEY,
      {
        auth: { persistSession: false },
        global: { headers: { Authorization: `Bearer ${jwt}` } },
      }
    );

    const { data, error } = await supabase.auth.getUser();
    if (error || !data?.user) {
      return { ok: false, status: 401, code: 'auth_invalid', error: error?.message || 'Invalid token' };
    }

    return {
      ok: true,
      supabase,
      requesterId: data.user.id,
      requesterEmail: data.user.email ?? null,
    };
  } catch (e) {
    return { ok: false, status: 500, code: 'auth_internal', error: e.message };
  }
}
