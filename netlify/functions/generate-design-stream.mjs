// netlify/functions/generate-design-stream.mjs
// Server-Sent Events (SSE) endpoint for real-time progress updates
import { requireAuth, json, corsHeaders } from '../lib/require-auth.mjs';
import { createClient } from '@supabase/supabase-js';
import OpenAI from 'openai';

/**
 * Sample curated training examples from Supabase Storage
 * Returns array of {prompt, openscad_code} examples
 */
async function sampleKnowledge(supabase, limit = 50) {
  try {
    const { data: files } = await supabase.storage
      .from('training-data')
      .list('curated', { limit: 100 });
    
    if (!files || files.length === 0) return [];
    
    const samples = [];
    const toSample = Math.min(limit, files.length);
    
    for (let i = 0; i < toSample && i < files.length; i++) {
      const file = files[i];
      if (!file.name.endsWith('.json')) continue;
      
      const { data: content } = await supabase.storage
        .from('training-data')
        .download(`curated/${file.name}`);
      
      if (content) {
        const text = await content.text();
        const example = JSON.parse(text);
        if (example.prompt && example.openscad_code) {
          samples.push(example);
        }
      }
    }
    
    return samples;
  } catch (err) {
    console.error('[SSE] Knowledge sampling failed:', err);
    return [];
  }
}

/**
 * Build system prompt with sampled examples
 */
function buildSystemPrompt(examples) {
  let prompt = `You are an expert OpenSCAD code generator. Generate clean, parametric, well-commented OpenSCAD code based on user descriptions.

Key guidelines:
- Use descriptive variable names
- Include helpful comments
- Make designs parametric where possible
- Optimize for 3D printing
- Include units in comments (mm)

`;

  if (examples.length > 0) {
    prompt += `Here are some curated examples:\n\n`;
    examples.slice(0, 10).forEach((ex, idx) => {
      prompt += `Example ${idx + 1}:\nPrompt: ${ex.prompt}\nCode:\n${ex.openscad_code}\n\n`;
    });
  }

  return prompt;
}

export async function handler(event) {
  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers: corsHeaders };
  }
  if (event.httpMethod !== 'POST') {
    return json(405, { ok: false, error: 'Method not allowed' });
  }

  const auth = await requireAuth(event);
  if (!auth.ok) {
    return json(auth.status ?? 401, { ok: false, code: 'auth_required', error: auth.error || 'Unauthorized' });
  }

  console.log('[SSE] Authenticated:', auth.requesterEmail, auth.isDev ? '(dev mode)' : '');

  // Parse request body
  let body;
  try {
    body = JSON.parse(event.body || '{}');
  } catch (err) {
    return json(400, { ok: false, error: 'Invalid JSON body' });
  }

  const { prompt: userPrompt, design_name: designName, context = [] } = body;

  if (!userPrompt || userPrompt.trim().length === 0) {
    return json(400, { ok: false, error: 'Prompt is required' });
  }

  // Create SSE stream with Response (Netlify Functions support)
  const headers = {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache',
    'Connection': 'keep-alive',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS'
  };

  // Build SSE response body
  let sseBody = '';
  const addEvent = (type, data) => {
    sseBody += `event: ${type}\ndata: ${JSON.stringify(data)}\n\n`;
  };

  try {
    // Progress 1: Auth complete (5%)
    addEvent('progress', { pct: 5, note: 'Authenticated' });

    // Initialize Supabase (skip if dev mode without real client)
    let examples = [];
    if (!auth.isDev || auth.supabase) {
      const supabase = auth.supabase || createClient(
        process.env.SUPABASE_URL,
        process.env.SUPABASE_SERVICE_ROLE_KEY
      );

      // Progress 2: Start knowledge sampling (10%)
      addEvent('progress', { pct: 10, note: 'Loading knowledge base...' });
      
      examples = await sampleKnowledge(supabase, 50);
      
      // Progress 3: Knowledge loaded (25%)
      addEvent('progress', { pct: 25, note: `Loaded ${examples.length} examples` });
    } else {
      // Dev mode: skip knowledge sampling
      addEvent('progress', { pct: 10, note: 'Loading knowledge (dev mode)...' });
      addEvent('progress', { pct: 25, note: 'Knowledge ready (dev mode)' });
    }

    // Build system prompt
    const systemPrompt = buildSystemPrompt(examples);

    // Build user message with context
    let userMessage = userPrompt;
    if (context.length > 0) {
      userMessage += `\n\nContext tags: ${context.join(', ')}`;
    }

    // Progress 4: Preparing AI model (40%)
    addEvent('progress', { pct: 40, note: 'Initializing AI model...' });

    // Initialize OpenAI
    const openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY
    });

    const modelName = process.env.OPENAI_MODEL || 'gpt-4o-mini';
    
    addEvent('progress', { pct: 50, note: `Streaming from ${modelName}...` });

    // Create streaming completion
    const completion = await openai.chat.completions.create({
      model: modelName,
      stream: true,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userMessage }
      ],
      temperature: 0.7,
      max_tokens: 2000
    });

    // Progress 5: Streaming tokens (60-90%)
    let generatedCode = '';
    let tokenCount = 0;
    let lastProgressPct = 50;

    for await (const chunk of completion) {
      const delta = chunk.choices?.[0]?.delta?.content || '';
      
      if (delta) {
        generatedCode += delta;
        tokenCount++;

        // Update progress incrementally (50 → 90)
        // Send update every ~30 tokens for more granular feedback
        if (tokenCount % 30 === 0) {
          const estimatedProgress = Math.min(90, 50 + Math.floor((tokenCount / 800) * 40));
          if (estimatedProgress > lastProgressPct) {
            addEvent('progress', { pct: estimatedProgress, note: `Generating code... (${tokenCount} tokens)` });
            lastProgressPct = estimatedProgress;
          }
        }
      }
    }

    // Progress 6: Finalizing (95%)
    addEvent('progress', { pct: 95, note: 'Finalizing design...' });

    // Progress 7: Complete (100%)
    addEvent('progress', { pct: 100, note: 'Generation complete!' });

    // Send final result
    addEvent('result', {
      ok: true,
      code: generatedCode,
      openscad_code: generatedCode,
      design_name: designName || 'Generated Design',
      tokensUsed: tokenCount,
      examplesUsed: examples.length
    });

    // Return SSE response
    return {
      statusCode: 200,
      headers,
      body: sseBody
    };

  } catch (err) {
    console.error('[SSE] Generation error:', err);
    addEvent('error', {
      ok: false,
      error: err.message || 'Generation failed'
    });
    return {
      statusCode: 200,
      headers,
      body: sseBody
    };
  }
}
