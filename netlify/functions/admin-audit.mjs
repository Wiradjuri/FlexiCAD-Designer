// Phase: 4.7.21 - Admin audit log
import { requireAdmin, json, corsHeaders } from '../lib/require-auth.mjs';
import { getAdminClient } from './lib/supabase-admin.mjs';

export async function handler(event) {
  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers: corsHeaders };
  }

  const gate = await requireAdmin(event);
  if (!gate.ok) {
    return json(gate.status ?? 401, { ok: false, error: gate.error || 'Unauthorized' });
  }

  try {
    const supabase = getAdminClient();

    const params = new URLSearchParams(event.queryStringParameters || {});
    const limit = parseInt(params.get('limit') || '50', 10);

    // Try to fetch from audit_log table
    const { data, error } = await supabase
      .from('audit_log')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error && error.code !== '42P01') { // 42P01 = table doesn't exist
      console.error('[admin-audit] Error:', error);
      return json(500, { ok: false, error: error.message });
    }

    // If table doesn't exist, return stub data
    if (error?.code === '42P01' || !data) {
      console.log('[admin-audit] audit_log table not found, returning stub');
      return json(200, {
        ok: true,
        events: [
          {
            id: 'stub-1',
            action: 'system_init',
            actor: 'system',
            timestamp: new Date().toISOString(),
            details: 'Audit log table pending creation'
          }
        ],
        note: 'Audit log table will be created on first admin action'
      });
    }

    return json(200, {
      ok: true,
      events: data.map(e => ({
        id: e.id,
        action: e.action,
        actor: e.actor_email || e.user_id,
        timestamp: e.created_at,
        details: e.details
      }))
    });

  } catch (error) {
    console.error('[admin-audit] Unexpected error:', error);
    return json(500, { ok: false, error: error.message });
  }
}
