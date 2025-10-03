// Phase: 4.7.21+ - Admin billing reports (stub with summary counts)
import { requireAdmin, json, corsHeaders } from '../lib/require-auth.mjs';
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
    const supabase = createClient(
      process.env.SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY
    );

    // Get active subscriptions
    const { count: activeSubs, error: subsError } = await supabase
      .from('user_subscriptions')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'active');

    if (subsError) {
      console.error('[admin-billing] Error fetching subscriptions:', subsError);
    }

    // Calculate period dates (current month)
    const now = new Date();
    const periodStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const periodEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0);

    // Stub calculations (in production, you'd query actual payment data)
    const averageMonthlyPrice = 29.99; // Base monthly plan price
    const mrr = (activeSubs || 0) * averageMonthlyPrice;
    const arr = mrr * 12;

    // Churn rate stub (would need historical data)
    const churnRate = 5.2; // 5.2% monthly churn

    return json(200, {
      ok: true,
      report: {
        mrr: Math.round(mrr * 100) / 100,
        arr: Math.round(arr * 100) / 100,
        activeSubs: activeSubs || 0,
        churnRate: churnRate,
        periodStart: periodStart.toISOString(),
        periodEnd: periodEnd.toISOString(),
        note: 'Stub implementation - integrate with Stripe for actual billing data'
      },
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('[admin-billing] Error:', error);
    return json(500, { ok: false, error: error.message });
  }
}
