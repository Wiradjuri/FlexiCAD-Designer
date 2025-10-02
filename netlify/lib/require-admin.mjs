import { createClient } from '@supabase/supabase-js';
import { requireAuth } from './require-auth.mjs';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS, DELETE, PUT',
};

function json(status, body) {
  return {
    statusCode: status,
    headers: { 'Content-Type': 'application/json', ...corsHeaders },
    body: JSON.stringify(body)
  };
}

function parseAllowlist() {
  const raw = (process.env.ADMIN_EMAILS || process.env.ADMIN_EMAIL || '').split(',');
  return new Set(raw.map((s) => (s || '').toLowerCase().trim()).filter(Boolean));
}

const withTimestamp = (message) => `[${new Date().toISOString()}] ${message}`;

export async function requireAdmin(event) {
  console.log(withTimestamp('=== REQUIRE-ADMIN START ==='));

  // DEV SUPPORT: Allow dev admin token in development environment only
  const isDev = process.env.APP_ENV === 'development';
  const devAdminToken = process.env.DEV_ADMIN_TOKEN;
  const auth = event.headers?.authorization || event.headers?.Authorization || '';
  const token = auth?.startsWith('Bearer ') ? auth.slice(7).trim() : '';

  if (isDev && devAdminToken && token === devAdminToken) {
    console.log(withTimestamp('require-admin: DEV_ADMIN_TOKEN accepted (APP_ENV=development)'));
    const adminEmails = (process.env.ADMIN_EMAILS || '').split(',').map(e => e.trim()).filter(Boolean);
    const mockEmail = adminEmails[0] || 'admin@example.com';
    return {
      ok: true,
      requesterEmail: mockEmail,
      requesterId: 'dev-admin-id',
      supabase: null,
      isDev: true
    };
  }

  // First authenticate the user
  const authResult = await requireAuth(event);
  if (!authResult.ok) {
    console.warn(withTimestamp(`require-admin: Auth failed (${authResult.error})`));
    return {
      ok: false,
      status: authResult.status,
      code: authResult.code,
      error: authResult.error
    };
  }

  // If this was a dev token auth, check if it's admin
  if (authResult.isDev) {
    console.log(withTimestamp('require-admin: Dev token user treated as admin'));
    return {
      ok: true,
      requesterEmail: authResult.requesterEmail,
      requesterId: authResult.requesterId,
      supabase: null,
      isDev: true
    };
  }

  const requesterEmail = authResult.requesterEmail?.toLowerCase().trim();
  if (!requesterEmail) {
    console.warn(withTimestamp('require-admin: No email in auth result'));
    return {
      ok: false,
      status: 401,
      code: 'unauthorized',
      error: 'Invalid session token'
    };
  }

  console.log(withTimestamp(`require-admin: Evaluating admin access for ${requesterEmail}`));

  // Create service client for admin checks
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!serviceRoleKey) {
    console.error(withTimestamp('require-admin: Missing SUPABASE_SERVICE_ROLE_KEY'));
    return {
      ok: false,
      status: 500,
      code: 'config_missing',
      error: 'Server configuration incomplete'
    };
  }

  const supabase = createClient(
    process.env.SUPABASE_URL,
    serviceRoleKey,
    { auth: { persistSession: false } }
  );

  const envAllowList = parseAllowlist();
  const envAllow = envAllowList.has(requesterEmail);

  let dbAllow = false;
  try {
    const { data, error } = await supabase
      .from('admin_emails')
      .select('email')
      .eq('email', requesterEmail)
      .maybeSingle();
    if (error) throw error;
    dbAllow = Boolean(data);
  } catch (error) {
    console.warn(withTimestamp(`require-admin: admin_emails lookup failed (${error.message})`));
  }

  let profileAdmin = false;
  try {
    const { data, error } = await supabase
      .from('profiles')
      .select('is_admin')
      .eq('id', authResult.requesterId)
      .maybeSingle();
    if (error) throw error;
    profileAdmin = Boolean(data?.is_admin);
  } catch (error) {
    console.warn(withTimestamp(`require-admin: profiles lookup failed (${error.message})`));
  }

  const isAdmin = envAllow || dbAllow || profileAdmin;

  if (!isAdmin) {
    console.warn(withTimestamp(`require-admin: Access denied for ${requesterEmail}`));
    return {
      ok: false,
      status: 403,
      code: 'admin_required',
      error: 'Admin access required'
    };
  }

  console.log(withTimestamp(`require-admin: Access granted for ${requesterEmail}`));

  return {
    ok: true,
    requesterEmail,
    requesterId: authResult.requesterId,
    supabase
  };
}

export { corsHeaders, json };