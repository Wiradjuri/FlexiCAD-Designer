import { createClient } from '@supabase/supabase-js';
import { requireAdmin, corsHeaders, json } from '../lib/require-admin.mjs';

// Admin endpoint to accept/reject feedback for training with proper state management
export const handler = async (event, context) => {
    console.log('🚀 [admin-feedback-decide] Request received:', {
        method: event.httpMethod,
        path: event.path
    });

    if (event.httpMethod === 'OPTIONS') {
        return { statusCode: 200, headers: corsHeaders, body: '' };
    }

    if (event.httpMethod !== 'POST') {
        return json(405, { ok: false, code: 'method_not_allowed', error: 'Method not allowed' });
    }

    // Check admin access using robust helper
    const gate = await requireAdmin(event);
    if (!gate.ok) {
        return json(gate.status, { ok: false, code: 'admin_required', error: 'Admin access required' });
    }
    
    const { supabase, requesterEmail, requesterId } = gate;
    console.log('[admin][feedback-decide] requester=%s', requesterEmail);

    // Parse and validate request body
    let body;
    try {
        body = JSON.parse(event.body || '{}');
    } catch {
        return json(400, { ok: false, code: 'bad_json', error: 'Malformed JSON body' });
    }

    const { feedback_id, decision } = body;
    const tags = Array.isArray(body.tags) ? body.tags : ['admin-approved'];
    const reason = body.reason || null;

    if (!feedback_id || !['accept', 'reject'].includes(decision)) {
        return json(400, { ok: false, code: 'bad_request', error: 'feedback_id and decision are required' });
    }

    try {

        // Get the feedback record with detailed error handling
        const { data: fb, error: sErr } = await supabase
            .from('ai_feedback')
            .select('*')
            .eq('id', feedback_id)
            .single();

        if (sErr) {
            return json(500, { ok: false, code: 'db_select', error: sErr.message });
        }
        if (!fb) {
            return json(404, { ok: false, code: 'not_found', error: 'Feedback not found' });
        }

        // Check if already reviewed (idempotent operation)
        if (fb.review_status !== 'pending') {
            return json(200, {
                ok: true,
                message: `Feedback already ${fb.review_status}`,
                feedback: {
                    id: fb.id,
                    review_status: fb.review_status,
                    reviewed_by: fb.reviewed_by,
                    reviewed_at: fb.reviewed_at
                },
                promoted_example_id: null
            });
        }

        // If accepting, create training example idempotently
        let promotedId = null;
        if (decision === 'accept') {
            const quality_label = (fb.quality_score ?? 0) >= 4 ? 'good' : 'bad';
            
            // Check if training example already exists
            const { data: exists, error: exErr } = await supabase
                .from('ai_training_examples')
                .select('id')
                .eq('source_feedback_id', feedback_id)
                .maybeSingle();

            if (exErr) {
                return json(500, { ok: false, code: 'db_check', error: exErr.message });
            }

            if (!exists) {
                // Create new training example
                const { data: ins, error: insErr } = await supabase
                    .from('ai_training_examples')
                    .insert([{
                        source_feedback_id: feedback_id,
                        template: fb.template || null,
                        input_prompt: fb.design_prompt || null,
                        generated_code: fb.generated_code || null,
                        quality_score: fb.quality_score ?? null,
                        quality_label,
                        tags,
                        created_by: requesterId
                    }])
                    .select('id')
                    .single();

                if (insErr) {
                    return json(500, { ok: false, code: 'db_insert_example', error: insErr.message });
                }
                promotedId = ins.id;
            } else {
                promotedId = exists.id;
            }
        }

        // Update feedback status and return updated columns used by UI
        const { data: upd, error: updErr } = await supabase
            .from('ai_feedback')
            .update({
                review_status: decision === 'accept' ? 'accepted' : 'rejected',
                reviewed_by: requesterEmail,
                reviewed_at: new Date().toISOString()
            })
            .eq('id', feedback_id)
            .select('id, review_status, reviewed_by, reviewed_at')
            .single();

        if (updErr) {
            return json(500, { ok: false, code: 'db_update_feedback', error: updErr.message });
        }

        // Log audit entry (don't fail request if this fails)
        try {
            await supabase.from('admin_audit').insert([{
                actor_email: requesterEmail,
                action: 'admin_feedback_decide',
                details: { feedback_id, decision, reason, promoted_example_id: promotedId }
            }]);
        } catch (auditError) {
            console.warn('⚠️ [admin-feedback-decide] Failed to log audit entry:', auditError.message);
        }

        return json(200, { ok: true, feedback: upd, promoted_example_id: promotedId });

    } catch (error) {
        console.error('🔥 [admin-feedback-decide] Unexpected error:', error);
        return json(500, { 
            ok: false,
            code: 'internal_error',
            error: error.message 
        });
    }
};