// netlify/functions/admin-health.mjs
import { requireAdmin, json, corsHeaders } from '../lib/require-auth.mjs';

export async function handler(event) {
  // CORS preflight
  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers: corsHeaders };
  }
  if (event.httpMethod !== 'GET') {
    return json(405, { ok: false, error: 'Method not allowed' });
  }

  const admin = await requireAdmin(event);
  if (!admin.ok) {
    return json(admin.status ?? 401, { ok: false, code: admin.code || 'auth_required', error: admin.error || 'Unauthorized' });
  }

  return json(200, {
    ok: true,
    now: new Date().toISOString(),
    user: { email: admin.user?.email },
    isAdmin: true
  });
}