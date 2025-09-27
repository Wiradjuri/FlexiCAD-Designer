-- AI Learning System Database Schema
-- This will store AI interactions and build a knowledge base

-- Table to store AI training conversations and outcomes
CREATE TABLE IF NOT EXISTS ai_learning_sessions (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
    session_id UUID DEFAULT gen_random_uuid(),
    user_prompt TEXT NOT NULL,
    system_prompt TEXT NOT NULL,
    generated_code TEXT NOT NULL,
    user_feedback INTEGER CHECK (user_feedback BETWEEN 1 AND 5), -- 1-5 rating
    feedback_text TEXT,
    was_modified BOOLEAN DEFAULT FALSE,
    final_code TEXT, -- If user modified the generated code
    design_category VARCHAR(100),
    complexity_level VARCHAR(20) CHECK (complexity_level IN ('beginner', 'intermediate', 'advanced')),
    generation_time_ms INTEGER,
    tokens_used INTEGER,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Table to store successful patterns and templates
CREATE TABLE IF NOT EXISTS ai_knowledge_base (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    pattern_name VARCHAR(255) NOT NULL,
    description TEXT,
    keywords TEXT[], -- Array of keywords for matching
    example_prompt TEXT NOT NULL,
    successful_code TEXT NOT NULL,
    usage_count INTEGER DEFAULT 1,
    average_rating DECIMAL(3,2) DEFAULT 0.0,
    category VARCHAR(100),
    complexity_level VARCHAR(20) CHECK (complexity_level IN ('beginner', 'intermediate', 'advanced')),
    created_from_session UUID REFERENCES ai_learning_sessions(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(pattern_name)
);

-- Table to store user corrections and improvements
CREATE TABLE IF NOT EXISTS ai_corrections (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    session_id UUID REFERENCES ai_learning_sessions(id) ON DELETE CASCADE,
    user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
    original_code TEXT NOT NULL,
    corrected_code TEXT NOT NULL,
    correction_type VARCHAR(50), -- 'syntax', 'logic', 'optimization', 'style'
    description TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Table to store common mistakes and how to avoid them
CREATE TABLE IF NOT EXISTS ai_mistake_patterns (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    mistake_pattern TEXT NOT NULL,
    mistake_description TEXT,
    correct_approach TEXT NOT NULL,
    example_fix TEXT,
    occurrence_count INTEGER DEFAULT 1,
    severity VARCHAR(20) CHECK (severity IN ('low', 'medium', 'high', 'critical')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_ai_learning_user_id ON ai_learning_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_ai_learning_category ON ai_learning_sessions(design_category);
CREATE INDEX IF NOT EXISTS idx_ai_learning_created ON ai_learning_sessions(created_at);
CREATE INDEX IF NOT EXISTS idx_ai_knowledge_keywords ON ai_knowledge_base USING GIN(keywords);
CREATE INDEX IF NOT EXISTS idx_ai_knowledge_category ON ai_knowledge_base(category);
CREATE INDEX IF NOT EXISTS idx_ai_knowledge_rating ON ai_knowledge_base(average_rating DESC);

-- RLS Policies
ALTER TABLE ai_learning_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_knowledge_base ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_corrections ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_mistake_patterns ENABLE ROW LEVEL SECURITY;

-- Users can only see their own learning sessions
CREATE POLICY "Users can view own learning sessions" ON ai_learning_sessions
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own learning sessions" ON ai_learning_sessions
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own learning sessions" ON ai_learning_sessions
    FOR UPDATE USING (auth.uid() = user_id);

-- Knowledge base is readable by all paid users, writable by system
CREATE POLICY "Paid users can view knowledge base" ON ai_knowledge_base
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM profiles 
            WHERE profiles.id = auth.uid() 
            AND profiles.is_paid = true 
            AND profiles.is_active = true
        )
    );

-- Only system/admin can modify knowledge base
CREATE POLICY "System can modify knowledge base" ON ai_knowledge_base
    FOR ALL USING (
        auth.jwt() ->> 'role' = 'service_role'
        OR auth.uid() IN (
            SELECT id FROM profiles WHERE email IN ('admin@flexicad.com')
        )
    );

-- Users can see their own corrections
CREATE POLICY "Users can view own corrections" ON ai_corrections
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own corrections" ON ai_corrections
    FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Mistake patterns are readable by all
CREATE POLICY "All can view mistake patterns" ON ai_mistake_patterns
    FOR SELECT TO authenticated;

-- Trigger to update knowledge base from highly rated sessions
CREATE OR REPLACE FUNCTION update_knowledge_base_from_session()
RETURNS TRIGGER AS $$
BEGIN
    -- Only process sessions with high ratings (4 or 5)
    IF NEW.user_feedback >= 4 AND NEW.user_feedback IS NOT NULL THEN
        INSERT INTO ai_knowledge_base (
            pattern_name,
            description,
            keywords,
            example_prompt,
            successful_code,
            category,
            complexity_level,
            created_from_session,
            average_rating
        ) VALUES (
            'Pattern_' || NEW.id::text,
            'Successful pattern learned from user session',
            string_to_array(
                lower(regexp_replace(NEW.user_prompt, '[^\w\s]', '', 'g')), 
                ' '
            ),
            NEW.user_prompt,
            COALESCE(NEW.final_code, NEW.generated_code),
            NEW.design_category,
            NEW.complexity_level,
            NEW.id,
            NEW.user_feedback::decimal
        )
        ON CONFLICT (pattern_name) DO UPDATE SET
            usage_count = ai_knowledge_base.usage_count + 1,
            average_rating = (ai_knowledge_base.average_rating + NEW.user_feedback::decimal) / 2,
            updated_at = NOW();
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER ai_learning_feedback_trigger
    AFTER UPDATE OF user_feedback ON ai_learning_sessions
    FOR EACH ROW
    EXECUTE FUNCTION update_knowledge_base_from_session();

-- Function to find similar patterns for new prompts
CREATE OR REPLACE FUNCTION find_similar_patterns(prompt_text TEXT, limit_count INTEGER DEFAULT 5)
RETURNS TABLE (
    pattern_name VARCHAR(255),
    description TEXT,
    example_prompt TEXT,
    successful_code TEXT,
    similarity_score FLOAT,
    average_rating DECIMAL(3,2),
    usage_count INTEGER
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        kb.pattern_name,
        kb.description,
        kb.example_prompt,
        kb.successful_code,
        -- Simple keyword-based similarity scoring
        (
            array_length(
                array(
                    SELECT unnest(kb.keywords) 
                    INTERSECT 
                    SELECT unnest(string_to_array(lower(prompt_text), ' '))
                ), 1
            )::float / 
            GREATEST(array_length(kb.keywords, 1), 1)
        ) as similarity_score,
        kb.average_rating,
        kb.usage_count
    FROM ai_knowledge_base kb
    WHERE kb.keywords && string_to_array(lower(prompt_text), ' ')
    ORDER BY similarity_score DESC, kb.average_rating DESC, kb.usage_count DESC
    LIMIT limit_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;