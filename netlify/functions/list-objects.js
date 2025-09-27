const fs = require('fs');
const path = require('path');

exports.handler = async (event, context) => {
  // CORS headers
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Access-Control-Allow-Methods': 'GET, OPTIONS',
  };

  // Handle preflight requests
  if (event.httpMethod === 'OPTIONS') {
    return {
      statusCode: 200,
      headers,
      body: '',
    };
  }

  // Only allow GET requests
  if (event.httpMethod !== 'GET') {
    return {
      statusCode: 405,
      headers,
      body: JSON.stringify({ error: 'Method not allowed' }),
    };
  }

  try {
    // Read the objects manifest file
    const manifestPath = path.join(process.cwd(), 'FlexiCAD-Designer', 'objects', 'index.json');
    
    if (!fs.existsSync(manifestPath)) {
      throw new Error('Objects manifest not found');
    }

    const manifestContent = fs.readFileSync(manifestPath, 'utf8');
    const manifest = JSON.parse(manifestContent);

    // Transform the manifest data to match expected format
    const templates = Object.keys(manifest.objects || {}).map(key => {
      const obj = manifest.objects[key];
      return {
        id: key,
        name: obj.name || key,
        description: obj.description || '',
        category: obj.category || 'general',
        difficulty: obj.difficulty || 'beginner',
        path: `objects/${key}`,
        scad_file: obj.scad_file || 'main.scad',
        readme_file: obj.readme_file || 'README.md'
      };
    });

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        success: true,
        templates: templates,
        count: templates.length
      }),
    };

  } catch (error) {
    console.error('Error listing objects:', error);
    
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ 
        error: 'Failed to list templates',
        details: error.message
      }),
    };
  }
};