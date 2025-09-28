-- Run this in your Supabase SQL editor to set up the AI learning system

-- Create the ai_learning_sessions table
CREATE TABLE IF NOT EXISTS ai_learning_sessions (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
    session_id TEXT NOT NULL,
    user_prompt TEXT NOT NULL,
    system_prompt TEXT NOT NULL,
    generated_code TEXT NOT NULL,
    user_feedback INTEGER CHECK (user_feedback BETWEEN 1 AND 5),
    feedback_text TEXT,
    was_modified BOOLEAN DEFAULT FALSE,
    final_code TEXT,
    design_category TEXT,
    complexity_level TEXT CHECK (complexity_level IN ('beginner', 'intermediate', 'advanced')),
    generation_time_ms INTEGER,
    tokens_used INTEGER,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create the ai_knowledge_base table
CREATE TABLE IF NOT EXISTS ai_knowledge_base (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    pattern_name TEXT UNIQUE NOT NULL,
    description TEXT,
    keywords TEXT[],
    example_prompt TEXT NOT NULL,
    successful_code TEXT NOT NULL,
    usage_count INTEGER DEFAULT 1,
    average_rating DECIMAL(3,2) DEFAULT 0.0,
    category TEXT,
    complexity_level TEXT CHECK (complexity_level IN ('beginner', 'intermediate', 'advanced')),
    created_from_session UUID REFERENCES ai_learning_sessions(id),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create the ai_corrections table
CREATE TABLE IF NOT EXISTS ai_corrections (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    session_id UUID REFERENCES ai_learning_sessions(id) ON DELETE CASCADE,
    user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
    original_code TEXT NOT NULL,
    corrected_code TEXT NOT NULL,
    correction_type TEXT,
    description TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_ai_learning_user_id ON ai_learning_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_ai_learning_category ON ai_learning_sessions(design_category);
CREATE INDEX IF NOT EXISTS idx_ai_learning_created ON ai_learning_sessions(created_at);
CREATE INDEX IF NOT EXISTS idx_ai_knowledge_keywords ON ai_knowledge_base USING GIN(keywords);
CREATE INDEX IF NOT EXISTS idx_ai_knowledge_category ON ai_knowledge_base(category);
CREATE INDEX IF NOT EXISTS idx_ai_knowledge_rating ON ai_knowledge_base(average_rating DESC);

-- Enable RLS
ALTER TABLE ai_learning_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_knowledge_base ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_corrections ENABLE ROW LEVEL SECURITY;

-- RLS Policies

-- Users can only see their own learning sessions
CREATE POLICY "Users can view own learning sessions" ON ai_learning_sessions
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own learning sessions" ON ai_learning_sessions
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own learning sessions" ON ai_learning_sessions
    FOR UPDATE USING (auth.uid() = user_id);

-- Knowledge base is readable by all paid users
CREATE POLICY "Paid users can view knowledge base" ON ai_knowledge_base
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM profiles 
            WHERE profiles.id = auth.uid() 
            AND profiles.is_paid = true 
            AND profiles.is_active = true
        )
    );

-- Service role can modify knowledge base
CREATE POLICY "Service can modify knowledge base" ON ai_knowledge_base
    FOR ALL USING (auth.jwt() ->> 'role' = 'service_role');

-- Users can see their own corrections
CREATE POLICY "Users can view own corrections" ON ai_corrections
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own corrections" ON ai_corrections
    FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Function to update knowledge base from high-rated sessions
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
            'Pattern_' || NEW.session_id,
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

-- Create trigger for knowledge base updates
CREATE TRIGGER ai_learning_feedback_trigger
    AFTER UPDATE OF user_feedback ON ai_learning_sessions
    FOR EACH ROW
    EXECUTE FUNCTION update_knowledge_base_from_session();

-- Successful migration message
SELECT 'AI Learning System tables created successfully!' as status;