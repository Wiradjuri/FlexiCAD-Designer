// netlify/functions/admin-payments-overview.mjs - Payment system overview
import { requireAuth, requireAdmin, json, corsHeaders } from '../lib/require-auth.mjs';

const withTimestamp = (message) => `[${new Date().toISOString()}] ${message}`;

export async function handler(event) {
  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers: corsHeaders };
  }

  if (event.httpMethod !== 'GET') {
    return json(405, { ok: false, error: 'Method not allowed' });
  }

  console.log(withTimestamp('=== ADMIN-PAYMENTS-OVERVIEW START ==='));

  const gate = await requireAdmin(event);
  if (!gate.ok) {
    const status = gate.status ?? 401;
    const code = gate.code ?? 'admin_required';
    const error = gate.error ?? 'Admin access required';
    console.warn(withTimestamp(`ADMIN-PAYMENTS-OVERVIEW denied: ${code}`));
    return json(status, { ok: false, code, error });
  }

  const { supabase } = gate;

  try {
    // Get paid users count
    const { count: paidUsersCount, error: paidError } = await supabase
      .from('profiles')
      .select('id', { count: 'exact', head: true })
      .eq('is_paid', true);

    if (paidError) throw paidError;

    // Get total users count
    const { count: totalUsersCount, error: totalError } = await supabase
      .from('profiles')
      .select('id', { count: 'exact', head: true });

    if (totalError) throw totalError;

    // Get recent webhook events
    const { data: webhookData, error: webhookError } = await supabase
      .from('webhook_events')
      .select('id, event_type, created_at, payload')
      .order('created_at', { ascending: false })
      .limit(25);

    if (webhookError) throw webhookError;

    // Get last webhook time
    const lastWebhookTime = webhookData && webhookData.length > 0 
      ? webhookData[0].created_at 
      : null;

    // Parse plan distribution from webhook events
    const planCounts = { basic: 0, pro: 0, enterprise: 0, unknown: 0 };
    (webhookData || []).forEach(event => {
      try {
        const payload = typeof event.payload === 'string' 
          ? JSON.parse(event.payload) 
          : event.payload;
        const planName = payload?.data?.object?.items?.data?.[0]?.price?.nickname?.toLowerCase() || 'unknown';
        if (planCounts[planName] !== undefined) {
          planCounts[planName]++;
        } else {
          planCounts.unknown++;
        }
      } catch {
        planCounts.unknown++;
      }
    });

    const response = {
      ok: true,
      summary: {
        totalUsers: totalUsersCount || 0,
        paidUsers: paidUsersCount || 0,
        freeUsers: (totalUsersCount || 0) - (paidUsersCount || 0),
        lastWebhookTime
      },
      planDistribution: planCounts,
      recentWebhooks: (webhookData || []).map(event => ({
        id: event.id,
        type: event.event_type,
        createdAt: event.created_at
      }))
    };

    console.log(
      withTimestamp(
        `ADMIN-PAYMENTS-OVERVIEW OK totalUsers=${response.summary.totalUsers} paidUsers=${response.summary.paidUsers} webhooks=${response.recentWebhooks.length}`
      )
    );
    console.log(withTimestamp('=== ADMIN-PAYMENTS-OVERVIEW END ==='));

    return json(200, response);
  } catch (error) {
    console.error(withTimestamp('ADMIN-PAYMENTS-OVERVIEW ERROR'), error);
    console.log(withTimestamp('=== ADMIN-PAYMENTS-OVERVIEW END ==='));
    return json(500, {
      ok: false,
      code: 'payments_overview_failed',
      error: 'Failed to retrieve payments overview',
      message: error.message
    });
  }
}
