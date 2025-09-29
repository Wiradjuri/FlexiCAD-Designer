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

        console.log('📋 [admin-feedback-list] Query params:', { status, search, page, limit });

        // Validate status parameter
        if (!['pending', 'accepted', 'rejected', 'all'].includes(status)) {
            return {
                statusCode: 400,
                headers,
                body: JSON.stringify({ 
                    ok: false, 
                    code: 'invalid_status', 
                    error: 'Status must be: pending, accepted, rejected, or all' 
                }),
            };
        }

        // Build query from ai_feedback table
        let query = supabase
            .from('ai_feedback')
            .select(`
                id,
                created_at,
                updated_at,
                user_email,
                design_prompt,
                template_name,
                design_id,
                generated_code,
                user_feedback,
                quality_score,
                quality_label,
                feedback_text,
                review_status,
                reviewed_by,
                reviewed_at,
                generation_time_ms,
                tokens_used
            `, { count: 'exact' })
            .order('created_at', { ascending: false });

        // Filter by review status if not 'all'
        if (status !== 'all') {
            query = query.eq('review_status', status);
        }

        // Add search filter if provided (escape % and _ for ILIKE)
        if (search.length > 0) {
            const escapedSearch = search.replace(/[%_]/g, '\\$&');
            query = query.or(`user_email.ilike.%${escapedSearch}%,design_prompt.ilike.%${escapedSearch}%,template_name.ilike.%${escapedSearch}%,feedback_text.ilike.%${escapedSearch}%`);
        }

        // Apply pagination
        const offset = (page - 1) * limit;
        query = query.range(offset, offset + limit - 1);

        console.log('🔍 [admin-feedback-list] Executing query with filters:', { status, search, offset, limit });

        const { data: feedback, error: feedbackError, count } = await query;

        if (feedbackError) {
            console.error('❌ [admin-feedback-list] Database query failed:', feedbackError);
            return {
                statusCode: 500,
                headers,
                body: JSON.stringify({ 
                    ok: false,
                    code: 'query_failed',
                    error: 'Failed to load feedback',
                    details: feedbackError.message
                }),
            };
        }

        const totalPages = Math.ceil((count || 0) / limit);
        
        console.log('✅ [admin-feedback-list] Query successful:', { 
            itemCount: feedback?.length || 0, 
            total: count, 
            page, 
            totalPages 
        });

        return {
            statusCode: 200,
            headers,
            body: JSON.stringify({
                ok: true,
                items: feedback || [],
                total: count || 0,
                page,
                totalPages,
                limit,
                filters: { status, search }
            }),
        };

    } catch (error) {
        console.error('🔥 [admin-feedback-list] Unexpected error:', error);
        return {
            statusCode: 500,
            headers,
            body: JSON.stringify({ 
                ok: false,
                code: 'internal_error',
                error: error.message 
            }),
        };
    }
};