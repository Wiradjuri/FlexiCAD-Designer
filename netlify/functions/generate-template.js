const { createClient } = require('@supabase/supabase-js');
const OpenAI = require('openai');

// Check if environment variables are loaded
console.log('Environment check:');
console.log('SUPABASE_URL:', process.env.SUPABASE_URL ? 'Set' : 'Missing');
console.log('SUPABASE_SERVICE_ROLE_KEY:', process.env.SUPABASE_SERVICE_ROLE_KEY ? 'Set' : 'Missing');
console.log('OPENAI_API_KEY:', process.env.OPENAI_API_KEY ? 'Set' : 'Missing');

// Initialize clients
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY // Use service role key for server-side auth validation
);

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

exports.handler = async (event, context) => {
  // CORS headers
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
  };

  // Handle preflight requests
  if (event.httpMethod === 'OPTIONS') {
    return {
      statusCode: 200,
      headers,
      body: '',
    };
  }

  // Only allow POST requests
  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      headers,
      body: JSON.stringify({ error: 'Method not allowed' }),
    };
  }

  try {
    // Parse request body
    const { prompt, name = '' } = JSON.parse(event.body || '{}');

    if (!prompt || typeof prompt !== 'string' || prompt.trim().length === 0) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'Valid prompt is required' }),
      };
    }

    // Verify user authentication
    const authToken = event.headers.authorization?.replace('Bearer ', '');
    if (!authToken) {
      console.log('No auth token provided');
      return {
        statusCode: 401,
        headers,
        body: JSON.stringify({ error: 'Authentication required' }),
      };
    }

    console.log('Auth token received, verifying with Supabase...');

    // Verify the token with Supabase
    const { data: { user }, error: authError } = await supabase.auth.getUser(authToken);
    
    if (authError) {
      console.error('Supabase auth error:', authError);
      return {
        statusCode: 401,
        headers,
        body: JSON.stringify({ error: 'Invalid authentication token', details: authError.message }),
      };
    }
    
    if (!user) {
      console.log('No user returned from Supabase');
      return {
        statusCode: 401,
        headers,
        body: JSON.stringify({ error: 'Invalid authentication token' }),
      };
    }
    
    console.log('User authenticated successfully:', user.email);

    // Generate OpenSCAD code using OpenAI
    const systemPrompt = `You are an expert OpenSCAD developer. Generate clean, well-commented, parametric OpenSCAD code based on the user's description.

Guidelines:
1. Always include parameters at the top for easy customization
2. Use meaningful variable names and add comments
3. Create modular, reusable modules
4. Include proper dimensions and tolerances
5. Consider 3D printing constraints (overhangs, supports, etc.)
6. Make the code beginner-friendly with clear structure
7. Add a header comment with the design name and description
8. Use proper OpenSCAD best practices and conventions

Generate ONLY the OpenSCAD code, no additional explanations.`;

    const completion = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: prompt }
      ],
      max_tokens: 2000,
      temperature: 0.7,
    });

    const generatedCode = completion.choices[0]?.message?.content;

    if (!generatedCode) {
      throw new Error('Failed to generate OpenSCAD code');
    }

    // Clean up the generated code
    const cleanCode = generatedCode
      .replace(/^```openscad\n?/i, '')
      .replace(/^```\n?/i, '')
      .replace(/\n?```$/i, '')
      .trim();

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        code: cleanCode,
        prompt: prompt,
        name: name || 'AI Generated Design'
      }),
    };

  } catch (error) {
    console.error('Error generating template:', error);

    // Handle specific OpenAI errors
    if (error.code === 'insufficient_quota') {
      return {
        statusCode: 429,
        headers,
        body: JSON.stringify({ 
          error: 'API quota exceeded. Please try again later.' 
        }),
      };
    }

    if (error.code === 'rate_limit_exceeded') {
      return {
        statusCode: 429,
        headers,
        body: JSON.stringify({ 
          error: 'Rate limit exceeded. Please try again in a few moments.' 
        }),
      };
    }

    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ 
        error: 'Failed to generate design. Please try again.' 
      }),
    };
  }
};