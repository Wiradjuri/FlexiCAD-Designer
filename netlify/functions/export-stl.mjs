// netlify/functions/export-stl.mjs
import { requireAuth, json, corsHeaders } from '../lib/require-auth.mjs';

export async function handler(event) {
  // CORS preflight
  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers: corsHeaders };
  }

  if (event.httpMethod !== 'POST') {
    return json(405, { ok: false, error: 'Method not allowed' });
  }

  const gate = await requireAuth(event);
  if (!gate.ok) {
    return json(gate.status, { ok: false, error: gate.error, code: gate.code });
  }

  let body;
  try {
    body = JSON.parse(event.body || '{}');
  } catch {
    return json(400, { ok: false, error: 'Invalid JSON body', code: 'bad_json' });
  }

  const { scadCode, resolution = 'medium', filename = `flexicad-export-${Date.now()}.stl` } = body;

  if (!scadCode || typeof scadCode !== 'string') {
    return json(400, { ok: false, error: 'scadCode is required', code: 'missing_scad' });
  }

  // TODO: replace placeholder generator with a real OpenSCAD-to-STL pipeline.
  const stlBuffer = generateSimpleSTL(resolution);

  // Binary STL download (base64-encoded body, let Netlify compute Content-Length)
  return {
    statusCode: 200,
    headers: {
      ...corsHeaders,
      'Content-Type': 'application/octet-stream',       // STL MIME type
      'Content-Disposition': `attachment; filename="${filename}"`,
      'Cache-Control': 'no-store',
    },
    body: Buffer.from(stlBuffer).toString('base64'),
    isBase64Encoded: true,
  };
}

export { handler as default };

// --- Simple placeholder STL (replace with real engine when ready) ---
function generateSimpleSTL(resolution) {
  const RES = { fast: 12, medium: 24, high: 48 };
  const triangleCount = RES[resolution] ?? RES.medium;

  const headerSize = 80;
  const countSize = 4;
  const triSize = 50;
  const total = headerSize + countSize + triangleCount * triSize;

  const buf = new ArrayBuffer(total);
  const view = new DataView(buf);

  // 80-byte header left as zeros
  let offset = headerSize;

  // Triangle count (uint32 LE)
  view.setUint32(offset, triangleCount, true);
  offset += 4;

  const V = cubeVertices();
  const F = cubeFaces();

  const n = [0, 0, 1]; // simple normal for placeholder

  for (let i = 0; i < Math.min(triangleCount, F.length); i++) {
    const [a, b, c] = F[i];
    const v1 = V[a], v2 = V[b], v3 = V[c];

    // normal
    view.setFloat32(offset, n[0], true); offset += 4;
    view.setFloat32(offset, n[1], true); offset += 4;
    view.setFloat32(offset, n[2], true); offset += 4;

    // v1
    view.setFloat32(offset, v1[0], true); offset += 4;
    view.setFloat32(offset, v1[1], true); offset += 4;
    view.setFloat32(offset, v1[2], true); offset += 4;

    // v2
    view.setFloat32(offset, v2[0], true); offset += 4;
    view.setFloat32(offset, v2[1], true); offset += 4;
    view.setFloat32(offset, v2[2], true); offset += 4;

    // v3
    view.setFloat32(offset, v3[0], true); offset += 4;
    view.setFloat32(offset, v3[1], true); offset += 4;
    view.setFloat32(offset, v3[2], true); offset += 4;

    // attribute byte count
    view.setUint16(offset, 0, true); offset += 2;
  }

  return new Uint8Array(buf);
}

function cubeVertices() {
  return [
    [0,0,0],[1,0,0],[1,1,0],[0,1,0],
    [0,0,1],[1,0,1],[1,1,1],[0,1,1],
  ];
}

function cubeFaces() {
  return [
    [0,1,2],[0,2,3], // bottom
    [4,7,6],[4,6,5], // top
    [0,4,5],[0,5,1], // front
    [2,6,7],[2,7,3], // back
    [0,3,7],[0,7,4], // left
    [1,5,6],[1,6,2], // right
  ];
}
