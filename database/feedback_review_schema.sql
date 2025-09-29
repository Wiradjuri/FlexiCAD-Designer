-- Feedback Review System Schema
-- Adds review fields to existing ai_feedback table for admin moderation
-- This allows admins to accept/reject user feedback for training

-- Add review columns to existing ai_feedback table if they don't exist
DO $$ 
BEGIN
    -- Add review_status column
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name='ai_feedback' AND column_name='review_status') THEN
        ALTER TABLE ai_feedback ADD COLUMN review_status TEXT 
            CHECK (review_status IN ('pending','accepted','rejected')) 
            DEFAULT 'pending';
    END IF;
    
    -- Add reviewed_by column
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name='ai_feedback' AND column_name='reviewed_by') THEN
        ALTER TABLE ai_feedback ADD COLUMN reviewed_by TEXT NULL;
    END IF;
    
    -- Add reviewed_at column
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name='ai_feedback' AND column_name='reviewed_at') THEN
        ALTER TABLE ai_feedback ADD COLUMN reviewed_at TIMESTAMPTZ NULL;
    END IF;
    
    -- Add quality_label column if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name='ai_feedback' AND column_name='quality_label') THEN
        ALTER TABLE ai_feedback ADD COLUMN quality_label TEXT NULL;
    END IF;
END $$;

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_ai_feedback_review_status ON ai_feedback(review_status);
CREATE INDEX IF NOT EXISTS idx_ai_feedback_reviewed_at ON ai_feedback(reviewed_at DESC);
CREATE INDEX IF NOT EXISTS idx_ai_feedback_quality_score ON ai_feedback(quality_score DESC);

-- Update RLS policies for admin access to feedback
DROP POLICY IF EXISTS "Admin can view all feedback" ON ai_feedback;
CREATE POLICY "Admin can view all feedback" ON ai_feedback
    FOR SELECT USING (
        auth.uid() IN (
            SELECT id FROM profiles WHERE email = 'bmuzza1992@gmail.com'
        )
    );

DROP POLICY IF EXISTS "Admin can update feedback" ON ai_feedback;
CREATE POLICY "Admin can update feedback" ON ai_feedback
    FOR UPDATE USING (
        auth.uid() IN (
            SELECT id FROM profiles WHERE email = 'bmuzza1992@gmail.com'
        )
    );