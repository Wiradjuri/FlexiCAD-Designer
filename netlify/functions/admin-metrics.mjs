// Phase: 4.7.21 - Admin dashboard metrics (totalSubscribers, activeToday, totalDesigns)
import { requireAdmin, json, corsHeaders } from '../lib/require-auth.mjs';
import { getAdminClient } from './lib/supabase-admin.mjs';

export async function handler(event) {
  // CORS preflight
  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers: corsHeaders };
  }

  // Admin gate
  const gate = await requireAdmin(event);
  if (!gate.ok) {
    return json(gate.status ?? 401, { ok: false, error: gate.error || 'Unauthorized' });
  }

  try {
    // Initialize Supabase with service role for admin queries
    const supabase = getAdminClient();

    // Total Subscribers (active paid subscriptions)
    const { count: totalSubscribers, error: subsError } = await supabase
      .from('user_subscriptions')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'active');

    if (subsError) {
      console.error('[admin-metrics] Error fetching subscriptions:', subsError);
    }

    // Active Today (distinct users who saved designs today)
    const todayStart = new Date();
    todayStart.setUTCHours(0, 0, 0, 0);
    const todayEnd = new Date();
    todayEnd.setUTCHours(23, 59, 59, 999);

    const { data: activeUsers, error: activeError } = await supabase
      .from('user_designs')
      .select('user_id')
      .gte('created_at', todayStart.toISOString())
      .lte('created_at', todayEnd.toISOString());

    if (activeError) {
      console.error('[admin-metrics] Error fetching active users:', activeError);
    }

    const uniqueActiveUsers = activeUsers ? new Set(activeUsers.map(d => d.user_id)).size : 0;

    // Total Designs (AI-generated designs overall)
    const { count: totalDesigns, error: designsError } = await supabase
      .from('user_designs')
      .select('*', { count: 'exact', head: true })
      .or('source.eq.ai,source.eq.ai_generated,source.is.null'); // null for legacy designs

    if (designsError) {
      console.error('[admin-metrics] Error fetching designs:', designsError);
    }

    console.log(`[admin-metrics] Retrieved metrics: subs=${totalSubscribers}, active=${uniqueActiveUsers}, designs=${totalDesigns}`);

    return json(200, {
      ok: true,
      totals: {
        totalSubscribers: totalSubscribers || 0,
        activeToday: uniqueActiveUsers,
        totalDesigns: totalDesigns || 0
      },
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('[admin-metrics] Unexpected error:', error);
    return json(500, {
      ok: false,
      error: error.message || 'Internal server error'
    });
  }
}
