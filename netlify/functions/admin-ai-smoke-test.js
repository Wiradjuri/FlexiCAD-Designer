const { createClient } = require('@supabase/supabase-js');
const OpenAI = require('openai');

exports.handler = async (event, context) => {
    const headers = {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization',
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
    };

    if (event.httpMethod === 'OPTIONS') {
        return { statusCode: 200, headers, body: '' };
    }

    if (event.httpMethod !== 'POST') {
        return {
            statusCode: 405,
            headers,
            body: JSON.stringify({ error: 'Method not allowed' }),
        };
    }

    try {
        // Verify admin access
        const authHeader = event.headers.authorization || event.headers.Authorization;
        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            return {
                statusCode: 401,
                headers,
                body: JSON.stringify({ error: 'Authorization required' }),
            };
        }

        const token = authHeader.substring(7);
        const supabase = createClient(
            process.env.SUPABASE_URL,
            process.env.SUPABASE_SERVICE_ROLE_KEY
        );

        const { data: { user }, error: authError } = await supabase.auth.getUser(token);
        
        if (authError || !user || user.email !== 'bmuzza1992@gmail.com') {
            return {
                statusCode: 403,
                headers,
                body: JSON.stringify({ error: 'Admin access required' }),
            };
        }

        // Configure OpenAI with token limit
        const openai = new OpenAI({
            apiKey: process.env.OPENAI_API_KEY,
        });

        const maxTokens = parseInt(process.env.OPENAI_MAX_TOKENS) || 256;
        const model = process.env.OPENAI_MODEL || 'gpt-4o-mini';

        const smokeTestPrompt = "Create a simple OpenSCAD cube with width 10mm. Keep it minimal.";
        
        const startTime = Date.now();
        
        // Make the AI call
        const completion = await openai.chat.completions.create({
            model: model,
            messages: [
                {
                    role: "system", 
                    content: "You are an OpenSCAD expert. Generate only valid OpenSCAD code."
                },
                {
                    role: "user",
                    content: smokeTestPrompt
                }
            ],
            max_tokens: maxTokens,
            temperature: 0.1
        });

        const generationTime = Date.now() - startTime;
        const generatedCode = completion.choices[0]?.message?.content || '';
        const tokensUsed = completion.usage?.total_tokens || 0;
        const outputBytes = Buffer.byteLength(generatedCode, 'utf8');

        // Validate that we got some code
        if (!generatedCode || generatedCode.length < 10) {
            throw new Error('AI generated empty or invalid response');
        }

        // Store feedback for this test generation
        const { data: feedbackRow, error: feedbackError } = await supabase
            .from('ai_learning_sessions')
            .insert({
                user_id: user.id,
                user_prompt: smokeTestPrompt,
                system_prompt: "You are an OpenSCAD expert. Generate only valid OpenSCAD code.",
                generated_code: generatedCode,
                user_feedback: 5, // Excellent for admin smoke test
                feedback_text: "Admin smoke test - automatically rated as excellent",
                design_category: "admin_test",
                complexity_level: "beginner",
                generation_time_ms: generationTime,
                tokens_used: tokensUsed
            })
            .select()
            .single();

        if (feedbackError) {
            console.warn('[admin-ai-smoke-test] Failed to store feedback:', feedbackError);
        }

        // Also store in ai_feedback table if it exists
        try {
            await supabase
                .from('ai_feedback')
                .insert({
                    user_id: user.id,
                    prompt: smokeTestPrompt,
                    generated_code: generatedCode,
                    rating: 5,
                    quality_score: 5,
                    quality_label: "excellent",
                    feedback_text: "Admin smoke test - AI generation working correctly",
                    created_at: new Date().toISOString()
                });
        } catch (error) {
            console.log('[admin-ai-smoke-test] ai_feedback table not available or error:', error.message);
        }

        const result = {
            ok: true,
            tokensUsed: tokensUsed,
            outputBytes: outputBytes,
            generationTimeMs: generationTime,
            feedbackRowId: feedbackRow?.id || null,
            model: model,
            maxTokens: maxTokens,
            codePreview: generatedCode.substring(0, 100) + (generatedCode.length > 100 ? '...' : '')
        };

        console.log(`[admin-ai-smoke-test] Success: ${tokensUsed} tokens, ${outputBytes} bytes, ${generationTime}ms`);

        return {
            statusCode: 200,
            headers,
            body: JSON.stringify(result),
        };

    } catch (error) {
        console.error('[admin-ai-smoke-test] Error:', error);
        return {
            statusCode: 500,
            headers,
            body: JSON.stringify({ 
                ok: false,
                error: error.message 
            }),
        };
    }
};