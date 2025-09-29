-- AI Feedback Table Schema
-- Stores user feedback for AI-generated designs with admin review workflow
-- This replaces using ai_learning_sessions for feedback storage

-- Create ai_feedback table
CREATE TABLE IF NOT EXISTS ai_feedback (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
    session_id UUID REFERENCES ai_learning_sessions(id) ON DELETE CASCADE,
    
    -- Original request context
    user_email TEXT NOT NULL, -- denormalized for easier admin queries
    design_prompt TEXT NOT NULL,
    template_name TEXT,
    design_id UUID,
    
    -- Generated response
    generated_code TEXT NOT NULL,
    user_feedback INTEGER CHECK (user_feedback BETWEEN 1 AND 5), -- 1-5 star rating
    quality_score INTEGER CHECK (quality_score BETWEEN 1 AND 5), -- normalized to user_feedback
    quality_label TEXT CHECK (quality_label IN ('unusable','poor','ok','good','excellent')),
    feedback_text TEXT, -- optional user comment
    
    -- Review workflow fields
    review_status TEXT CHECK (review_status IN ('pending','accepted','rejected')) DEFAULT 'pending',
    reviewed_by TEXT, -- admin email who made the decision
    reviewed_at TIMESTAMPTZ, -- when decision was made
    
    -- Metadata
    generation_time_ms INTEGER,
    tokens_used INTEGER,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes for admin queries
CREATE INDEX IF NOT EXISTS idx_ai_feedback_review_status ON ai_feedback(review_status);
CREATE INDEX IF NOT EXISTS idx_ai_feedback_user_email ON ai_feedback(user_email);
CREATE INDEX IF NOT EXISTS idx_ai_feedback_created_at ON ai_feedback(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_ai_feedback_quality_score ON ai_feedback(quality_score DESC);
CREATE INDEX IF NOT EXISTS idx_ai_feedback_session_id ON ai_feedback(session_id);

-- Enable RLS
ALTER TABLE ai_feedback ENABLE ROW LEVEL SECURITY;

-- Helper function to check if user is admin
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN AS $$
BEGIN
    RETURN auth.email() = 'bmuzza1992@gmail.com';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- RLS Policies

-- Users can insert their own feedback
CREATE POLICY "Users can insert own feedback" ON ai_feedback
    FOR INSERT 
    WITH CHECK (auth.uid() = user_id);

-- Users can view their own feedback
CREATE POLICY "Users can view own feedback" ON ai_feedback
    FOR SELECT 
    USING (auth.uid() = user_id);

-- Admin can view all feedback
CREATE POLICY "Admin can view all feedback" ON ai_feedback
    FOR SELECT 
    USING (is_admin());

-- Admin can update all feedback (for review workflow)
CREATE POLICY "Admin can update all feedback" ON ai_feedback
    FOR UPDATE 
    USING (is_admin());

-- Create audit table for admin actions
CREATE TABLE IF NOT EXISTS admin_audit (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    admin_email TEXT NOT NULL,
    action TEXT NOT NULL,
    resource_type TEXT NOT NULL,
    resource_id TEXT NOT NULL,
    details JSONB,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS on audit table
ALTER TABLE admin_audit ENABLE ROW LEVEL SECURITY;

-- Only admin can access audit log
CREATE POLICY "Admin only audit access" ON admin_audit
    FOR ALL
    USING (is_admin());

-- Trigger to update updated_at on ai_feedback
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER ai_feedback_updated_at
    BEFORE UPDATE ON ai_feedback
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at();

-- Success message
SELECT 'AI Feedback schema with review workflow created successfully!' as status;