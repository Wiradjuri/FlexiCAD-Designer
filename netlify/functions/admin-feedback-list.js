const { createClient } = require('@supabase/supabase-js');

// Admin endpoint to list user feedback for review
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
        const status = params.status || 'pending';
        const search = params.search || '';
        const page = parseInt(params.page || '1', 10);
        const limit = parseInt(params.limit || '50', 10);
        const offset = (page - 1) * limit;

        // Build query
        let query = supabase
            .from('ai_feedback')
            .select(`
                id,
                created_at,
                quality_score,
                quality_label,
                feedback_text,
                design_prompt,
                template_name,
                user_id,
                review_status,
                reviewed_by,
                reviewed_at,
                profiles!inner(email)
            `)
            .eq('review_status', status)
            .order('created_at', { ascending: false })
            .range(offset, offset + limit - 1);

        // Add search filter if provided
        if (search.trim()) {
            query = query.or(`feedback_text.ilike.%${search}%,design_prompt.ilike.%${search}%,template_name.ilike.%${search}%`);
        }

        const { data: feedback, error: feedbackError } = await query;

        if (feedbackError) {
            console.error('Feedback query error:', feedbackError);
            return {
                statusCode: 500,
                headers,
                body: JSON.stringify({ error: 'Failed to load feedback' }),
            };
        }

        // Get total count for pagination
        let countQuery = supabase
            .from('ai_feedback')
            .select('id', { count: 'exact', head: true })
            .eq('review_status', status);
            
        if (search.trim()) {
            countQuery = countQuery.or(`feedback_text.ilike.%${search}%,design_prompt.ilike.%${search}%,template_name.ilike.%${search}%`);
        }

        const { count, error: countError } = await countQuery;

        return {
            statusCode: 200,
            headers,
            body: JSON.stringify({
                ok: true,
                feedback: feedback || [],
                pagination: {
                    page,
                    limit,
                    total: count || 0,
                    totalPages: Math.ceil((count || 0) / limit)
                },
                filters: {
                    status,
                    search
                }
            }),
        };

    } catch (error) {
        console.error('Admin feedback list error:', error);
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