// netlify/functions/upload-stl.mjs - STL File Upload Handler for Phase 4.6/4.7
import { requireAuth, json, corsHeaders } from '../lib/require-auth.mjs';

const BUCKET = process.env.SUPABASE_STORAGE_BUCKET_STL || 'stl-files';

export async function handler(event) {
  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers: corsHeaders };
  }

  if (event.httpMethod !== 'POST') {
    return json(405, { ok: false, error: 'Method not allowed' });
  }

  try {
    const auth = await requireAuth(event);
    if (!auth.ok) {
      return json(auth.status, { ok: false, error: auth.error });
    }
    const { supabase, user } = auth;

    // Parse multipart form data (simplified approach)
    const contentType = event.headers['content-type'] || '';
    if (!contentType.includes('multipart/form-data')) {
      return json(400, { ok: false, error: 'Expected multipart/form-data' });
    }

    // In a real implementation, you'd parse the multipart data properly
    // For now, let's assume the STL data is in the body as base64
    const body = JSON.parse(event.body || '{}');
    const { stlData, filename, code, metadata = {} } = body;

    if (!stlData || !filename) {
      return json(400, { ok: false, error: 'Missing STL data or filename' });
    }

    // Convert base64 to buffer if needed
    const stlBuffer = Buffer.from(stlData, 'base64');
    
    // Generate unique filename
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const userId = user.id.substring(0, 8);
    const uniqueFilename = `${userId}/${timestamp}-${filename}`;

    // Upload to Supabase Storage
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from(BUCKET)
      .upload(uniqueFilename, stlBuffer, {
        contentType: 'application/octet-stream',
        metadata: {
          userId: user.id,
          originalCode: code || '',
          generatedAt: new Date().toISOString(),
          ...metadata
        }
      });

    if (uploadError) {
      console.error('❌ [upload-stl] Storage upload failed:', uploadError);
      return json(500, { ok: false, error: 'Failed to upload STL file' });
    }

    // Generate public URL for sharing
    const { data: urlData } = await supabase.storage
      .from(BUCKET)
      .createSignedUrl(uniqueFilename, 7 * 24 * 3600); // 7 days

    // Save record to database for tracking
    const { error: dbError } = await supabase
      .from('stl_exports')
      .insert({
        user_id: user.id,
        filename: filename,
        file_path: uniqueFilename,
        file_size: stlBuffer.length,
        original_code: code || null,
        metadata: metadata,
        created_at: new Date().toISOString()
      });

    if (dbError) {
      console.warn('⚠️ [upload-stl] Failed to save DB record:', dbError);
      // Continue anyway - file is uploaded successfully
    }

    console.log(`✅ [upload-stl] User ${user.email} uploaded ${filename} (${stlBuffer.length} bytes)`);

    return json(200, {
      ok: true,
      message: 'STL file uploaded successfully',
      fileId: uploadData.path,
      shareUrl: urlData?.signedUrl || null,
      size: stlBuffer.length
    });

  } catch (error) {
    console.error('❌ [upload-stl] Unexpected error:', error);
    return json(500, { ok: false, error: 'Internal server error' });
  }
}