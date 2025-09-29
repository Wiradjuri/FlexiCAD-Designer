// Enhanced AI Template Generator with Persistent Learning
// Integrates existing AI training data and learns from user interactions

const { createClient } = require('@supabase/supabase-js');
const OpenAI = require('openai');
const fs = require('fs');
const path = require('path');

// Initialize clients (same as before)
const supabaseService = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

const supabaseAuth = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_ANON_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY
);

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// Load AI training data - CALLED EVERY TIME
function loadTrainingData() {
  try {
    const trainingDataPath = path.join(__dirname, '../..', 'ai-reference', 'ai_training_data.json');
    const enhancedManifestPath = path.join(__dirname, '../..', 'ai-reference', 'enhanced_manifest.json');
    const examplesPath = path.join(__dirname, '../..', 'ai-reference', 'examples.json');
    
    let trainingData = {};
    let enhancedManifest = {};
    let examples = {};
    
    // Always reload from disk to ensure latest data
    if (fs.existsSync(trainingDataPath)) {
      const fileContent = fs.readFileSync(trainingDataPath, 'utf8');
      trainingData = JSON.parse(fileContent);
      const stats = fs.statSync(trainingDataPath);
      console.log(`📚 Loading training data from disk (modified: ${stats.mtime.toISOString()})`);
    } else {
      console.warn(`⚠️ Training data file not found at: ${trainingDataPath}`);
    }
    
    if (fs.existsSync(enhancedManifestPath)) {
      enhancedManifest = JSON.parse(fs.readFileSync(enhancedManifestPath, 'utf8'));
    }
    
    if (fs.existsSync(examplesPath)) {
      examples = JSON.parse(fs.readFileSync(examplesPath, 'utf8'));
    }
    
    const totalExamples = trainingData.examples ? trainingData.examples.length : 0;
    console.log('✅ Training data loaded successfully:', {
      totalExamples: totalExamples,
      enhancedManifest: Object.keys(enhancedManifest).length,
      examples: Object.keys(examples).length,
      hasCodeContent: totalExamples > 0 && trainingData.examples[0]?.content ? '✅ YES' : '❌ NO'
    });
    
    if (totalExamples === 0) {
      console.warn('⚠️ WARNING: No training examples loaded! AI will rely only on user learning.');
    }
    
    return { trainingData, enhancedManifest, examples };
  } catch (error) {
    console.error('❌ ERROR loading training data:', error);
    console.warn('🔄 Falling back to user learning only');
    return { trainingData: {}, enhancedManifest: {}, examples: {} };
  }
}

// Find similar patterns in training data and user history
function findSimilarPatterns(prompt, trainingData) {
  const promptLower = prompt.toLowerCase();
  const keywords = promptLower.split(/\s+/).filter(word => word.length > 3);
  
  const matches = [];
  
  // Search through training data examples array
  const examples = trainingData.examples || [];
  examples.forEach((example, index) => {
    if (example.filename && example.content && example.analysis) {
      const searchText = [
        example.analysis.description || '',
        example.filename || '',
        ...(example.analysis.concepts || []),
        example.content.substring(0, 500) // Include some content for matching
      ].join(' ').toLowerCase();
      
      const matchCount = keywords.filter(keyword => 
        searchText.includes(keyword)
      ).length;
      
      if (matchCount > 0) {
        matches.push({
          key: example.filename,
          data: example,
          relevanceScore: matchCount / keywords.length,
          matchCount
        });
      }
    }
  });
  
  // Sort by relevance
  matches.sort((a, b) => b.relevanceScore - a.relevanceScore);
  
  return matches.slice(0, 5); // Top 5 matches
}

// Find similar user prompts for better learning
function findSimilarUserPrompts(currentPrompt, userHistory) {
  const currentLower = currentPrompt.toLowerCase();
  const currentKeywords = currentLower.split(/\s+/).filter(word => word.length > 3);
  
  return userHistory.filter(session => {
    const sessionLower = session.user_prompt.toLowerCase();
    const sessionKeywords = sessionLower.split(/\s+/).filter(word => word.length > 3);
    
    // Check for keyword overlap
    const overlap = currentKeywords.filter(keyword => 
      sessionKeywords.some(sessionKeyword => 
        sessionKeyword.includes(keyword) || keyword.includes(sessionKeyword)
      )
    ).length;
    
    return overlap >= Math.min(2, currentKeywords.length * 0.3); // At least 30% overlap or 2 keywords
  }).sort((a, b) => {
    // Prioritize sessions with corrections
    const aHasCorrections = a.final_code && a.final_code !== a.generated_code ? 1 : 0;
    const bHasCorrections = b.final_code && b.final_code !== b.generated_code ? 1 : 0;
    return bHasCorrections - aHasCorrections;
  });
}

// Store learning session in database
async function storeLearningSession(userId, sessionData) {
  try {
    const { data, error } = await supabaseService
      .from('ai_learning_sessions')
      .insert({
        user_id: userId,
        session_id: sessionData.sessionId,
        user_prompt: sessionData.userPrompt,
        system_prompt: sessionData.systemPrompt,
        generated_code: sessionData.generatedCode,
        design_category: sessionData.category,
        complexity_level: sessionData.complexityLevel,
        generation_time_ms: sessionData.generationTime,
        tokens_used: sessionData.tokensUsed
      })
      .select()
      .single();

    if (error) {
      console.error('Error storing learning session:', error);
      return null;
    }

    return data.id;
  } catch (error) {
    console.error('Failed to store learning session:', error);
    return null;
  }
}

// Get previous successful generations for this user
async function getUserLearningHistory(userId, limit = 10) {
  try {
    // Get all user sessions with feedback
    const { data, error } = await supabaseService
      .from('ai_learning_sessions')
      .select('user_prompt, generated_code, final_code, user_feedback, design_category, updated_at')
      .eq('user_id', userId)
      .not('user_feedback', 'is', null)
      .order('updated_at', { ascending: false })
      .limit(limit * 2); // Get more records to filter from

    if (error) {
      console.error('Error fetching user history:', error);
      return [];
    }

    // Prioritize sessions with corrections (final_code different from generated_code) and high ratings
    const sessions = (data || []).sort((a, b) => {
      const aHasCorrections = a.final_code && a.final_code !== a.generated_code ? 1 : 0;
      const bHasCorrections = b.final_code && b.final_code !== b.generated_code ? 1 : 0;
      
      // First priority: has corrections
      if (aHasCorrections !== bHasCorrections) {
        return bHasCorrections - aHasCorrections;
      }
      
      // Second priority: rating
      return (b.user_feedback || 0) - (a.user_feedback || 0);
    });

    console.log(`Found ${sessions.length} learning sessions for user ${userId}, ${sessions.filter(s => s.final_code && s.final_code !== s.generated_code).length} with corrections`);
    
    return sessions.slice(0, limit);
  } catch (error) {
    console.error('Failed to get user history:', error);
    return [];
  }
}

// Load curated training examples and assets for enhanced learning
async function loadCuratedLearningData(category, tags = [], limit = 5) {
  const curatedExamples = [];
  const trainingAssets = { svg: 0, scad: 0, jsonl: 0 };
  
  try {
    // Load curated examples from ai_training_examples table
    const { data: examples, error: examplesError } = await supabaseService
      .from('ai_training_examples')
      .select('input_prompt, generated_code, quality_score, quality_label, tags, category')
      .eq('active', true)
      .gte('quality_score', 4) // Only high-quality examples (4-5 stars)
      .order('quality_score', { ascending: false })
      .limit(limit);

    if (!examplesError && examples) {
      // Filter by category and tags if provided
      const filteredExamples = examples.filter(example => {
        const categoryMatch = !category || example.category === category;
        const tagMatch = tags.length === 0 || tags.some(tag => 
          example.tags && example.tags.includes(tag)
        );
        return categoryMatch || tagMatch;
      });

      curatedExamples.push(...filteredExamples.slice(0, limit));
    }

    // Load training assets metadata (not full content - just references)
    const { data: assets, error: assetsError } = await supabaseService
      .from('training_assets')
      .select('asset_type, filename, tags')
      .eq('active', true);

    if (!assetsError && assets) {
      assets.forEach(asset => {
        if (trainingAssets[asset.asset_type] !== undefined) {
          trainingAssets[asset.asset_type]++;
        }
      });
    }

    console.log(`📚 [loadCuratedLearningData] Loaded ${curatedExamples.length} curated examples (category: ${category || 'any'})`);
    console.log(`📋 [loadCuratedLearningData] Referenced assets: svg:${trainingAssets.svg}, scad:${trainingAssets.scad}, jsonl:${trainingAssets.jsonl}`);

  } catch (error) {
    console.warn('⚠️ [loadCuratedLearningData] Failed to load curated data:', error.message);
  }

  return { curatedExamples, trainingAssets };
}

// Build enhanced system prompt with learning context
function buildEnhancedSystemPrompt(prompt, similarPatterns, userHistory, trainingData, similarUserPrompts = [], curatedData = null) {
  let systemPrompt = `You are an expert OpenSCAD developer with access to DUAL LEARNING SOURCES: a comprehensive reference library AND personalized user learning history. Generate clean, well-commented, parametric OpenSCAD code based on the user's description.

🎓 LEARNING ARCHITECTURE:
- 📚 REFERENCE LEARNING: ${trainingData.examples ? trainingData.examples.length : 0} professional OpenSCAD examples
- 👤 USER LEARNING: ${userHistory.length} personalized sessions with corrections and feedback
- 🔄 ADAPTIVE: Combines best practices with user preferences

CORE GUIDELINES:
1. Always include parameters at the top for easy customization
2. Use meaningful variable names and add comments
3. Create modular, reusable modules
4. Include proper dimensions and tolerances
5. Consider 3D printing constraints (overhangs, supports, etc.)
6. Make the code beginner-friendly with clear structure
7. Add a header comment with the design name and description
8. Use proper OpenSCAD best practices and conventions`;

  // Add similar patterns if found - REFERENCE LEARNING
  if (similarPatterns.length > 0) {
    systemPrompt += `\n\n📚 REFERENCE LIBRARY PATTERNS (${similarPatterns.length} matches found):\n`;
    systemPrompt += `These are professional OpenSCAD examples from the knowledge base:\n`;
    similarPatterns.forEach((pattern, index) => {
      systemPrompt += `\nReference ${index + 1} (Relevance: ${Math.round(pattern.relevanceScore * 100)}%):\n`;
      if (pattern.data.description) {
        systemPrompt += `Description: ${pattern.data.description}\n`;
      }
      if (pattern.data.content) {
        systemPrompt += `Example Code:\n${pattern.data.content.substring(0, 600)}${pattern.data.content.length > 600 ? '...' : ''}\n`;
      }
      if (pattern.data.analysis && pattern.data.analysis.concepts) {
        systemPrompt += `Key Concepts: ${pattern.data.analysis.concepts.join(', ')}\n`;
      }
    });
  } else {
    systemPrompt += `\n\n📚 REFERENCE LIBRARY: No direct pattern matches found, but ${trainingData.examples ? trainingData.examples.length : 0} examples available for general best practices.`;
  }

  // Add user's learning history with STRONG emphasis on corrections - USER LEARNING
  if (userHistory.length > 0) {
    systemPrompt += `\n\n👤 USER PERSONALIZATION (${userHistory.length} sessions analyzed):\n`;
    systemPrompt += `The user has provided ${userHistory.length} previous interactions. COMBINE reference patterns with user preferences!\n`;
    
    // First show similar prompts with corrections if available
    if (similarUserPrompts.length > 0) {
      systemPrompt += `\n🎯 SIMILAR USER REQUESTS (HIGHEST PRIORITY - ${similarUserPrompts.length} found):\n`;
      
      similarUserPrompts.slice(0, 2).forEach((session, index) => {
        systemPrompt += `\n=== SIMILAR REQUEST ${index + 1} ===\n`;
        systemPrompt += `User Asked: "${session.user_prompt}"\n`;
        
        if (session.final_code && session.final_code !== session.generated_code) {
          systemPrompt += `🔧 USER CORRECTED THE CODE TO:\n${session.final_code.substring(0, 600)}${session.final_code.length > 600 ? '...' : ''}\n`;
          systemPrompt += `⚠️ CRITICAL: Use this corrected approach for similar requests!\n`;
        } else {
          systemPrompt += `Generated Code: ${session.generated_code.substring(0, 400)}${session.generated_code.length > 400 ? '...' : ''}\n`;
        }
        
        if (session.user_feedback !== null) {
          systemPrompt += `Rating: ${session.user_feedback}/5 ${session.user_feedback <= 3 ? '(POOR - avoid this approach!)' : '(GOOD - replicate this style!)'}\n`;
        }
      });
    }
    
    // Then show other learning examples
    const remainingHistory = userHistory.filter(h => 
      !similarUserPrompts.some(s => s.id === h.id)
    ).slice(0, 3);
    
    if (remainingHistory.length > 0) {
      systemPrompt += `\n📚 ADDITIONAL USER PREFERENCES:\n`;
      
      remainingHistory.forEach((session, index) => {
        systemPrompt += `\n--- Example ${index + 1} ---\n`;
        systemPrompt += `Request: ${session.user_prompt}\n`;
        
        if (session.final_code && session.final_code !== session.generated_code) {
          systemPrompt += `🔧 USER'S CORRECTED VERSION:\n${session.final_code.substring(0, 500)}${session.final_code.length > 500 ? '...' : ''}\n`;
          systemPrompt += `💡 LEARNING: User prefers this approach!\n`;
        } else {
          systemPrompt += `Generated: ${session.generated_code.substring(0, 300)}${session.generated_code.length > 300 ? '...' : ''}\n`;
        }
        
        if (session.user_feedback !== null) {
          systemPrompt += `Rating: ${session.user_feedback}/5\n`;
        }
      });
    }
    
    systemPrompt += `\n🚨 MANDATE: Apply the user's corrections and preferences from above. Don't repeat mistakes they've already fixed!`;
  } else {
    systemPrompt += `\n\n👤 USER LEARNING: No user history yet - relying on reference library patterns for best practices.`;
  }

  // Add curated training examples if available - ADMIN CURATED LEARNING
  if (curatedData && curatedData.curatedExamples.length > 0) {
    systemPrompt += `\n\n✨ ADMIN CURATED EXAMPLES (${curatedData.curatedExamples.length} high-quality examples):\n`;
    systemPrompt += `These are manually reviewed and approved examples with 4-5 star ratings:\n`;
    
    curatedData.curatedExamples.slice(0, 3).forEach((example, index) => {
      systemPrompt += `\n=== CURATED EXAMPLE ${index + 1} (${example.quality_score}★ ${example.quality_label}) ===\n`;
      systemPrompt += `Prompt: "${example.input_prompt}"\n`;
      systemPrompt += `Quality Code:\n${example.generated_code.substring(0, 600)}${example.generated_code.length > 600 ? '...' : ''}\n`;
      if (example.tags && example.tags.length > 0) {
        systemPrompt += `Tags: ${example.tags.join(', ')}\n`;
      }
    });
    
    systemPrompt += `\n🏆 USE THESE: Apply the patterns and quality standards from these curated examples!`;
  }

  // Add training assets reference if available
  if (curatedData && (curatedData.trainingAssets.svg > 0 || curatedData.trainingAssets.scad > 0 || curatedData.trainingAssets.jsonl > 0)) {
    systemPrompt += `\n\n📋 TRAINING ASSETS AVAILABLE:\n`;
    systemPrompt += `Referenced training files: SVG:${curatedData.trainingAssets.svg}, SCAD:${curatedData.trainingAssets.scad}, JSONL:${curatedData.trainingAssets.jsonl}\n`;
    systemPrompt += `💡 Follow conventions from available reference assets when applicable.`;
  }

  systemPrompt += `\n\n🔄 SYNTHESIS INSTRUCTION: 
COMBINE both learning sources:
1. 📚 Use reference library patterns for technical best practices and proven techniques
2. 👤 Apply user corrections and preferences for personalized style
3. 🎯 Prioritize user corrections over reference patterns when they conflict
4. 🏗️ Generate production-ready, well-documented OpenSCAD code ONLY (no explanations)`;

  return systemPrompt;
}

// Categorize and assess complexity of the prompt
function analyzePrompt(prompt) {
  const promptLower = prompt.toLowerCase();
  
  // Design categories
  const categories = {
    'mechanical': ['gear', 'bearing', 'screw', 'bolt', 'washer', 'bracket', 'mount', 'clamp'],
    'decorative': ['vase', 'ornament', 'sculpture', 'art', 'decorative', 'figurine'],
    'functional': ['box', 'container', 'holder', 'organizer', 'tray', 'stand', 'rack'],
    'toy': ['toy', 'game', 'puzzle', 'dice', 'fidget', 'spinner'],
    'architectural': ['house', 'building', 'structure', 'wall', 'roof', 'pillar'],
    'electronic': ['case', 'enclosure', 'pcb', 'arduino', 'raspberry', 'sensor']
  };
  
  let category = 'general';
  for (const [cat, keywords] of Object.entries(categories)) {
    if (keywords.some(keyword => promptLower.includes(keyword))) {
      category = cat;
      break;
    }
  }
  
  // Complexity assessment
  const complexityIndicators = {
    beginner: ['simple', 'basic', 'easy', 'cube', 'cylinder', 'sphere'],
    intermediate: ['parametric', 'module', 'array', 'loop', 'conditional'],
    advanced: ['complex', 'intricate', 'animation', 'advanced', 'algorithm', 'mathematical']
  };
  
  let complexity = 'intermediate'; // default
  for (const [level, keywords] of Object.entries(complexityIndicators)) {
    if (keywords.some(keyword => promptLower.includes(keyword))) {
      complexity = level;
      break;
    }
  }
  
  return { category, complexity };
}

exports.handler = async (event, context) => {
  const startTime = Date.now();
  
  // CORS headers (same as before)
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
      body: JSON.stringify({ error: 'Method not allowed' }),
    };
  }

  try {
    const { prompt, name } = JSON.parse(event.body);

    if (!prompt || prompt.trim().length === 0) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'Prompt is required' }),
      };
    }

    // Authentication (same as before)
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

    // Extract user ID from JWT
    try {
      const tokenParts = token.split('.');
      if (tokenParts.length !== 3) {
        throw new Error('Invalid JWT format');
      }

      const payloadBase64 = tokenParts[1];
      const payload = JSON.parse(Buffer.from(payloadBase64, 'base64').toString());
      userId = payload.sub || payload.user_id;

      if (!userId) {
        throw new Error('No user ID found in token');
      }
    } catch (err) {
      console.error('Failed to extract user ID:', err);
      return {
        statusCode: 401,
        headers,
        body: JSON.stringify({ error: 'Invalid token format' }),
      };
    }

    // Verify payment status
    try {
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

      console.log('User has valid payment, loading enhanced AI context...');
    } catch (authErr) {
      return {
        statusCode: 500,
        headers,
        body: JSON.stringify({ error: 'Authentication verification failed' }),
      };
    }

    // Load training data and analyze prompt - ALWAYS LOADED EVERY TIME
    const { trainingData, enhancedManifest, examples } = loadTrainingData();
    const { category, complexity } = analyzePrompt(prompt);
    
    // Find similar patterns in training data - REFERENCE LEARNING
    const similarPatterns = findSimilarPatterns(prompt, trainingData);
    
    // Get user's learning history - USER LEARNING
    const userHistory = await getUserLearningHistory(userId);
    
    // Find similar user prompts for better learning
    const similarUserPrompts = findSimilarUserPrompts(prompt, userHistory);
    
    // Load curated training examples and assets - ADMIN CURATED LEARNING
    const curatedData = await loadCuratedLearningData(category, [], 5);
    
    // Enhanced logging to verify all learning sources are active
    console.log(`🎓 LEARNING SOURCES ACTIVE:`);
    console.log(`  📚 Reference Training Data: ${trainingData.examples ? trainingData.examples.length : 0} examples loaded`);
    console.log(`  👤 User Learning History: ${userHistory.length} user sessions`);
    console.log(`  🔍 Similar Reference Patterns: ${similarPatterns.length} found`);
    console.log(`  🎯 Similar User Prompts: ${similarUserPrompts.length} found`);
    console.log(`  ✨ Curated Examples: ${curatedData.curatedExamples.length} admin-approved examples`);
    console.log(`  📋 Training Assets: ${curatedData.trainingAssets.svg + curatedData.trainingAssets.scad + curatedData.trainingAssets.jsonl} reference files`);
    console.log(`  📊 Combined Learning: Reference + User corrections + Admin curation + Feedback`);
    
    // Build enhanced system prompt
    const systemPrompt = buildEnhancedSystemPrompt(prompt, similarPatterns, userHistory, trainingData, similarUserPrompts, curatedData);
    
    console.log(`Generating ${complexity} ${category} design with ${similarPatterns.length} similar patterns, ${userHistory.length} user examples, and ${curatedData.curatedExamples.length} curated examples`);

    // Generate with OpenAI
    const completion = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: prompt }
      ],
      max_tokens: 2500, // Increased for more detailed code
      temperature: 0.6, // Slightly more creative but still consistent
    });

    const generatedCode = completion.choices[0]?.message?.content;

    if (!generatedCode) {
      throw new Error('Failed to generate OpenSCAD code');
    }

    // Clean up the code
    const cleanCode = generatedCode
      .replace(/^```openscad\n?/i, '')
      .replace(/^```\n?/i, '')
      .replace(/\n?```$/i, '')
      .trim();

    const generationTime = Date.now() - startTime;
    const tokensUsed = completion.usage?.total_tokens || 0;

    // Store learning session (fire and forget - don't wait for it)
    const sessionId = `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    storeLearningSession(userId, {
      sessionId,
      userPrompt: prompt,
      systemPrompt,
      generatedCode: cleanCode,
      category,
      complexityLevel: complexity,
      generationTime,
      tokensUsed
    }).catch(err => console.error('Failed to store session:', err));

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        code: cleanCode,
        prompt: prompt,
        name: name || 'AI Generated Design',
        success: true,
        metadata: {
          category,
          complexity,
          similarPatterns: similarPatterns.length,
          userExamples: userHistory.length,
          generationTime,
          tokensUsed,
          sessionId
        },
        debugInfo: {
          patternsCount: similarPatterns.length,
          historyCount: userHistory.length,
          similarPromptsCount: similarUserPrompts.length,
          hasCorrections: userHistory.some(h => h.final_code && h.final_code !== h.generated_code),
          sessionId: sessionId
        }
      }),
    };

  } catch (error) {
    console.error('Error generating template:', error);

    // Handle specific OpenAI errors (same as before)
    if (error.code === 'insufficient_quota') {
      return {
        statusCode: 429,
        headers,
        body: JSON.stringify({ error: 'API quota exceeded. Please try again later.' }),
      };
    }

    if (error.code === 'rate_limit_exceeded') {
      return {
        statusCode: 429,
        headers,
        body: JSON.stringify({ error: 'Rate limit exceeded. Please try again in a few moments.' }),
      };
    }

    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: 'Failed to generate design. Please try again.' }),
    };
  }
};