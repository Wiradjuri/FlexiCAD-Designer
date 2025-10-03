// Phase: 4.7.21 - Admin learning data with age score
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

    // Try to fetch from knowledge_sources table
    const { data, error } = await supabase
      .from('knowledge_sources')
      .select('*')
      .order('added_at', { ascending: false });

    if (error && error.code !== '42P01') {
      console.error('[admin-learning] Error:', error);
      return json(500, { ok: false, error: error.message });
    }

    // Calculate age score for each source (0-100 years metaphor)
    const now = new Date();
    const sources = (data || []).map(source => {
      const addedAt = new Date(source.added_at || source.created_at);
      const ageMs = now - addedAt;
      const ageDays = ageMs / (1000 * 60 * 60 * 24);
      
      // Map age to 0-100 year scale (365 days = 100 years in metaphor)
      const ageScoreYears = Math.min(100, Math.round((ageDays / 365) * 100));

      return {
        id: source.id,
        name: source.name || source.title,
        type: source.type || 'document',
        addedAt: source.added_at || source.created_at,
        ageScoreYears,
        status: source.status || 'active'
      };
    });

    // If no sources found, return stub
    if (!data || data.length === 0) {
      return json(200, {
        ok: true,
        sources: [
          {
            id: 'stub-1',
            name: 'OpenSCAD Core Documentation',
            type: 'documentation',
            addedAt: new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString(),
            ageScoreYears: 25,
            status: 'active'
          }
        ],
        note: 'Stub data - knowledge_sources table pending'
      });
    }

    return json(200, {
      ok: true,
      sources,
      count: sources.length
    });

  } catch (error) {
    console.error('[admin-learning] Error:', error);
    return json(500, { ok: false, error: error.message });
  }
}
