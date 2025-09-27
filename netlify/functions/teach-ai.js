// AI Teaching Interface
// Allows administrators/users to manually add training examples

const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

const supabaseService = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

exports.handler = async (event, context) => {
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Access-Control-Allow-Methods': 'POST, PUT, OPTIONS',
  };

  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers, body: '' };
  }

  if (!['POST', 'PUT'].includes(event.httpMethod)) {
    return {
      statusCode: 405,
      headers,
      body: JSON.stringify({ error: 'Method not allowed' }),
    };
  }

  try {
    const { 
      patternName, 
      description, 
      keywords, 
      examplePrompt, 
      successfulCode, 
      category, 
      complexityLevel,
      updateFileSystem = true 
    } = JSON.parse(event.body);

    // Validate required fields
    if (!patternName || !examplePrompt || !successfulCode) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'Pattern name, example prompt, and code are required' }),
      };
    }

    // Authentication
    const authHeader = event.headers.authorization || event.headers.Authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return {
        statusCode: 401,
        headers,
        body: JSON.stringify({ error: 'Authorization token required' }),
      };
    }

    const token = authHeader.replace('Bearer ', '');
    let userId;

    try {
      const tokenParts = token.split('.');
      const payload = JSON.parse(Buffer.from(tokenParts[1], 'base64').toString());
      userId = payload.sub || payload.user_id;

      if (!userId) {
        throw new Error('No user ID found in token');
      }
    } catch (err) {
      return {
        statusCode: 401,
        headers,
        body: JSON.stringify({ error: 'Invalid token' }),
      };
    }

    // Verify user has permission (admin or paid user)
    const { data: profile, error: profileError } = await supabaseService
      .from('profiles')
      .select('is_paid, is_active, email')
      .eq('id', userId)
      .single();

    if (profileError || !profile?.is_paid || !profile?.is_active) {
      return {
        statusCode: 403,
        headers,
        body: JSON.stringify({ error: 'Payment required' }),
      };
    }

    // Process keywords
    const keywordArray = typeof keywords === 'string' 
      ? keywords.split(',').map(k => k.trim().toLowerCase()).filter(k => k.length > 0)
      : Array.isArray(keywords) 
        ? keywords.map(k => k.toString().trim().toLowerCase()).filter(k => k.length > 0)
        : [];

    // Add automatic keywords from prompt and description
    const autoKeywords = [
      ...(examplePrompt.toLowerCase().match(/\b\w{4,}\b/g) || []),
      ...(description ? description.toLowerCase().match(/\b\w{4,}\b/g) || [] : [])
    ].filter(word => 
      !['this', 'that', 'with', 'from', 'they', 'have', 'been', 'will', 'can', 'code', 'openscad'].includes(word)
    );

    const finalKeywords = [...new Set([...keywordArray, ...autoKeywords])];

    // Store in database
    const teachingData = {
      pattern_name: patternName,
      description: description || `AI learned pattern: ${patternName}`,
      keywords: finalKeywords,
      example_prompt: examplePrompt,
      successful_code: successfulCode,
      category: category || 'general',
      complexity_level: complexityLevel || 'intermediate',
      average_rating: 5.0, // Default high rating for manually added patterns
      usage_count: 1
    };

    let result;
    if (event.httpMethod === 'POST') {
      // Create new pattern
      const { data, error } = await supabaseService
        .from('ai_knowledge_base')
        .insert(teachingData)
        .select()
        .single();

      if (error) {
        if (error.code === '23505') { // Unique constraint violation
          return {
            statusCode: 409,
            headers,
            body: JSON.stringify({ error: 'Pattern name already exists. Use PUT to update.' }),
          };
        }
        throw error;
      }
      result = data;
    } else {
      // Update existing pattern
      const { data, error } = await supabaseService
        .from('ai_knowledge_base')
        .update(teachingData)
        .eq('pattern_name', patternName)
        .select()
        .single();

      if (error) {
        throw error;
      }
      result = data;
    }

    // Optionally update the file system training data
    if (updateFileSystem) {
      try {
        await updateTrainingFiles(patternName, {
          description: description,
          prompt: examplePrompt,
          code: successfulCode,
          keywords: finalKeywords,
          category: category,
          complexity: complexityLevel,
          techniques: extractTechniques(successfulCode)
        });
      } catch (fileError) {
        console.error('Warning: Failed to update training files:', fileError);
        // Don't fail the request if file update fails
      }
    }

    return {
      statusCode: event.httpMethod === 'POST' ? 201 : 200,
      headers,
      body: JSON.stringify({
        success: true,
        message: `Pattern ${event.httpMethod === 'POST' ? 'created' : 'updated'} successfully`,
        pattern: {
          id: result.id,
          pattern_name: result.pattern_name,
          keywords: result.keywords.length,
          category: result.category,
          complexity_level: result.complexity_level
        }
      }),
    };

  } catch (error) {
    console.error('Error teaching AI:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: 'Failed to teach AI pattern' }),
    };
  }
};

// Helper function to update training files
async function updateTrainingFiles(patternName, patternData) {
  const trainingDataPath = path.join(__dirname, '../..', 'ai-reference', 'ai_training_data.json');
  
  let trainingData = {};
  if (fs.existsSync(trainingDataPath)) {
    trainingData = JSON.parse(fs.readFileSync(trainingDataPath, 'utf8'));
  }

  // Add or update the pattern
  trainingData[patternName] = {
    ...patternData,
    lastUpdated: new Date().toISOString(),
    source: 'manual_teaching'
  };

  // Write back to file
  fs.writeFileSync(trainingDataPath, JSON.stringify(trainingData, null, 2));
  console.log(`Updated training file with pattern: ${patternName}`);
}

// Helper function to extract techniques from code
function extractTechniques(code) {
  const techniques = [];
  const codeLower = code.toLowerCase();

  // Common OpenSCAD techniques
  const techniquePatterns = {
    'parametric': /\$[a-z_]+|[a-z_]+\s*=/,
    'modules': /module\s+[a-z_]+/,
    'loops': /for\s*\(/,
    'conditionals': /if\s*\(/,
    'transformations': /(translate|rotate|scale|mirror)\s*\(/,
    'boolean_ops': /(union|difference|intersection)\s*\(/,
    'arrays': /\[\s*for/,
    'functions': /function\s+[a-z_]+/,
    'variables': /[a-z_]+\s*=/,
    'comments': /\/\//
  };

  for (const [technique, pattern] of Object.entries(techniquePatterns)) {
    if (pattern.test(codeLower)) {
      techniques.push(technique);
    }
  }

  return techniques;
}