// Phase: 4.7.21 - Admin promo code management
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
        const { data, error } = await supabase
          .from('promo_codes')
          .select('*')
          .order('created_at', { ascending: false });

        if (error) {
          console.error('[admin-promos] List error:', error);
          return json(500, { ok: false, error: error.message });
        }

        return json(200, {
          ok: true,
          codes: data || []
        });
      }

      case 'add': {
        const { code, percent_off, expires_at } = body;
        if (!code || !percent_off) {
          return json(400, { ok: false, error: 'code and percent_off required' });
        }

        const { data, error } = await supabase
          .from('promo_codes')
          .insert({
            code: code.toUpperCase(),
            percent_off: parseInt(percent_off, 10),
            expires_at: expires_at || null,
            is_active: true,
            created_by: gate.user?.email
          })
          .select()
          .single();

        if (error) {
          console.error('[admin-promos] Add error:', error);
          return json(500, { ok: false, error: error.message });
        }

        return json(200, {
          ok: true,
          code: data,
          message: 'Promo code created successfully'
        });
      }

      case 'remove': {
        const code = body.code || params.get('code');
        if (!code) {
          return json(400, { ok: false, error: 'Code required' });
        }

        const { error } = await supabase
          .from('promo_codes')
          .update({ is_active: false })
          .eq('code', code.toUpperCase());

        if (error) {
          console.error('[admin-promos] Remove error:', error);
          return json(500, { ok: false, error: error.message });
        }

        return json(200, {
          ok: true,
          message: `Promo code ${code} deactivated`
        });
      }

      default:
        return json(400, { ok: false, error: `Unknown operation: ${op}` });
    }

  } catch (error) {
    console.error('[admin-promos] Error:', error);
    return json(500, { ok: false, error: error.message });
  }
}
