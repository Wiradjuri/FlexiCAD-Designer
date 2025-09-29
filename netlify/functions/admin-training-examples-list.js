const { createClient } = require('@supabase/supabase-js');

// Admin endpoint to list curated training examples
exports.handler = async (event, context) => {
    const headers = {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization',
        'Access-Control-Allow-Methods': 'GET, OPTIONS',
    };

    if (event.httpMethod === 'OPTIONS') {
        return { statusCode: 200, headers, body: '' };
    }

    if (event.httpMethod !== 'GET') {
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

        // Parse query parameters
        const params = event.queryStringParameters || {};
        const tag = params.tag; // filter by tag
        const template = params.template; // filter by template/category
        const page = parseInt(params.page || '1', 10);
        const limit = parseInt(params.limit || '50', 10);
        const offset = (page - 1) * limit;

        // Build query
        let query = supabase
            .from('ai_training_examples')
            .select('*', { count: 'exact' })
            .eq('active', true)
            .order('created_at', { ascending: false })
            .range(offset, offset + limit - 1);

        // Apply filters
        if (tag) {
            query = query.contains('tags', [tag]);
        }

        if (template) {
            query = query.eq('category', template);
        }

        const { data: examples, error: examplesError, count } = await query;

        if (examplesError) {
            console.error('🔥 [admin_training_examples_list] Query error:', examplesError);
            return {
                statusCode: 500,
                headers,
                body: JSON.stringify({ error: 'Failed to list training examples' }),
            };
        }

        console.log(`📚 [admin_training_examples_list] Listed ${examples?.length || 0} training examples`);

        return {
            statusCode: 200,
            headers,
            body: JSON.stringify({
                ok: true,
                examples: examples || [],
                pagination: {
                    page,
                    limit,
                    total: count || 0,
                    totalPages: Math.ceil((count || 0) / limit)
                },
                filters: {
                    tag: tag || null,
                    template: template || null
                }
            }),
        };

    } catch (error) {
        console.error('🔥 [admin_training_examples_list] Error:', error);
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