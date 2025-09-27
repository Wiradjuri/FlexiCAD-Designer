const { createClient } = require('@supabase/supabase-js');
const OpenAI = require('openai');

// Check if environment variables are loaded
console.log('Environment check:');
console.log('SUPABASE_URL:', process.env.SUPABASE_URL ? 'Set' : 'Missing');
console.log('SUPABASE_SERVICE_ROLE_KEY:', process.env.SUPABASE_SERVICE_ROLE_KEY ? 'Set' : 'Missing');
console.log('SUPABASE_ANON_KEY:', process.env.SUPABASE_ANON_KEY ? 'Set' : 'Missing');
console.log('OPENAI_API_KEY:', process.env.OPENAI_API_KEY ? 'Set' : 'Missing');

// Initialize clients
const supabaseService = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY // Use service role key for database operations
);

// Check if SUPABASE_ANON_KEY is available
if (!process.env.SUPABASE_ANON_KEY) {
  console.error('SUPABASE_ANON_KEY is missing! Using service key for auth validation (not recommended)');
}

const supabaseAuth = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_ANON_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY // Fallback to service key
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

    // Simplified authentication - extract user ID from JWT payload
    const authToken = event.headers.authorization?.replace('Bearer ', '');
    
    console.log('Raw auth header:', event.headers.authorization);
    console.log('Auth token type:', typeof authToken);
    console.log('Auth token value:', authToken);
    
    if (!authToken) {
      console.log('No auth token provided');
      return {
        statusCode: 401,
        headers,
        body: JSON.stringify({ error: 'Authentication required' }),
      };
    }

    console.log('Auth token received, extracting user ID...');
    console.log('Token preview:', authToken.substring(0, 50) + '...');

    let userId;
    try {
      // Check if token has the expected JWT format (3 parts separated by dots)
      const tokenParts = authToken.split('.');
      console.log('Token parts count:', tokenParts.length);
      
      if (tokenParts.length !== 3) {
        throw new Error(`Invalid JWT format - expected 3 parts, got ${tokenParts.length}`);
      }
      
      // Decode JWT payload (without verification - just for user ID)
      const payloadBase64 = tokenParts[1];
      console.log('Payload base64 length:', payloadBase64 ? payloadBase64.length : 'undefined');
      
      if (!payloadBase64) {
        throw new Error('JWT payload part is empty');
      }
      
      const payload = JSON.parse(Buffer.from(payloadBase64, 'base64').toString());
      console.log('JWT payload keys:', Object.keys(payload));
      console.log('JWT payload sub:', payload.sub);
      console.log('JWT payload user_id:', payload.user_id);
      
      userId = payload.sub || payload.user_id; // Try both common user ID fields
      
      console.log('User ID extracted:', userId);
      
      if (!userId) {
        throw new Error('No user ID found in token (checked sub and user_id fields)');
      }
    } catch (err) {
      console.error('Failed to extract user ID from token:', err);
      return {
        statusCode: 401,
        headers,
        body: JSON.stringify({ error: 'Invalid token format' }),
      };
    }

    // Verify payment status using service role
    try {
      const { data: profile, error: profileError } = await supabaseService
        .from('profiles')
        .select('is_paid, is_active, email')
        .eq('id', userId)
        .single();

      if (profileError) {
        console.error('Profile query failed:', profileError);
        return {
          statusCode: 401,
          headers,
          body: JSON.stringify({ error: 'User not found' }),
        };
      }

      if (!profile?.is_paid || !profile?.is_active) {
        console.error('User payment check failed - not paid or inactive');
        return {
          statusCode: 403,
          headers,
          body: JSON.stringify({ error: 'Payment required' }),
        };
      }

      console.log('User has valid payment, proceeding with generation for:', profile.email);

    } catch (authErr) {
      console.error('Payment verification error:', authErr);
      return {
        statusCode: 500,
        headers,
        body: JSON.stringify({ error: 'Authentication verification failed' }),
      };
    }

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