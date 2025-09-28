const { createClient } = require('@supabase/supabase-js');
const fs = require('fs').promises;
const path = require('path');

exports.handler = async (event, context) => {
  // Enable CORS
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
  };

  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers, body: '' };
  }

  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      headers,
      body: JSON.stringify({ error: 'Method not allowed' })
    };
  }

  try {
    const { prompt, userId } = JSON.parse(event.body);

    if (!prompt || !userId) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'Prompt and user ID are required' })
      };
    }

    // Initialize Supabase client
    const supabaseUrl = process.env.SUPABASE_URL;
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !supabaseServiceKey) {
      throw new Error('Missing Supabase configuration');
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Load training data
    const trainingDataPath = path.join(process.cwd(), 'ai-reference', 'ai_training_data.json');
    let trainingData = {};
    
    try {
      const trainingContent = await fs.readFile(trainingDataPath, 'utf8');
      trainingData = JSON.parse(trainingContent);
    } catch (error) {
      console.log('Could not load training data:', error.message);
    }

    // Get user learning history with corrections prioritized
    const { data: userHistory, error } = await supabase
      .from('ai_designs')
      .select('*')
      .eq('user_id', userId)
      .not('user_feedback', 'is', null)
      .order('created_at', { ascending: false })
      .limit(15);

    if (error) {
      console.error('Database query error:', error);
      return {
        statusCode: 500,
        headers,
        body: JSON.stringify({ error: 'Database query failed' })
      };
    }

    // Find similar patterns (simplified version of the main function)
    function findSimilarPatterns(prompt, trainingData) {
      const promptLower = prompt.toLowerCase();
      const keywords = promptLower.split(/\s+/).filter(word => word.length > 3);
      
      const matches = [];
      
      Object.entries(trainingData).forEach(([key, data]) => {
        if (data.description || data.prompt || data.keywords) {
          const searchText = [
            data.description || '',
            data.prompt || '',
            ...(data.keywords || [])
          ].join(' ').toLowerCase();
          
          const matchCount = keywords.filter(keyword => 
            searchText.includes(keyword)
          ).length;
          
          if (matchCount > 0) {
            matches.push({
              key,
              data,
              relevanceScore: matchCount / keywords.length,
              matchCount
            });
          }
        }
      });
      
      matches.sort((a, b) => b.relevanceScore - a.relevanceScore);
      return matches.slice(0, 3);
    }

    // Find similar user prompts
    function findSimilarUserPrompts(currentPrompt, userHistory) {
      const currentLower = currentPrompt.toLowerCase();
      const currentKeywords = currentLower.split(/\s+/).filter(word => word.length > 3);
      
      return userHistory.filter(session => {
        const sessionLower = session.user_prompt.toLowerCase();
        const sessionKeywords = sessionLower.split(/\s+/).filter(word => word.length > 3);
        
        const overlap = currentKeywords.filter(keyword => 
          sessionKeywords.some(sessionKeyword => 
            sessionKeyword.includes(keyword) || keyword.includes(sessionKeyword)
          )
        ).length;
        
        return overlap >= Math.min(2, currentKeywords.length * 0.3);
      }).sort((a, b) => {
        const aHasCorrections = a.final_code && a.final_code !== a.generated_code ? 1 : 0;
        const bHasCorrections = b.final_code && b.final_code !== b.generated_code ? 1 : 0;
        return bHasCorrections - aHasCorrections;
      });
    }

    const similarPatterns = findSimilarPatterns(prompt, trainingData);
    const similarUserPrompts = findSimilarUserPrompts(prompt, userHistory || []);

    // Build system prompt (simplified version)
    const baseSystemPrompt = `You are an expert OpenSCAD developer with access to a comprehensive knowledge base. Generate clean, well-commented, parametric OpenSCAD code based on the user's description.`;

    let systemPrompt = baseSystemPrompt;

    // Add similar patterns
    if (similarPatterns.length > 0) {
      systemPrompt += `\n\nRELEVANT PATTERNS FROM KNOWLEDGE BASE:\n`;
      similarPatterns.forEach((pattern, index) => {
        systemPrompt += `\nPattern ${index + 1} (Relevance: ${Math.round(pattern.relevanceScore * 100)}%):\n`;
        if (pattern.data.description) {
          systemPrompt += `Description: ${pattern.data.description}\n`;
        }
        if (pattern.data.code) {
          systemPrompt += `Example Code:\n${pattern.data.code.substring(0, 300)}...\n`;
        }
      });
    }

    // Add user learning history
    if (userHistory && userHistory.length > 0) {
      systemPrompt += `\n\n🎯 CRITICAL: USER'S LEARNING HISTORY AND CORRECTIONS:\n`;
      systemPrompt += `The user has provided ${userHistory.length} previous interactions. YOU MUST LEARN FROM THEIR CORRECTIONS!\n`;
      
      if (similarUserPrompts.length > 0) {
        systemPrompt += `\n🔍 SIMILAR REQUESTS (HIGHEST PRIORITY FOR LEARNING):\n`;
        
        similarUserPrompts.slice(0, 2).forEach((session, index) => {
          systemPrompt += `\n=== SIMILAR REQUEST ${index + 1} ===\n`;
          systemPrompt += `User Asked: "${session.user_prompt}"\n`;
          
          if (session.final_code && session.final_code !== session.generated_code) {
            systemPrompt += `🔧 USER CORRECTED THE CODE TO:\n${session.final_code.substring(0, 400)}...\n`;
            systemPrompt += `⚠️ CRITICAL: Use this corrected approach for similar requests!\n`;
          }
          
          if (session.user_feedback !== null) {
            systemPrompt += `Rating: ${session.user_feedback}/5\n`;
          }
        });
      }

      systemPrompt += `\n🚨 MANDATE: Apply the user's corrections and preferences from above. Don't repeat mistakes they've already fixed!`;
    }

    systemPrompt += `\n\nIMPORTANT: Learn from the patterns and user history above. Generate ONLY the OpenSCAD code, no additional explanations.`;

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        success: true,
        systemPrompt: systemPrompt,
        debugInfo: {
          patternsCount: similarPatterns.length,
          historyCount: userHistory?.length || 0,
          similarPromptsCount: similarUserPrompts.length
        }
      })
    };

  } catch (error) {
    console.error('Function error:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ 
        error: 'Internal server error',
        details: error.message 
      })
    };
  }
};