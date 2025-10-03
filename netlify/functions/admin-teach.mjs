// Phase: 4.7.21+ - Admin teach AI (upload dataset stub)
import { requireAdmin, json, corsHeaders } from '../lib/require-auth.mjs';

export async function handler(event) {
  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers: corsHeaders };
  }

  const gate = await requireAdmin(event);
  if (!gate.ok) {
    return json(gate.status ?? 401, { ok: false, error: gate.error || 'Unauthorized' });
  }

  try {
    let body = {};
    if (event.body) {
      try {
        body = JSON.parse(event.body);
      } catch (e) {
        return json(400, { ok: false, error: 'Invalid JSON' });
      }
    }

    const { name, type, content, metadata } = body;

    if (!name || !type) {
      return json(400, { ok: false, error: 'name and type required' });
    }

    // Stub implementation - in production, this would:
    // 1. Validate the dataset format
    // 2. Store in vector database
    // 3. Update AI model knowledge
    // 4. Create audit log entry

    console.log(`[admin-teach] Dataset upload requested: ${name} (${type})`);

    return json(200, {
      ok: true,
      message: 'Dataset upload successful',
      dataset: {
        id: `dataset-${Date.now()}`,
        name,
        type,
        uploadedAt: new Date().toISOString(),
        uploadedBy: gate.user?.email,
        status: 'processing'
      },
      note: 'Stub implementation - integrate with vector store for actual AI training'
    });

  } catch (error) {
    console.error('[admin-teach] Error:', error);
    return json(500, { ok: false, error: error.message });
  }
}
