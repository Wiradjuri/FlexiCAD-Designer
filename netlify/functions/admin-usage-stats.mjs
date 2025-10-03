// Phase: 4.7.21+ - Admin AI usage stats (OpenAI budget tracking stub)
import { requireAdmin, json, corsHeaders } from '../lib/require-auth.mjs';

export async function handler(event) {
  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers: corsHeaders };
  }

  const gate = await requireAdmin(event);
  if (!gate.ok) {
    return json(gate.status ?? 401, { ok: false, error: gate.error || 'Unauthorized' });
  }

  try {
    // Read budget from environment (in cents)
    const dailyBudgetCents = parseInt(process.env.OPENAI_DAILY_BUDGET_CENTS || '5000', 10);
    const todaySpendCents = parseInt(process.env.OPENAI_TODAY_SPEND_CENTS || '0', 10);

    // Calculate remaining budget
    const remainingCents = Math.max(0, dailyBudgetCents - todaySpendCents);
    const remainingPct = dailyBudgetCents > 0
      ? Math.round((remainingCents / dailyBudgetCents) * 100)
      : 100;

    return json(200, {
      ok: true,
      usage: {
        todayRemainingPct: remainingPct,
        budgetToday: dailyBudgetCents / 100, // dollars
        spendToday: todaySpendCents / 100, // dollars
        remainingToday: remainingCents / 100, // dollars
        currency: 'USD',
        note: 'Stub implementation - integrate with OpenAI API for actual usage tracking'
      },
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('[admin-usage-stats] Error:', error);
    return json(500, { ok: false, error: error.message });
  }
}
