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

    // Run all queries in parallel
    const [usersRes, designsRes, feedbackRes, activeTodayUsersRes, activeTodayDesignsRes, designActivityRes, feedbackActivityRes] = await Promise.all([
      supabase.from('profiles').select('id', { count: 'exact', head: true }),
      supabase.from('ai_designs').select('id', { count: 'exact', head: true }),
      supabase.from('ai_feedback').select('id', { count: 'exact', head: true }),
      supabase
        .from('ai_designs')
        .select('user_id', { count: 'exact' })
        .gte('created_at', todayStart.toISOString()),
      supabase
        .from('ai_designs')
        .select('id', { count: 'exact', head: true })
        .gte('created_at', todayStart.toISOString()),
      supabase
        .from('ai_designs')
        .select('id, prompt, created_at, user_id, profiles:profiles(email)')
        .order('created_at', { ascending: false })
        .limit(5),
      supabase
        .from('ai_feedback')
        .select('id, feedback_text, created_at, user_id, profiles:profiles(email)')
        .order('created_at', { ascending: false })
        .limit(5)
    ]);

    if (usersRes.error) throw usersRes.error;
    if (designsRes.error) throw designsRes.error;
    if (feedbackRes.error) throw feedbackRes.error;
    if (activeTodayUsersRes.error) throw activeTodayUsersRes.error;
    if (activeTodayDesignsRes.error) throw activeTodayDesignsRes.error;
    if (designActivityRes.error) throw designActivityRes.error;
    if (feedbackActivityRes.error) throw feedbackActivityRes.error;

    // Count distinct users active today
    const distinctUserIds = new Set((activeTodayUsersRes.data || []).map(row => row.user_id));

    // Combine recent activity from designs and feedback
    const designActivities = (designActivityRes.data || []).map(row => ({
      type: 'design',
      id: row.id,
      at: row.created_at,
      by: row.profiles?.email || 'Unknown User',
      summary: (row.prompt || 'Untitled Design').substring(0, 50) + (row.prompt?.length > 50 ? '...' : '')
    }));

    const feedbackActivities = (feedbackActivityRes.data || []).map(row => ({
      type: 'feedback',
      id: row.id,
      at: row.created_at,
      by: row.profiles?.email || 'Unknown User',
      summary: (row.feedback_text || 'No feedback text').substring(0, 50) + (row.feedback_text?.length > 50 ? '...' : '')
    }));

    // Merge and sort by time
    const recentActivity = [...designActivities, ...feedbackActivities]
      .sort((a, b) => new Date(b.at) - new Date(a.at))
      .slice(0, 10);

    const response = {
      ok: true,
      totals: {
        users: usersRes.count || 0,
        designs: designsRes.count || 0,
        feedback: feedbackRes.count || 0
      },
      activeToday: {
        users: distinctUserIds.size,
        designs: activeTodayDesignsRes.count || 0
      },
      recentActivity,
      config: {
        openaiModel: process.env.OPENAI_MODEL || 'gpt-4',
        bucket: process.env.SUPABASE_STORAGE_BUCKET_TRAINING || 'training-assets'
      }
    };

    console.log(
      withTimestamp(
        `ADMIN-DASHBOARD-STATS OK totals.users=${response.totals.users} totals.designs=${response.totals.designs} totals.feedback=${response.totals.feedback} activeToday.users=${response.activeToday.users} activeToday.designs=${response.activeToday.designs} activity=${response.recentActivity.length}`
      )
    );
    console.log(withTimestamp('=== ADMIN-DASHBOARD-STATS END ==='));

    return json(200, response);
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
