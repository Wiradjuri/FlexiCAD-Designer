const { createClient } = require('@supabase/supabase-js');
const OpenAI = require('openai');

const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
);

const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY
});

// CORS headers
const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

exports.handler = async (event, context) => {
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
        const { prompt, name = null } = JSON.parse(event.body);
        
        // Get user from auth token
        const authHeader = event.headers.authorization;
        if (!authHeader) {
            throw new Error('No authorization header');
        }

        const token = authHeader.replace('Bearer ', '');
        const { data: { user }, error: authError } = await supabase.auth.getUser(token);
        
        if (authError || !user) {
            throw new Error('Invalid authentication');
        }

        // Check if user is paid
        const { data: profile } = await supabase
            .from('profiles')
            .select('is_paid, is_active')
            .eq('id', user.id)
            .single();

        if (!profile?.is_paid || !profile?.is_active) {
            return {
                statusCode: 403,
                headers,
                body: JSON.stringify({ error: 'Subscription required' })
            };
        }

        // Generate session ID
        const sessionId = `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        
        // Get AI learning context
        const learningContext = await buildLearningContext(prompt, user.id);
        
        // Build enhanced system prompt
        const systemPrompt = buildEnhancedSystemPrompt(learningContext);
        
        // Generate code with OpenAI
        const startTime = Date.now();
        
        const completion = await openai.chat.completions.create({
            model: "gpt-4",
            messages: [
                { role: "system", content: systemPrompt },
                { role: "user", content: `Create OpenSCAD code for: ${prompt}` }
            ],
            max_tokens: 2000,
            temperature: 0.7
        });

        const generationTime = Date.now() - startTime;
        const generatedCode = completion.choices[0].message.content;
        const tokensUsed = completion.usage?.total_tokens || 0;

        // Determine design category and complexity
        const designCategory = categorizeDesign(prompt);
        const complexityLevel = determineComplexity(generatedCode);

        // Store learning session
        const { data: learningSession, error: sessionError } = await supabase
            .from('ai_learning_sessions')
            .insert({
                user_id: user.id,
                session_id: sessionId,
                user_prompt: prompt,
                system_prompt: systemPrompt,
                generated_code: generatedCode,
                design_category: designCategory,
                complexity_level: complexityLevel,
                generation_time_ms: generationTime,
                tokens_used: tokensUsed
            })
            .select()
            .single();

        if (sessionError) {
            console.error('Error storing learning session:', sessionError);
        }

        return {
            statusCode: 200,
            headers,
            body: JSON.stringify({
                code: generatedCode,
                prompt: prompt,
                name: name || generateDesignName(prompt),
                metadata: {
                    sessionId: sessionId,
                    category: designCategory,
                    complexity: complexityLevel,
                    similarPatterns: learningContext.similarPatterns.length,
                    userExamples: learningContext.userHistory.length,
                    generationTime: generationTime,
                    tokensUsed: tokensUsed
                }
            })
        };

    } catch (error) {
        console.error('Generation error:', error);
        return {
            statusCode: 500,
            headers,
            body: JSON.stringify({ error: error.message })
        };
    }
};

// Build learning context from knowledge base and user history
async function buildLearningContext(prompt, userId) {
    try {
        // Get similar patterns from knowledge base
        const { data: similarPatterns } = await supabase
            .rpc('find_similar_patterns', { 
                prompt_text: prompt, 
                limit_count: 5 
            });

        // Get user's successful history
        const { data: userHistory } = await supabase
            .from('ai_learning_sessions')
            .select('user_prompt, generated_code, final_code, user_feedback')
            .eq('user_id', userId)
            .gte('user_feedback', 4)
            .order('created_at', { ascending: false })
            .limit(3);

        return {
            similarPatterns: similarPatterns || [],
            userHistory: userHistory || []
        };
    } catch (error) {
        console.error('Error building learning context:', error);
        return { similarPatterns: [], userHistory: [] };
    }
}

// Build enhanced system prompt with learning context
function buildEnhancedSystemPrompt(context) {
    let prompt = `You are an expert OpenSCAD code generator for FlexiCAD Designer. Generate clean, parametric, and well-commented OpenSCAD code.

CORE PRINCIPLES:
- Write parametric code with configurable variables at the top
- Use descriptive variable names and clear comments
- Include proper modules for reusability
- Focus on printable designs with good geometry
- Use appropriate tolerances and clearances

STANDARD TEMPLATE:
\`\`\`
// ============================== PARAMETERS ==============================
// Customizable parameters - modify these values
length = 100;    // Main length dimension (mm)
width = 50;      // Main width dimension (mm)
height = 25;     // Main height dimension (mm)
wall_thickness = 2;  // Wall thickness (mm)

// ============================== MODULES ==============================
module main_object() {
    // Your main design code here
}

// ============================== MAIN ==============================
main_object();
\`\`\`

BEST PRACTICES:
- Always use meaningful parameter names
- Include units in comments (mm, degrees, etc.)
- Use difference() for creating holes and cutouts
- Use union() only when necessary
- Prefer translate() over complex coordinate math
- Include small tolerances (0.1-0.2mm) for fitting parts`;

    // Add similar patterns if available
    if (context.similarPatterns.length > 0) {
        prompt += `\n\nRELEVANT SUCCESSFUL PATTERNS:`;
        context.similarPatterns.forEach((pattern, i) => {
            prompt += `\n\n${i + 1}. ${pattern.description}
Example: "${pattern.example_prompt}"
Key techniques: ${pattern.successful_code.substring(0, 200)}...`;
        });
    }

    // Add user's successful history
    if (context.userHistory.length > 0) {
        prompt += `\n\nUSER'S SUCCESSFUL DESIGNS:`;
        context.userHistory.forEach((session, i) => {
            const codeToUse = session.final_code || session.generated_code;
            prompt += `\n\n${i + 1}. "${session.user_prompt}" (Rating: ${session.user_feedback}/5)
Successful approach: ${codeToUse.substring(0, 200)}...`;
        });
    }

    prompt += `\n\nGenerate complete, functional OpenSCAD code following these patterns and principles.`;
    
    return prompt;
}

// Categorize design type
function categorizeDesign(prompt) {
    const categories = {
        'electronics': ['phone', 'case', 'enclosure', 'box', 'housing', 'mount', 'bracket'],
        'functional': ['organizer', 'holder', 'stand', 'rack', 'tray', 'container'],
        'mechanical': ['gear', 'bearing', 'joint', 'hinge', 'connector', 'adapter'],
        'decorative': ['ornament', 'figurine', 'sculpture', 'art', 'decoration'],
        'tools': ['jig', 'fixture', 'template', 'guide', 'clamp'],
        'household': ['kitchen', 'bathroom', 'furniture', 'appliance'],
        'automotive': ['car', 'vehicle', 'dashboard', 'interior']
    };

    const lowerPrompt = prompt.toLowerCase();
    for (const [category, keywords] of Object.entries(categories)) {
        if (keywords.some(keyword => lowerPrompt.includes(keyword))) {
            return category;
        }
    }
    return 'general';
}

// Determine complexity level
function determineComplexity(code) {
    let score = 0;
    
    // Basic shapes = low complexity
    score += (code.match(/cube|sphere|cylinder/g) || []).length * 1;
    
    // Operations = medium complexity  
    score += (code.match(/difference|union|intersection/g) || []).length * 2;
    
    // Transformations = medium complexity
    score += (code.match(/translate|rotate|scale/g) || []).length * 2;
    
    // Advanced features = high complexity
    score += (code.match(/linear_extrude|rotate_extrude|hull/g) || []).length * 3;
    score += (code.match(/module|function/g) || []).length * 4;
    score += (code.match(/for|if/g) || []).length * 3;
    
    if (score < 10) return 'beginner';
    if (score < 25) return 'intermediate';
    return 'advanced';
}

// Generate design name from prompt
function generateDesignName(prompt) {
    // Extract key nouns and create a clean name
    const words = prompt.toLowerCase()
        .replace(/[^\w\s]/g, '')
        .split(/\s+/)
        .filter(word => word.length > 2)
        .slice(0, 3);
    
    return words.map(word => 
        word.charAt(0).toUpperCase() + word.slice(1)
    ).join(' ');
}