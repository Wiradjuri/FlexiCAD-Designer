// netlify/lib/require-auth.mjs
// Single gate for all functions: CORS, json helper, requireAuth, requireAdmin.
// CSP-safe, no client secrets, logs are bannered.

const IS_DEV = (process.env.APP_ENV || '').toLowerCase() === 'development';
const ADMIN_EMAILS = (process.env.ADMIN_EMAILS || '')
  .split(/[,\s]+/)
  .map(s => s.trim().toLowerCase())
  .filter(Boolean);

export const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS, DELETE, PUT',
  'Content-Type': 'application/json'
};

export function json(status, body) {
  return { statusCode: status, headers: corsHeaders, body: JSON.stringify(body) };
}

function banner(msg) {
  console.log(`[${new Date().toISOString()}] ${msg}`);
}

function parseBearer(event) {
  const h = (event && event.headers) || {};
  const authHeader =
    h.authorization ||
    h.Authorization ||
    h['x-authorization'] ||
    h['x-forwarded-authorization'] ||
    '';
  const m = /^Bearer\s+(.+)$/i.exec((authHeader || '').trim());
  return m?.[1] || null;
}

async function fetchSupabaseUserByToken(accessToken) {
  const url = `${process.env.SUPABASE_URL}/auth/v1/user`;
  // Supabase requires both Authorization: Bearer <token> and apikey (anon or service)
  const apikey = process.env.SUPABASE_ANON_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;
  const res = await fetch(url, {
    method: 'GET',
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'apikey': apikey
    }
  });
  if (!res.ok) {
    return { ok: false, status: res.status, error: `supabase_user_lookup_${res.status}` };
  }
  const user = await res.json();
  // Normalize email lower-case
  if (user?.email) user.email = String(user.email).toLowerCase();
  return { ok: true, status: 200, user };
}

export async function requireAuth(event) {
  banner('=== REQUIRE-AUTH START ===');

  // CORS preflight
  if (event.httpMethod === 'OPTIONS') {
    return { ok: true, status: 200, preflight: true };
  }

  const token = parseBearer(event);
  if (!token) {
    banner('require-auth: Missing Authorization bearer token');
    return { ok: false, status: 401, error: 'Missing Authorization bearer token' };
  }

  // DEV SHORT-CIRCUIT: accept DEV_BEARER_TOKEN
  if (IS_DEV && process.env.DEV_BEARER_TOKEN && token === process.env.DEV_BEARER_TOKEN) {
    banner('require-auth: DEV token accepted');
    return {
      ok: true,
      status: 200,
      user: { email: 'dev-user@local', role: 'dev', sub: 'dev' }
    };
  }

  // PROD/PREVIEW: validate Supabase JWT
  const r = await fetchSupabaseUserByToken(token);
  if (!r.ok) {
    banner(`require-auth: Supabase user lookup failed (${r.status})`);
    return { ok: false, status: 401, error: 'Invalid session token' };
  }

  banner(`require-auth: user=${r.user?.email || 'unknown'}`);
  return { ok: true, status: 200, user: r.user };
}

export async function requireAdmin(event) {
  banner('=== REQUIRE-ADMIN START ===');

  // CORS preflight
  if (event.httpMethod === 'OPTIONS') {
    return { ok: true, status: 200, preflight: true };
  }

  const token = parseBearer(event);
  if (!token) {
    banner('require-admin: Missing Authorization bearer token');
    return { ok: false, status: 401, error: 'Missing Authorization bearer token' };
  }

  // DEV SHORT-CIRCUIT: accept DEV_ADMIN_TOKEN
  if (IS_DEV && process.env.DEV_ADMIN_TOKEN && token === process.env.DEV_ADMIN_TOKEN) {
    banner('require-admin: DEV admin token accepted');
    return {
      ok: true,
      status: 200,
      user: { email: 'dev-admin@local', role: 'admin', sub: 'dev-admin' },
      isAdmin: true
    };
  }

  // PROD/PREVIEW: validate via Supabase then check ADMIN_EMAILS
  const r = await fetchSupabaseUserByToken(token);
  if (!r.ok) {
    banner(`require-admin: Supabase user lookup failed (${r.status})`);
    return { ok: false, status: 401, error: 'Invalid session token' };
  }

  const email = (r.user?.email || '').toLowerCase();
  if (!ADMIN_EMAILS.includes(email)) {
    banner(`require-admin: forbidden for ${email}`);
    return { ok: false, status: 403, error: 'forbidden' };
  }

  banner(`require-admin: Access granted for ${email}`);
  return { ok: true, status: 200, user: r.user, isAdmin: true };
}
