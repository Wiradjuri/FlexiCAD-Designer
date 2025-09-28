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
    // Check if specific template requested
    const queryParams = new URLSearchParams(event.queryStringParameters || {});
    const templateId = queryParams.get('id');
    const requestedFile = queryParams.get('file');

    // If requesting specific file content
    if (templateId && requestedFile) {
      const filePath = path.join(process.cwd(), 'public', 'templates', templateId, requestedFile);
      
      if (!fs.existsSync(filePath)) {
        return {
          statusCode: 404,
          headers,
          body: JSON.stringify({ error: 'Template file not found' }),
        };
      }
      
      const content = fs.readFileSync(filePath, 'utf8');
      return {
        statusCode: 200,
        headers: {
          ...headers,
          'Content-Type': 'text/plain',
        },
        body: content,
      };
    }

    // Read the templates manifest file
    const manifestPath = path.join(process.cwd(), 'public', 'templates', 'manifest.json');
    
    if (!fs.existsSync(manifestPath)) {
      throw new Error('Templates manifest not found at: ' + manifestPath);
    }

    const manifestContent = fs.readFileSync(manifestPath, 'utf8');
    const manifest = JSON.parse(manifestContent);

    // Return the templates array directly from manifest
    const templates = manifest.templates || [];

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