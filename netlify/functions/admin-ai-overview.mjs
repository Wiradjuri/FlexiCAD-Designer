// netlify/functions/admin-ai-overview.mjs - AI system overview
import { requireAuth, requireAdmin, json, corsHeaders } from '../lib/require-auth.mjs';

const withTimestamp = (message) => `[${new Date().toISOString()}] ${message}`;
const CURATED_GLOBAL_PATH = 'curated/global.jsonl';

export async function handler(event) {
  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers: corsHeaders };
  }

  if (event.httpMethod !== 'GET') {
    return json(405, { ok: false, error: 'Method not allowed' });
  }

  console.log(withTimestamp('=== ADMIN-AI-OVERVIEW START ==='));

  const gate = await requireAdmin(event);
  if (!gate.ok) {
    const status = gate.status ?? 401;
    const code = gate.code ?? 'admin_required';
    const error = gate.error ?? 'Admin access required';
    console.warn(withTimestamp(`ADMIN-AI-OVERVIEW denied: ${code}`));
    return json(status, { ok: false, code, error });
  }

  const { supabase } = gate;
  const bucket = process.env.SUPABASE_STORAGE_BUCKET_TRAINING || 'training-assets';

  try {
    // Count curated examples
    const { count: examplesCount, error: examplesError } = await supabase
      .from('ai_training_examples')
      .select('id', { count: 'exact', head: true });

    if (examplesError) throw examplesError;

    // Count training assets by type
    const { data: assetsData, error: assetsError } = await supabase
      .from('training_assets')
      .select('asset_type');

    if (assetsError) throw assetsError;

    const assetsByType = { svg: 0, scad: 0, jsonl: 0, other: 0 };
    (assetsData || []).forEach(asset => {
      const type = (asset.asset_type || 'other').toLowerCase();
      if (assetsByType[type] !== undefined) {
        assetsByType[type]++;
      } else {
        assetsByType.other++;
      }
    });

    // Check if curated global JSONL exists
    const { data: curatedFileData } = await supabase.storage
      .from(bucket)
      .list('curated', { search: 'global.jsonl' });

    const curatedExists = curatedFileData && curatedFileData.length > 0;
    if (curatedExists) {
      assetsByType.jsonl++; // Count the curated global JSONL
    }

    const response = {
      ok: true,
      model: process.env.OPENAI_MODEL || 'gpt-4',
      curatedExamples: examplesCount || 0,
      assets: {
        total: (assetsData?.length || 0) + (curatedExists ? 1 : 0),
        byType: assetsByType
      },
      bucket
    };

    console.log(
      withTimestamp(
        `ADMIN-AI-OVERVIEW OK model=${response.model} examples=${response.curatedExamples} assets=${response.assets.total}`
      )
    );
    console.log(withTimestamp('=== ADMIN-AI-OVERVIEW END ==='));

    return json(200, response);
  } catch (error) {
    console.error(withTimestamp('ADMIN-AI-OVERVIEW ERROR'), error);
    console.log(withTimestamp('=== ADMIN-AI-OVERVIEW END ==='));
    return json(500, {
      ok: false,
      code: 'ai_overview_failed',
      error: 'Failed to retrieve AI overview',
      message: error.message
    });
  }
}
