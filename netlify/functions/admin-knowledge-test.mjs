// netlify/functions/admin-knowledge-test.mjs
import { requireAuth, requireAdmin, json, corsHeaders } from '../lib/require-auth.mjs';

const BUCKET = process.env.SUPABASE_STORAGE_BUCKET_TRAINING || 'training-assets';
const MAX_BYTES_PER_ASSET = 64 * 1024; // 64KB limit per JSONL
const MAX_EXAMPLES = 5;

export async function handler(event) {
  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers: corsHeaders };
  }

  const gate = await requireAdmin(event);
  if (!gate.ok) {
    return json(gate.status, { ok:false, code:'admin_required', error:'Admin access required' });
  }
  const { supabase, requesterEmail } = gate;

  let body;
  try { body = JSON.parse(event.body || '{}'); }
  catch { body = {}; }

  const { template, prompt, maxExamples } = body;
  const maxEx = Math.min(MAX_EXAMPLES, Math.max(1, parseInt(maxExamples || '3')));

  try {
    const log = [];
    const usedExamples = [];
    const assetsUsed = [];

    // 1. Load curated examples from ai_training_examples
    log.push('Loading curated examples...');
    
    let exampleQuery = supabase
      .from('ai_training_examples')
      .select('id, template, input_prompt, generated_code, tags')
      .eq('active', true)
      .order('created_at', { ascending: false })
      .limit(maxEx);

    if (template) {
      exampleQuery = exampleQuery.eq('template', template);
    }

    const { data: examples, error: exampleErr } = await exampleQuery;
    
    if (exampleErr) {
      log.push(`Error loading examples: ${exampleErr.message}`);
    } else {
      usedExamples.push(...(examples || []).map(ex => ({
        id: ex.id,
        template: ex.template || 'general',
        tags: ex.tags || []
      })));
      log.push(`Loaded ${examples?.length || 0} curated examples`);
    }

    // 2. Load training assets (JSONL files)
    log.push('Loading training assets...');
    
    const { data: assets, error: assetErr } = await supabase
      .from('training_assets')
      .select('id, object_path, asset_type, tags, filename')
      .eq('active', true)
      .eq('asset_type', 'jsonl')
      .limit(10);

    if (assetErr) {
      log.push(`Error loading assets: ${assetErr.message}`);
    } else {
      for (const asset of assets || []) {
        try {
          // Try to read a sample from each JSONL asset
          const { data: blob, error: dlErr } = await supabase.storage
            .from(BUCKET)
            .download(asset.object_path);

          if (dlErr) {
            log.push(`Could not download ${asset.object_path}: ${dlErr.message}`);
            continue;
          }

          const buf = Buffer.from(await blob.arrayBuffer());
          const head = buf.length > MAX_BYTES_PER_ASSET ? buf.subarray(0, MAX_BYTES_PER_ASSET) : buf;
          
          // Determine source from tags or path
          let source = 'admin-upload';
          if (asset.tags?.includes('origin:curated-feedback')) {
            source = 'curated-feedback';
          } else if (asset.object_path.includes('curated/') || asset.object_path.includes('global/')) {
            source = 'global-curated';
          }

          assetsUsed.push({
            object_path: asset.object_path,
            bytesUsed: head.length,
            source,
            filename: asset.filename
          });

          log.push(`Referenced asset: ${asset.filename} (${head.length} bytes, source: ${source})`);
        } catch (assetErr) {
          log.push(`Asset processing error for ${asset.object_path}: ${assetErr.message}`);
        }
      }
    }

    // 3. Calculate learning indicator
    const totalSources = usedExamples.length + assetsUsed.length;
    const uniqueSources = new Set([
      ...usedExamples.map(() => 'examples'),
      ...assetsUsed.map(a => a.source)
    ]).size;

    let learningIndicator = 'none';
    if (totalSources > 0) {
      learningIndicator = 'engaged';
    }
    if (totalSources > 2 && uniqueSources > 1) {
      learningIndicator = 'rich';
    }

    log.push(`Knowledge test complete: ${totalSources} total sources, ${uniqueSources} unique types`);

    // Log audit
    await supabase.from('admin_audit').insert([{
      actor_email: requesterEmail,
      action: 'admin_knowledge_test',
      details: { template, prompt: prompt?.substring(0, 100), totalSources, learningIndicator }
    }]);

    console.log(`[admin][knowledge-test] requester=${requesterEmail} sources=${totalSources} indicator=${learningIndicator}`);

    return json(200, {
      ok: true,
      model: process.env.OPENAI_MODEL || 'gpt-4o-mini',
      used_examples: usedExamples,
      assets_used: assetsUsed,
      log,
      learningIndicator
    });

  } catch (error) {
    console.error('❌ [admin-knowledge-test] Error:', error);
    return json(500, { ok:false, code:'internal_error', error: error.message });
  }
}