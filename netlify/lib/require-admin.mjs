import { createClient } from '@supabase/supabase-js';

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

  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!serviceRoleKey) {
    console.error(withTimestamp('require-admin: Missing SUPABASE_SERVICE_ROLE_KEY environment variable'));
    return {
      ok: false,
      status: 500,
      code: 'config_missing',
      error: 'Server configuration incomplete'
    };
  }

  const auth = event.headers?.authorization || event.headers?.Authorization;
  if (!auth?.startsWith('Bearer ')) {
    console.warn(withTimestamp('require-admin: Missing or invalid Authorization header'));
    return {
      ok: false,
      status: 401,
      code: 'unauthorized',
      error: 'Missing or invalid Authorization header'
    };
  }

  const accessToken = auth.slice('Bearer '.length).trim();

  const supabase = createClient(
    process.env.SUPABASE_URL,
    serviceRoleKey,
    { auth: { persistSession: false } }
  );

  let userRes;
  try {
    const { data, error } = await supabase.auth.getUser(accessToken);
    if (error) throw error;
    userRes = data;
  } catch (error) {
    console.warn(withTimestamp(`require-admin: Invalid session token (${error.message})`));
    return {
      ok: false,
      status: 401,
      code: 'unauthorized',
      error: 'Invalid session token'
    };
  }

  const requesterEmail = userRes?.user?.email?.toLowerCase().trim();
  if (!requesterEmail) {
    console.warn(withTimestamp('require-admin: Token resolved without email claim'));
    return {
      ok: false,
      status: 401,
      code: 'unauthorized',
      error: 'Invalid session token'
    };
  }

  console.log(withTimestamp(`require-admin: Evaluating admin access for ${requesterEmail}`));

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
      .eq('id', userRes.user.id)
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
    requesterId: userRes.user.id,
    supabase
  };
}

export { corsHeaders, json };