// netlify/functions/admin-access-update.mjs - Update admin access
import { requireAdmin, json, corsHeaders } from '../lib/require-admin.mjs';

const withTimestamp = (message) => `[${new Date().toISOString()}] ${message}`;

export async function handler(event) {
  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers: corsHeaders };
  }

  if (event.httpMethod !== 'POST') {
    return json(405, { ok: false, error: 'Method not allowed' });
  }

  console.log(withTimestamp('=== ADMIN-ACCESS-UPDATE START ==='));

  const gate = await requireAdmin(event);
  if (!gate.ok) {
    const status = gate.status ?? 401;
    const code = gate.code ?? 'admin_required';
    const error = gate.error ?? 'Admin access required';
    console.warn(withTimestamp(`ADMIN-ACCESS-UPDATE denied: ${code}`));
    return json(status, { ok: false, code, error });
  }

  const { supabase } = gate;

  let body;
  try {
    body = JSON.parse(event.body || '{}');
  } catch {
    return json(400, { ok: false, error: 'Invalid JSON body', code: 'bad_json' });
  }

  const { email, op } = body;

  if (!email || typeof email !== 'string') {
    return json(400, { ok: false, error: 'email is required', code: 'missing_email' });
  }

  if (!op || !['add', 'remove', 'promote', 'demote'].includes(op)) {
    return json(400, { ok: false, error: 'op must be add|remove|promote|demote', code: 'invalid_op' });
  }

  const normalizedEmail = email.toLowerCase().trim();

  try {
    let result;

    switch (op) {
      case 'add': {
        // Add to admin_emails table
        const { error: insertError } = await supabase
          .from('admin_emails')
          .upsert({ email: normalizedEmail }, { onConflict: 'email' });
        
        if (insertError) throw insertError;
        result = { message: `Added ${normalizedEmail} to admin_emails` };
        break;
      }

      case 'remove': {
        // Remove from admin_emails table
        const { error: deleteError } = await supabase
          .from('admin_emails')
          .delete()
          .eq('email', normalizedEmail);
        
        if (deleteError) throw deleteError;
        result = { message: `Removed ${normalizedEmail} from admin_emails` };
        break;
      }

      case 'promote': {
        // Set is_admin=true on profiles
        const { error: updateError } = await supabase
          .from('profiles')
          .update({ is_admin: true })
          .eq('email', normalizedEmail);
        
        if (updateError) throw updateError;
        result = { message: `Promoted ${normalizedEmail} to admin in profiles` };
        break;
      }

      case 'demote': {
        // Set is_admin=false on profiles
        const { error: updateError } = await supabase
          .from('profiles')
          .update({ is_admin: false })
          .eq('email', normalizedEmail);
        
        if (updateError) throw updateError;
        result = { message: `Demoted ${normalizedEmail} from admin in profiles` };
        break;
      }
    }

    console.log(withTimestamp(`ADMIN-ACCESS-UPDATE OK op=${op} email=${normalizedEmail}`));
    console.log(withTimestamp('=== ADMIN-ACCESS-UPDATE END ==='));

    return json(200, { ok: true, ...result });
  } catch (error) {
    console.error(withTimestamp('ADMIN-ACCESS-UPDATE ERROR'), error);
    console.log(withTimestamp('=== ADMIN-ACCESS-UPDATE END ==='));
    return json(500, {
      ok: false,
      code: 'access_update_failed',
      error: 'Failed to update admin access',
      message: error.message
    });
  }
}
