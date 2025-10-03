// Phase: 4.7.21 - Admin user management (list, resetPassword, checkPaid, block, remove)
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
    const supabase = getAdminClient();

    // Parse operation from query or body
    const params = new URLSearchParams(event.queryStringParameters || {});
    const op = params.get('op') || 'list';
    
    let body = {};
    if (event.body) {
      try {
        body = JSON.parse(event.body);
      } catch (e) {
        return json(400, { ok: false, error: 'Invalid JSON body' });
      }
    }

    const operation = body.op || op;

    // Handle different operations
    switch (operation) {
      case 'list': {
        // List users with pagination
        const page = parseInt(params.get('page') || body.page || '1', 10);
        const limit = parseInt(params.get('limit') || body.limit || '50', 10);
        const offset = (page - 1) * limit;

        const { data: { users }, error } = await supabase.auth.admin.listUsers({
          page,
          perPage: limit
        });

        if (error) {
          console.error('[admin-users] List error:', error);
          return json(500, { ok: false, error: error.message });
        }

        return json(200, {
          ok: true,
          users: users.map(u => ({
            id: u.id,
            email: u.email,
            created_at: u.created_at,
            last_sign_in_at: u.last_sign_in_at,
            confirmed_at: u.confirmed_at
          })),
          page,
          limit
        });
      }

      case 'resetPassword': {
        const email = body.email || params.get('email');
        if (!email) {
          return json(400, { ok: false, error: 'Email required' });
        }

        // Trigger password reset email via Supabase
        const { error } = await supabase.auth.admin.generateLink({
          type: 'recovery',
          email: email
        });

        if (error) {
          console.error('[admin-users] Reset password error:', error);
          return json(500, { ok: false, error: error.message });
        }

        console.log(`[admin-users] Password reset link generated for ${email}`);
        return json(200, {
          ok: true,
          message: `Password reset email sent to ${email}`
        });
      }

      case 'checkPaid': {
        const userId = body.user_id || body.userId || params.get('user_id');
        if (!userId) {
          return json(400, { ok: false, error: 'user_id required' });
        }

        // Check subscription status
        const { data: sub, error } = await supabase
          .from('user_subscriptions')
          .select('*')
          .eq('user_id', userId)
          .eq('status', 'active')
          .single();

        if (error && error.code !== 'PGRST116') {
          console.error('[admin-users] Check paid error:', error);
          return json(500, { ok: false, error: error.message });
        }

        return json(200, {
          ok: true,
          hasPaid: !!sub,
          plan: sub?.plan_type || null,
          validUntil: sub?.current_period_end || null,
          status: sub?.status || 'inactive'
        });
      }

      case 'block': {
        const userId = body.user_id || body.userId || params.get('user_id');
        if (!userId) {
          return json(400, { ok: false, error: 'user_id required' });
        }

        // Update user to blocked status (using Supabase admin API)
        const { error } = await supabase.auth.admin.updateUserById(userId, {
          ban_duration: '876000h' // ~100 years = effectively permanent
        });

        if (error) {
          console.error('[admin-users] Block user error:', error);
          return json(500, { ok: false, error: error.message });
        }

        console.log(`[admin-users] User ${userId} blocked`);
        return json(200, {
          ok: true,
          message: 'User blocked successfully'
        });
      }

      case 'remove': {
        const userId = body.user_id || body.userId || params.get('user_id');
        if (!userId) {
          return json(400, { ok: false, error: 'user_id required' });
        }

        // Soft delete: mark subscription as cancelled and ban user
        const { error: subError } = await supabase
          .from('user_subscriptions')
          .update({ status: 'cancelled' })
          .eq('user_id', userId);

        if (subError) {
          console.error('[admin-users] Remove subscription error:', subError);
        }

        // Ban the user account
        const { error: banError } = await supabase.auth.admin.updateUserById(userId, {
          ban_duration: '876000h'
        });

        if (banError) {
          console.error('[admin-users] Ban user error:', banError);
          return json(500, { ok: false, error: banError.message });
        }

        console.log(`[admin-users] User ${userId} removed (soft delete)`);
        return json(200, {
          ok: true,
          message: 'User removed successfully'
        });
      }

      default:
        return json(400, { ok: false, error: `Unknown operation: ${operation}` });
    }

  } catch (error) {
    console.error('[admin-users] Unexpected error:', error);
    return json(500, {
      ok: false,
      error: error.message || 'Internal server error'
    });
  }
}
