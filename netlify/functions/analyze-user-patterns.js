const { createClient } = require('@supabase/supabase-js');

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
    const { userId } = JSON.parse(event.body);

    if (!userId) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'User ID is required' })
      };
    }

    // Initialize Supabase client
    const supabaseUrl = process.env.SUPABASE_URL;
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !supabaseServiceKey) {
      throw new Error('Missing Supabase configuration');
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Get user's complete history for analysis
    const { data: history, error } = await supabase
      .from('ai_designs')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Database query error:', error);
      return {
        statusCode: 500,
        headers,
        body: JSON.stringify({ error: 'Database query failed' })
      };
    }

    const designs = history || [];

    // Analyze user patterns
    const analytics = {
      totalDesigns: designs.length,
      correctionsCount: designs.filter(d => d.final_code && d.final_code !== d.generated_code).length,
      averageRating: designs.filter(d => d.user_feedback).reduce((sum, d) => sum + d.user_feedback, 0) / designs.filter(d => d.user_feedback).length || 0,
      commonKeywords: [],
      learningTrends: []
    };

    // Extract common keywords from prompts
    const allWords = designs.map(d => d.user_prompt.toLowerCase())
      .join(' ')
      .split(/\s+/)
      .filter(word => word.length > 3);
    
    const wordCounts = {};
    allWords.forEach(word => {
      wordCounts[word] = (wordCounts[word] || 0) + 1;
    });

    analytics.commonKeywords = Object.entries(wordCounts)
      .sort(([,a], [,b]) => b - a)
      .slice(0, 10)
      .map(([word]) => word);

    // Analyze learning trends
    if (designs.length > 0) {
      const recentDesigns = designs.slice(0, 5);
      const olderDesigns = designs.slice(5, 10);

      const recentRating = recentDesigns.filter(d => d.user_feedback).reduce((sum, d) => sum + d.user_feedback, 0) / recentDesigns.filter(d => d.user_feedback).length || 0;
      const olderRating = olderDesigns.filter(d => d.user_feedback).reduce((sum, d) => sum + d.user_feedback, 0) / olderDesigns.filter(d => d.user_feedback).length || 0;

      if (recentRating > olderRating) {
        analytics.learningTrends.push('✅ AI quality is improving over time');
      } else if (recentRating < olderRating) {
        analytics.learningTrends.push('⚠️ AI quality may be declining - more feedback needed');
      }

      const recentCorrections = recentDesigns.filter(d => d.final_code && d.final_code !== d.generated_code).length;
      const olderCorrections = olderDesigns.filter(d => d.final_code && d.final_code !== d.generated_code).length;

      if (recentCorrections < olderCorrections && recentDesigns.length > 0) {
        analytics.learningTrends.push('✅ Fewer corrections needed recently');
      } else if (recentCorrections > olderCorrections && recentDesigns.length > 0) {
        analytics.learningTrends.push('⚠️ More corrections needed recently');
      }

      // Check for repeat patterns
      const promptPatterns = designs.map(d => d.user_prompt.toLowerCase().split(/\s+/).filter(w => w.length > 3).slice(0, 3).join(' '));
      const repeatedPatterns = promptPatterns.filter((pattern, index) => promptPatterns.indexOf(pattern) !== index);
      
      if (repeatedPatterns.length > 0) {
        analytics.learningTrends.push(`🔄 ${repeatedPatterns.length} repeated request patterns found`);
      }
    }

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        success: true,
        analytics
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