import { createClient } from '@supabase/supabase-js';
import { requireAdmin, corsHeaders, json } from '../lib/require-admin.mjs';

// Admin endpoint to list user feedback for review - Fixed for production reliability
export const handler = async (event, context) => {
    console.log('🚀 [admin-feedback-list] Request received:', {
        method: event.httpMethod,
        path: event.path,
        query: event.queryStringParameters
    });

    if (event.httpMethod === 'OPTIONS') {
        return { statusCode: 200, headers: corsHeaders, body: '' };
    }

    if (event.httpMethod !== 'GET') {
        return json(405, { ok: false, code: 'method_not_allowed', error: 'Method not allowed' });
    }

    // Check admin access using robust helper
    const gate = await requireAdmin(event);
    if (!gate.ok) {
        return json(gate.status, { ok: false, code: gate.code, error: gate.error });
    }
    
    const requesterEmail = gate.requesterEmail;
    const supabase = gate.supabase; // service client

    try {

        // Parse and validate query parameters
        const params = event.queryStringParameters || {};
        const status = params.status || 'pending';
        const search = (params.search || params.q || '').trim().substring(0, 100);
        const page = Math.max(1, parseInt(params.page || '1', 10));
        const limit = Math.min(100, Math.max(1, parseInt(params.limit || '20', 10)));

        console.log(`[admin][feedback-list] requester=${requesterEmail} status=${status} page=${page} limit=${limit}`);

        // Validate status parameter
        if (!['pending', 'accepted', 'rejected', 'all'].includes(status)) {
            return json(400, { 
                ok: false, 
                code: 'invalid_status', 
                error: 'Status must be: pending, accepted, rejected, or all' 
            });
        }

        // Build query from ai_feedback table with schema-matched columns
        let query = supabase
            .from('ai_feedback')
            .select(`
                id,
                user_id,
                user_email,
                template,
                design_id,
                design_prompt,
                generated_code,
                quality_score,
                feedback_text,
                review_status,
                reviewed_by,
                reviewed_at,
                created_at
            `, { count: 'exact' })
            .order('created_at', { ascending: false });

        // Add search filter if provided (escape % and _ for ILIKE)
        if (search.length > 0) {
            const escapedSearch = search.replace(/[%_]/g, '\\$&');
            query = query.or(`user_email.ilike.%${escapedSearch}%,template.ilike.%${escapedSearch}%,design_id.ilike.%${escapedSearch}%`);
        }

        // Apply pagination
        const from = (page - 1) * limit;
        const to = from + limit - 1;
        query = query.range(from, to);

        console.log('🔍 [admin-feedback-list] Executing query with filters:', { status, search, from, to, limit });

        const { data: rows, error: feedbackError, count } = await query;

        if (feedbackError) {
            console.error('❌ [admin-feedback-list] Database query failed:', feedbackError);
            return json(500, { 
                ok: false,
                code: 'db_error',
                error: feedbackError.message
            });
        }

        const totalPages = Math.max(1, Math.ceil((count || 0) / limit));
        
        console.log(`[admin][feedback-list] requester=${requesterEmail} status=${status} page=${page} rows=${rows?.length || 0}`);

        return json(200, {
            ok: true,
            items: rows || [],
            total: count || 0,
            page,
            totalPages,
            limit
        });

    } catch (error) {
        console.error('🔥 [admin-feedback-list] Unexpected error:', error);
        return {
            statusCode: 500,
            headers: {
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*'
            },
            body: JSON.stringify({ 
                ok: false,
                code: 'internal_error',
                error: error.message 
            })
        };
    }
};