/**
 * Admin JSONL Preview
 * Endpoint: GET /api/admin-preview-jsonl
 * 
 * Provides preview of JSONL training files with line sampling
 * Phase 4.4.3 Implementation - Training Assets Viewer
 */

import { requireAdmin } from '../lib/require-admin.mjs';

export const handler = async (event, context) => {
  // CORS preflight
  if (event.httpMethod === 'OPTIONS') {
    return {
      statusCode: 200,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
        'Access-Control-Allow-Methods': 'GET, OPTIONS',
      },
      body: '',
    };
  }

  if (event.httpMethod !== 'GET') {
    return {
      statusCode: 405,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ error: 'Method not allowed' }),
    };
  }

  try {
    // Verify admin authentication
    const { requesterId, supabase } = await requireAdmin(event);

    const params = new URLSearchParams(event.queryStringParameters || '');
    const assetId = params.get('asset_id');
    const maxLines = Math.min(50, Math.max(1, parseInt(params.get('max_lines') || '10')));
    
    if (!assetId) {
      return {
        statusCode: 400,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ error: 'asset_id parameter required' }),
      };
    }

    console.log(`👤 Admin ${requesterId} previewing JSONL asset ${assetId}`);

    // Get asset details
    const { data: asset, error: assetError } = await supabase
      .from('training_assets')
      .select('*')
      .eq('id', assetId)
      .single();

    if (assetError || !asset) {
      return {
        statusCode: 404,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ error: 'Training asset not found' }),
      };
    }

    if (!asset.storage_path) {
      return {
        statusCode: 400,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ error: 'Asset has no storage path' }),
      };
    }

    // Download file content
    const { data: fileData, error: downloadError } = await supabase.storage
      .from('training-assets')
      .download(asset.storage_path);

    if (downloadError) {
      console.error('Error downloading JSONL file:', downloadError);
      return {
        statusCode: 500,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ error: 'Failed to download file' }),
      };
    }

    // Convert blob to text
    const content = await fileData.text();
    const lines = content.split('\n').filter(line => line.trim());
    
    // Sample lines for preview
    let previewLines = lines.slice(0, maxLines);
    
    // Parse and validate JSONL
    const parsedLines = [];
    let parseErrors = [];
    
    for (let i = 0; i < previewLines.length; i++) {
      try {
        const parsed = JSON.parse(previewLines[i]);
        parsedLines.push({
          line: i + 1,
          content: parsed,
          raw: previewLines[i]
        });
      } catch (parseError) {
        parseErrors.push({
          line: i + 1,
          error: parseError.message,
          raw: previewLines[i]
        });
      }
    }

    // Analyze structure
    const structure = {};
    parsedLines.forEach(line => {
      Object.keys(line.content).forEach(key => {
        if (!structure[key]) {
          structure[key] = {
            type: typeof line.content[key],
            examples: new Set()
          };
        }
        
        // Add example values (limit to avoid memory issues)
        if (structure[key].examples.size < 5) {
          const value = line.content[key];
          if (typeof value === 'string' && value.length > 100) {
            structure[key].examples.add(value.substring(0, 100) + '...');
          } else {
            structure[key].examples.add(value);
          }
        }
      });
    });

    // Convert Set to Array for JSON serialization
    Object.keys(structure).forEach(key => {
      structure[key].examples = Array.from(structure[key].examples);
    });

    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        ok: true,
        asset: {
          id: asset.id,
          name: asset.name,
          description: asset.description,
          file_size: asset.file_size,
          created_at: asset.created_at
        },
        preview: {
          total_lines: lines.length,
          shown_lines: previewLines.length,
          max_lines: maxLines,
          truncated: lines.length > maxLines
        },
        structure,
        lines: parsedLines,
        parse_errors: parseErrors,
        stats: {
          valid_lines: parsedLines.length,
          invalid_lines: parseErrors.length,
          success_rate: ((parsedLines.length / (parsedLines.length + parseErrors.length)) * 100).toFixed(1) + '%'
        }
      }),
    };

  } catch (error) {
    console.error('Admin JSONL preview error:', error);
    return {
      statusCode: 500,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ error: 'Internal server error' }),
    };
  }
};