// Phase: 4.7.21+ - Admin permissions management
import { requireAdmin, json, corsHeaders, isAdminEmail } from '../lib/require-auth.mjs';
import { createClient } from '@supabase/supabase-js';

export async function handler(event) {
  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers: corsHeaders };
  }

  const gate = await requireAdmin(event);
  if (!gate.ok) {
    return json(gate.status ?? 401, { ok: false, error: gate.error || 'Unauthorized' });
  }

  try {
    const params = new URLSearchParams(event.queryStringParameters || {});
    let body = {};
    if (event.body) {
      try {
        body = JSON.parse(event.body);
      } catch (e) {
        return json(400, { ok: false, error: 'Invalid JSON' });
      }
    }

    const op = params.get('op') || body.op || 'list';

    switch (op) {
      case 'list': {
        const email = params.get('email') || body.email;
        if (!email) {
          // Return admin emails from env
          const adminEmails = (process.env.ADMIN_EMAILS || '').split(/[,;\s]+/).filter(Boolean);
          return json(200, {
            ok: true,
            permissions: adminEmails.map(e => ({
              email: e,
              role: 'admin',
              source: 'ADMIN_EMAILS env'
            }))
          });
        }

        // Check if specific user is admin
        return json(200, {
          ok: true,
          email,
          isAdmin: isAdminEmail(email),
          roles: isAdminEmail(email) ? ['admin'] : ['user']
        });
      }

      case 'toggle': {
        const email = params.get('email') || body.email;
        if (!email) {
          return json(400, { ok: false, error: 'Email required' });
        }

        // Note: Actual toggling would require updating ADMIN_EMAILS env variable
        // which is not directly possible from serverless functions
        // This is a stub that returns current status
        return json(200, {
          ok: true,
          message: 'Admin role managed via ADMIN_EMAILS environment variable',
          currentStatus: isAdminEmail(email),
          note: 'Update ADMIN_EMAILS env to modify admin access'
        });
      }

      default:
        return json(400, { ok: false, error: `Unknown operation: ${op}` });
    }

  } catch (error) {
    console.error('[admin-permissions] Error:', error);
    return json(500, { ok: false, error: error.message });
  }
}
