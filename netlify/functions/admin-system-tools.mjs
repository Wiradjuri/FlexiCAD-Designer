// netlify/functions/admin-system-tools.mjs - System tools and maintenance
import { requireAdmin, json, corsHeaders } from '../lib/require-admin.mjs';

const withTimestamp = (message) => `[${new Date().toISOString()}] ${message}`;

export async function handler(event) {
  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers: corsHeaders };
  }

  if (event.httpMethod !== 'POST') {
    return json(405, { ok: false, error: 'Method not allowed' });
  }

  console.log(withTimestamp('=== ADMIN-SYSTEM-TOOLS START ==='));

  const gate = await requireAdmin(event);
  if (!gate.ok) {
    const status = gate.status ?? 401;
    const code = gate.code ?? 'admin_required';
    const error = gate.error ?? 'Admin access required';
    console.warn(withTimestamp(`ADMIN-SYSTEM-TOOLS denied: ${code}`));
    return json(status, { ok: false, code, error });
  }

  const { supabase } = gate;

  let body;
  try {
    body = JSON.parse(event.body || '{}');
  } catch {
    return json(400, { ok: false, error: 'Invalid JSON body', code: 'bad_json' });
  }

  const { op } = body;

  if (!op || typeof op !== 'string') {
    return json(400, { ok: false, error: 'op is required', code: 'missing_op' });
  }

  try {
    let result;

    switch (op) {
      case 'flush-cache': {
        // Placeholder for cache flush - no destructive ops per spec
        result = {
          operation: 'flush-cache',
          message: 'Cache flush requested (no-op in current implementation)',
          timestamp: new Date().toISOString()
        };
        break;
      }

      case 'recompute-tags': {
        // Scan training_assets and ai_training_examples for tag statistics
        const { data: assetsData, error: assetsError } = await supabase
          .from('training_assets')
          .select('tags');

        if (assetsError) throw assetsError;

        const { data: examplesData, error: examplesError } = await supabase
          .from('ai_training_examples')
          .select('tags');

        if (examplesError) throw examplesError;

        // Build tag histogram
        const tagCounts = {};
        const processTags = (tags) => {
          if (Array.isArray(tags)) {
            tags.forEach(tag => {
              const normalized = String(tag).toLowerCase().trim();
              if (normalized) {
                tagCounts[normalized] = (tagCounts[normalized] || 0) + 1;
              }
            });
          }
        };

        (assetsData || []).forEach(row => processTags(row.tags));
        (examplesData || []).forEach(row => processTags(row.tags));

        // Sort by count descending
        const sortedTags = Object.entries(tagCounts)
          .sort((a, b) => b[1] - a[1])
          .map(([tag, count]) => ({ tag, count }));

        result = {
          operation: 'recompute-tags',
          totalAssets: (assetsData?.length || 0),
          totalExamples: (examplesData?.length || 0),
          uniqueTags: sortedTags.length,
          tagHistogram: sortedTags,
          timestamp: new Date().toISOString()
        };
        break;
      }

      default:
        return json(400, { ok: false, error: `Unknown operation: ${op}`, code: 'unknown_op' });
    }

    console.log(withTimestamp(`ADMIN-SYSTEM-TOOLS OK op=${op}`));
    console.log(withTimestamp('=== ADMIN-SYSTEM-TOOLS END ==='));

    return json(200, { ok: true, ...result });
  } catch (error) {
    console.error(withTimestamp('ADMIN-SYSTEM-TOOLS ERROR'), error);
    console.log(withTimestamp('=== ADMIN-SYSTEM-TOOLS END ==='));
    return json(500, {
      ok: false,
      code: 'system_tools_failed',
      error: 'System tool operation failed',
      message: error.message
    });
  }
}
