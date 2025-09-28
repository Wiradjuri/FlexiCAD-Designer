const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
);

const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

exports.handler = async (event, context) => {
    if (event.httpMethod === 'OPTIONS') {
        return { statusCode: 200, headers, body: '' };
    }

    if (event.httpMethod !== 'POST') {
        return {
            statusCode: 405,
            headers,
            body: JSON.stringify({ error: 'Method not allowed' })
        };
    }

    try {
        const { 
            patternName,
            description,
            keywords,
            examplePrompt,
            successfulCode,
            category,
            complexityLevel
        } = JSON.parse(event.body);

        // Get user from auth token
        const authHeader = event.headers.authorization;
        if (!authHeader) {
            throw new Error('No authorization header');
        }

        const token = authHeader.replace('Bearer ', '');
        const { data: { user }, error: authError } = await supabase.auth.getUser(token);
        
        if (authError || !user) {
            throw new Error('Invalid authentication');
        }

        // Check if user is admin (bmuzza1992@gmail.com)
        const { data: profile } = await supabase
            .from('profiles')
            .select('email')
            .eq('id', user.id)
            .single();

        if (!profile || profile.email !== 'bmuzza1992@gmail.com') {
            return {
                statusCode: 403,
                headers,
                body: JSON.stringify({ error: 'Admin access required' })
            };
        }

        // Validate required fields
        if (!patternName || !examplePrompt || !successfulCode) {
            throw new Error('Pattern name, example prompt, and code are required');
        }

        // Process keywords
        const keywordArray = Array.isArray(keywords) ? keywords : 
            typeof keywords === 'string' ? keywords.split(',').map(k => k.trim()) :
            extractKeywordsFromPrompt(examplePrompt);

        // Add pattern to knowledge base
        const { data: newPattern, error: insertError } = await supabase
            .from('ai_knowledge_base')
            .insert({
                pattern_name: patternName,
                description: description || `Manual pattern: ${patternName}`,
                keywords: keywordArray,
                example_prompt: examplePrompt,
                successful_code: successfulCode,
                category: category || 'manual',
                complexity_level: complexityLevel || 'intermediate',
                usage_count: 1,
                average_rating: 5.0
            })
            .select()
            .single();

        if (insertError) {
            if (insertError.code === '23505') { // Unique constraint violation
                throw new Error(`Pattern "${patternName}" already exists`);
            }
            throw new Error(`Failed to add pattern: ${insertError.message}`);
        }

        return {
            statusCode: 200,
            headers,
            body: JSON.stringify({
                success: true,
                message: `Pattern "${patternName}" added to knowledge base`,
                pattern: {
                    id: newPattern.id,
                    name: newPattern.pattern_name,
                    category: newPattern.category,
                    keywords: newPattern.keywords
                }
            })
        };

    } catch (error) {
        console.error('Teaching error:', error);
        return {
            statusCode: 500,
            headers,
            body: JSON.stringify({ error: error.message })
        };
    }
};

// Extract keywords from prompt text
function extractKeywordsFromPrompt(prompt) {
    const stopWords = new Set(['the', 'a', 'an', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for', 'of', 'with', 'by']);
    
    return prompt
        .toLowerCase()
        .replace(/[^\w\s]/g, '')
        .split(/\s+/)
        .filter(word => word.length > 2 && !stopWords.has(word))
        .slice(0, 10); // Limit to 10 keywords
}
