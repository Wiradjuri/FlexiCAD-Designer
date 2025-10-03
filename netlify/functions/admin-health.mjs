// netlify/functions/admin-health.mjs
// Phase: 4.7.18 - Protect admin-health with requireAdmin
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

  const gate = await requireAdmin(event);
  if (!gate.ok) {
    return json(gate.status ?? 401, gate.body || { ok: false, code: gate.code || 'auth_required', error: gate.error || 'Unauthorized' });
  }

  // Optional: Check admin passphrase (second factor) if provided
  const passphrase = event.headers['x-admin-passphrase'] || event.headers['X-Admin-Passphrase'];
  const configuredPassphrase = process.env.ADMIN_PASSPHRASE;
  
  if (configuredPassphrase && passphrase) {
    // Passphrase is set and user provided one - validate it
    if (passphrase !== configuredPassphrase) {
      console.log('[admin-health] Invalid passphrase attempt for', gate.user?.email);
      return json(403, { ok: false, admin: false, error: 'Invalid passphrase' });
    }
    console.log('[admin-health] Passphrase validated for', gate.user?.email);
  }

  return json(200, {
    ok: true,
    admin: true,
    now: new Date().toISOString(),
    user: { email: gate.user?.email },
    isAdmin: true
  });
}