// netlify/functions/admin-access-list.mjs - List admin accounts
import { requireAuth, requireAdmin, json, corsHeaders } from '../lib/require-auth.mjs';

const withTimestamp = (message) => `[${new Date().toISOString()}] ${message}`;

export async function handler(event) {
  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers: corsHeaders };
  }

  if (event.httpMethod !== 'GET') {
    return json(405, { ok: false, error: 'Method not allowed' });
  }

  console.log(withTimestamp('=== ADMIN-ACCESS-LIST START ==='));

  const gate = await requireAdmin(event);
  if (!gate.ok) {
    const status = gate.status ?? 401;
    const code = gate.code ?? 'admin_required';
    const error = gate.error ?? 'Admin access required';
    console.warn(withTimestamp(`ADMIN-ACCESS-LIST denied: ${code}`));
    return json(status, { ok: false, code, error });
  }

  const { supabase } = gate;

  try {
    // Fetch from admin_emails table
    const { data: adminEmailsData, error: adminEmailsError } = await supabase
      .from('admin_emails')
      .select('email, created_at')
      .order('created_at', { ascending: false });

    if (adminEmailsError) throw adminEmailsError;

    // Fetch profiles with is_admin=true
    const { data: adminProfilesData, error: adminProfilesError } = await supabase
      .from('profiles')
      .select('id, email, is_admin, created_at, is_paid')
      .eq('is_admin', true)
      .order('created_at', { ascending: false });

    if (adminProfilesError) throw adminProfilesError;

    const response = {
      ok: true,
      adminsFromTable: (adminEmailsData || []).map(row => ({
        email: row.email,
        addedAt: row.created_at
      })),
      adminsFromProfiles: (adminProfilesData || []).map(row => ({
        id: row.id,
        email: row.email,
        isAdmin: row.is_admin,
        isPaid: row.is_paid,
        createdAt: row.created_at
      }))
    };

    console.log(
      withTimestamp(
        `ADMIN-ACCESS-LIST OK tableCount=${response.adminsFromTable.length} profileCount=${response.adminsFromProfiles.length}`
      )
    );
    console.log(withTimestamp('=== ADMIN-ACCESS-LIST END ==='));

    return json(200, response);
  } catch (error) {
    console.error(withTimestamp('ADMIN-ACCESS-LIST ERROR'), error);
    console.log(withTimestamp('=== ADMIN-ACCESS-LIST END ==='));
    return json(500, {
      ok: false,
      code: 'access_list_failed',
      error: 'Failed to retrieve admin access list',
      message: error.message
    });
  }
}
