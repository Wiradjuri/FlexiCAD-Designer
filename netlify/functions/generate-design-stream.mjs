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
  // Handle OPTIONS for CORS
  if (event.httpMethod === 'OPTIONS') {
    return {
      statusCode: 200,
      headers: corsHeaders
    };
  }

  if (event.httpMethod !== 'POST') {
    return json(405, { ok: false, error: 'Method not allowed' });
  }

  // Authenticate user
  const auth = await requireAuth(event);
  if (!auth.ok) {
    return json(auth.status, { ok: false, error: auth.error });
  }

  // Parse request body
  let body;
  try {
    body = JSON.parse(event.body || '{}');
  } catch (err) {
    return json(400, { ok: false, error: 'Invalid JSON body' });
  }

  const { prompt: userPrompt, designName, context = [] } = body;

  if (!userPrompt || userPrompt.trim().length === 0) {
    return json(400, { ok: false, error: 'Prompt is required' });
  }

  // Create SSE stream
  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    async start(controller) {
      const send = (type, data) => {
        const payload = JSON.stringify(data);
        controller.enqueue(encoder.encode(`event: ${type}\ndata: ${payload}\n\n`));
      };

      const flush = () => {
        controller.enqueue(encoder.encode(': keepalive\n\n'));
      };

      try {
        // Progress 1: Auth complete
        send('progress', { pct: 10, note: 'Authenticated' });

        // Initialize Supabase
        const supabase = createClient(
          process.env.SUPABASE_URL,
          process.env.SUPABASE_SERVICE_ROLE_KEY
        );

        // Progress 2: Start knowledge sampling
        send('progress', { pct: 20, note: 'Sampling knowledge base...' });
        
        const examples = await sampleKnowledge(supabase, 50);
        
        send('progress', { pct: 40, note: `Loaded ${examples.length} examples` });

        // Build system prompt
        const systemPrompt = buildSystemPrompt(examples);

        // Build user message with context
        let userMessage = userPrompt;
        if (context.length > 0) {
          userMessage += `\n\nContext tags: ${context.join(', ')}`;
        }

        // Progress 3: Preparing AI model
        send('progress', { pct: 50, note: 'Initializing AI model...' });

        // Initialize OpenAI
        const openai = new OpenAI({
          apiKey: process.env.OPENAI_API_KEY
        });

        const modelName = process.env.OPENAI_MODEL || 'gpt-4o-mini';
        
        send('progress', { pct: 60, note: `Streaming from ${modelName}...` });

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

        // Progress 4: Streaming tokens
        let generatedCode = '';
        let tokenCount = 0;

        for await (const chunk of completion) {
          const delta = chunk.choices?.[0]?.delta?.content || '';
          
          if (delta) {
            generatedCode += delta;
            tokenCount++;

            // Update progress based on estimated completion
            // Assuming ~1500 tokens total, map to 60-95%
            const estimatedProgress = Math.min(95, 60 + Math.floor((tokenCount / 1500) * 35));
            send('progress', { pct: estimatedProgress, note: 'Generating code...' });
          }

          // Send keepalive every few chunks
          if (tokenCount % 10 === 0) {
            flush();
          }
        }

        // Progress 5: Complete
        send('progress', { pct: 100, note: 'Generation complete!' });

        // Send final result
        send('result', {
          ok: true,
          code: generatedCode,
          openscad_code: generatedCode,
          designName: designName || 'Generated Design',
          tokensUsed: tokenCount,
          examplesUsed: examples.length
        });

        // Close stream
        controller.close();

      } catch (err) {
        console.error('[SSE] Stream error:', err);
        send('error', {
          ok: false,
          error: err.message || 'Generation failed'
        });
        controller.close();
      }
    }
  });

  // Return SSE response
  return new Response(stream, {
    status: 200,
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
      ...corsHeaders
    }
  });
}
