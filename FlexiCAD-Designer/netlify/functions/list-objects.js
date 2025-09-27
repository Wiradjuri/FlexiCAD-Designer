// Lists every subdirectory in /objects and returns metadata, readme, scad path
require('dotenv').config();
const fs = require('fs/promises');
const path = require('path');

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
  'Content-Type': 'application/json'
};
const ok = (b, c = 200) => ({ statusCode: c, headers: CORS, body: JSON.stringify(b) });
const bad = (m, c = 400) => ok({ error: m }, c);

exports.handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') return ok({ ok: true });
  if (event.httpMethod !== 'GET') return bad('Method not allowed', 405);

  try {
    const objectsDir = path.join(process.cwd(), 'objects');
    const entries = await fs.readdir(objectsDir, { withFileTypes: true });

    const templates = [];
    for (const entry of entries) {
      if (!entry.isDirectory()) continue;
      const dir = path.join(objectsDir, entry.name);

      const metadata = await fs.readFile(path.join(dir, 'metadata.json'), 'utf8').catch(() => null);
      const readme = await fs.readFile(path.join(dir, 'README.md'), 'utf8').catch(() => null);

      const meta = metadata ? JSON.parse(metadata) : {};
      templates.push({
        slug: entry.name,
        name: meta.name || entry.name,
        description: meta.description || (readme ? readme.split('\n')[0] : ''),
        category: meta.category || 'General',
        files: {
          scad: `/objects/${entry.name}/template.scad`,
          metadata: `/objects/${entry.name}/metadata.json`,
          readme: `/objects/${entry.name}/README.md`
        }
      });
    }

    return ok({ templates });
  } catch (err) {
    console.error(err);
    return bad('Failed to list templates: ' + err.message, 500);
  }
};
