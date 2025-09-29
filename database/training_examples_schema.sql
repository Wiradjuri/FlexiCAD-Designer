-- AI Training Examples Schema
-- Stores curated examples from accepted feedback for few-shot learning
-- Admin-only access with proper RLS policies

CREATE TABLE IF NOT EXISTS ai_training_examples (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    source_feedback_id UUID REFERENCES ai_feedback(id) ON DELETE SET NULL,
    input_prompt TEXT NOT NULL,
    generated_code TEXT NOT NULL,
    quality_score INTEGER CHECK (quality_score BETWEEN 1 AND 5),
    quality_label TEXT CHECK (quality_label IN ('unusable','poor','ok','good','excellent')),
    tags TEXT[] DEFAULT '{}',
    category VARCHAR(100),
    complexity_level VARCHAR(20) CHECK (complexity_level IN ('beginner', 'intermediate', 'advanced')),
    active BOOLEAN DEFAULT TRUE,
    created_by TEXT NOT NULL, -- admin email who accepted it
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_ai_training_examples_tags ON ai_training_examples USING GIN(tags);
CREATE INDEX IF NOT EXISTS idx_ai_training_examples_category ON ai_training_examples(category);
CREATE INDEX IF NOT EXISTS idx_ai_training_examples_quality ON ai_training_examples(quality_score DESC);
CREATE INDEX IF NOT EXISTS idx_ai_training_examples_active ON ai_training_examples(active);
CREATE INDEX IF NOT EXISTS idx_ai_training_examples_created_at ON ai_training_examples(created_at DESC);

-- RLS Policies
ALTER TABLE ai_training_examples ENABLE ROW LEVEL SECURITY;

-- Admin can view all training examples
CREATE POLICY "Admin can view all training examples" ON ai_training_examples
    FOR SELECT USING (
        auth.uid() IN (
            SELECT id FROM profiles WHERE email = 'bmuzza1992@gmail.com'
        )
    );

-- Admin can insert training examples
CREATE POLICY "Admin can insert training examples" ON ai_training_examples
    FOR INSERT WITH CHECK (
        auth.uid() IN (
            SELECT id FROM profiles WHERE email = 'bmuzza1992@gmail.com'
        )
    );

-- Admin can update training examples
CREATE POLICY "Admin can update training examples" ON ai_training_examples
    FOR UPDATE USING (
        auth.uid() IN (
            SELECT id FROM profiles WHERE email = 'bmuzza1992@gmail.com'
        )
    );

-- System/service role can read for AI generation
CREATE POLICY "System can read training examples" ON ai_training_examples
    FOR SELECT USING (
        auth.jwt() ->> 'role' = 'service_role'
    );

-- Trigger to update updated_at
CREATE OR REPLACE FUNCTION update_training_examples_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER training_examples_updated_trigger
    BEFORE UPDATE ON ai_training_examples
    FOR EACH ROW
    EXECUTE FUNCTION update_training_examples_updated_at();