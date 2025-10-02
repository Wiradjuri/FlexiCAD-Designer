// netlify/functions/admin-health.mjs
import { requireAdmin, json, corsHeaders } from '../lib/require-auth.mjs';

export async function handler(event) {
  // CORS preflight
  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers: corsHeaders };
  }
  // Support both GET and POST (POST for passphrase verification)
  if (event.httpMethod !== 'GET' && event.httpMethod !== 'POST') {
    return json(405, { ok: false, error: 'Method not allowed' });
  }

  const admin = await requireAdmin(event);
  if (!admin.ok) {
    return json(admin.status ?? 401, { ok: false, code: admin.code || 'auth_required', error: admin.error || 'Unauthorized' });
  }

  // Optional: Check admin passphrase (second factor) if provided
  const passphrase = event.headers['x-admin-passphrase'] || event.headers['X-Admin-Passphrase'];
  const configuredPassphrase = process.env.ADMIN_PASSPHRASE;
  
  if (configuredPassphrase && passphrase) {
    // Passphrase is set and user provided one - validate it
    if (passphrase !== configuredPassphrase) {
      console.log('[admin-health] Invalid passphrase attempt for', admin.user?.email);
      return json(403, { ok: false, admin: false, error: 'Invalid passphrase' });
    }
    console.log('[admin-health] Passphrase validated for', admin.user?.email);
  }

  return json(200, {
    ok: true,
    admin: true,
    now: new Date().toISOString(),
    user: { email: admin.user?.email },
    isAdmin: true
  });
}