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

    // DEV SUPPORT: Allow test token in development environment only
    const isDev = process.env.APP_ENV === 'development';
    const devToken = process.env.DEV_BEARER_TOKEN;
    if (isDev && devToken && jwt === devToken) {
      console.log('[require-auth] DEV token accepted (APP_ENV=development)');
      // Return mock user with first admin email
      const adminEmails = (process.env.ADMIN_EMAILS || '').split(',').map(e => e.trim()).filter(Boolean);
      const mockEmail = adminEmails[0] || 'dev@example.com';
      return {
        ok: true,
        supabase: null, // Dev mode: no real Supabase client
        requesterId: 'dev-user-id',
        requesterEmail: mockEmail,
        isDev: true
      };
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
