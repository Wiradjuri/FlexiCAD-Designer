import { requireAuth, requireAdmin, json, corsHeaders } from '../lib/require-auth.mjs';

const withTimestamp = (message) => `[${new Date().toISOString()}] ${message}`;

export async function handler(event) {
  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers: corsHeaders };
  }

  console.log(withTimestamp('=== ADMIN-LIST-USERS START ==='));

  const gate = await requireAdmin(event);
  if (!gate.ok) {
    const status = gate.status ?? 401;
    const code = gate.code ?? 'admin_required';
    const error = gate.error ?? 'Admin access required';
    console.warn(withTimestamp(`ADMIN-LIST-USERS denied: ${code}`));
    return json(status, { ok: false, code, error });
  }

  const { supabase } = gate;

  try {
    const { data, error } = await supabase
      .from('profiles')
      .select('id, email, is_admin, is_active, is_paid, subscription_plan, payment_status, created_at, updated_at')
      .order('created_at', { ascending: false });

    if (error) {
      throw error;
    }

    console.log(withTimestamp(`ADMIN-LIST-USERS found ${data?.length ?? 0} records`));
    console.log(withTimestamp('=== ADMIN-LIST-USERS END ==='));

    return json(200, {
      ok: true,
      users: data || []
    });
  } catch (error) {
    console.error(withTimestamp('ADMIN-LIST-USERS ERROR'), error);
    return json(500, {
      ok: false,
      code: 'list_users_failed',
      error: error.message || 'Failed to list users'
    });
  }
}
