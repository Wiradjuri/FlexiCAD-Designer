import { requireAdmin, json, corsHeaders } from '../lib/require-admin.mjs';

const withTimestamp = (message) => `[${new Date().toISOString()}] ${message}`;

export async function handler(event) {
  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers: corsHeaders };
  }

  console.log(withTimestamp('=== ADMIN-DASHBOARD-STATS START ==='));

  const gate = await requireAdmin(event);
  if (!gate.ok) {
    const status = gate.status ?? 401;
    const code = gate.code ?? 'admin_required';
    const error = gate.error ?? 'Admin access required';
    console.warn(withTimestamp(`ADMIN-DASHBOARD-STATS denied: ${code}`));
    return json(status, { ok: false, code, error });
  }

  const { supabase } = gate;

  try {
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);

    const [usersRes, activeRes, designsRes, activityRes] = await Promise.all([
      supabase.from('profiles').select('id', { count: 'exact', head: true }),
      supabase
        .from('profiles')
        .select('id', { count: 'exact', head: true })
        .gte('updated_at', todayStart.toISOString()),
      supabase.from('saved_designs').select('id', { count: 'exact', head: true }),
      supabase
        .from('saved_designs')
        .select(
          `id, design_name, created_at, user_id, profiles:profiles(email)`
        )
        .order('created_at', { ascending: false })
        .limit(10)
    ]);

    if (usersRes.error) throw usersRes.error;
    if (activeRes.error) throw activeRes.error;
    if (designsRes.error) throw designsRes.error;
    if (activityRes.error) throw activityRes.error;

    const stats = {
      totalUsers: usersRes.count || 0,
      activeToday: activeRes.count || 0,
      totalDesigns: designsRes.count || 0,
      recentActivity: (activityRes.data || []).map((row) => ({
        id: row.id,
        name: row.design_name || 'Untitled Design',
        email: row.profiles?.email || 'Unknown User',
        created: row.created_at,
        userId: row.user_id
      }))
    };

    console.log(
      withTimestamp(
        `ADMIN-DASHBOARD-STATS OK totals=${stats.totalUsers} active=${stats.activeToday} designs=${stats.totalDesigns} activity=${stats.recentActivity.length}`
      )
    );
    console.log(withTimestamp('=== ADMIN-DASHBOARD-STATS END ==='));

    return json(200, { ok: true, stats });
  } catch (error) {
    console.error(withTimestamp('ADMIN-DASHBOARD-STATS ERROR'), error);
    console.log(withTimestamp('=== ADMIN-DASHBOARD-STATS END ==='));
    return json(500, {
      ok: false,
      code: 'dashboard_stats_failed',
      error: 'Failed to retrieve dashboard stats',
      message: error.message
    });
  }
}
