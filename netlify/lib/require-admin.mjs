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
  const set = new Set(raw.map(s => (s || '').toLowerCase().trim()).filter(Boolean));
  return set;
}

export async function requireAdmin(event) {
  console.log('🔐 [require-admin] Checking admin access...');
  
  const auth = event.headers?.authorization || event.headers?.Authorization;
  if (!auth?.startsWith('Bearer ')) {
    console.warn('🚫 [require-admin] Missing or invalid Authorization header');
    return { 
      ok: false, 
      status: 401, 
      code: 'unauthorized', 
      error: 'Missing or invalid Authorization header' 
    };
  }
  
  const accessToken = auth.slice('Bearer '.length);

  const supabase = createClient(
    process.env.SUPABASE_URL, 
    process.env.SUPABASE_SERVICE_ROLE_KEY, 
    { auth: { persistSession: false } }
  );

  const { data: userRes, error: userErr } = await supabase.auth.getUser(accessToken);
  if (userErr || !userRes?.user?.email) {
    console.warn('🚫 [require-admin] Invalid session token:', userErr?.message || 'No user email');
    return { 
      ok: false, 
      status: 401, 
      code: 'unauthorized', 
      error: 'Invalid session token' 
    };
  }
  
  const requesterEmail = userRes.user.email.toLowerCase().trim();
  console.log('👤 [require-admin] Checking access for:', requesterEmail);

  // Check environment allow-list
  const allow = parseAllowlist();
  const envAllow = allow.has(requesterEmail);
  console.log('📝 [require-admin] Environment allow-list check:', { 
    envAllow, 
    allowList: Array.from(allow) 
  });

  // Check database allow-list
  let dbAllow = false;
  try {
    const { data: row, error: dbError } = await supabase
      .from('admin_emails')
      .select('email')
      .eq('email', requesterEmail)
      .maybeSingle();
    
    dbAllow = !!row;
    console.log('🗄️ [require-admin] Database allow-list check:', { dbAllow, dbError: dbError?.message });
  } catch (dbErr) {
    console.warn('⚠️ [require-admin] Database check failed:', dbErr.message);
    dbAllow = false;
  }

  if (!envAllow && !dbAllow) {
    console.warn('🚫 [require-admin] Access denied:', { 
      requesterEmail, 
      envAllow, 
      dbAllow,
      envList: Array.from(allow)
    });
    return { 
      ok: false, 
      status: 403, 
      code: 'admin_required', 
      error: 'Admin access required', 
      context: { requesterEmail, envAllow, dbAllow } 
    };
  }

  console.log('✅ [require-admin] Access granted:', { 
    requesterEmail, 
    envAllow, 
    dbAllow 
  });
  
  return { ok: true, requesterEmail, supabase };
}

export { corsHeaders, json };