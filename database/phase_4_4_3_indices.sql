-- Phase 4.4.3 Database Optimizations
-- Create indices for admin feedback review and training assets performance

-- Index for ai_feedback admin queries
CREATE INDEX IF NOT EXISTS idx_ai_feedback_review_status ON ai_feedback(review_status);
CREATE INDEX IF NOT EXISTS idx_ai_feedback_created_at ON ai_feedback(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_ai_feedback_user_id ON ai_feedback(user_id);

-- Index for training_assets admin queries  
CREATE INDEX IF NOT EXISTS idx_training_assets_status ON training_assets(status);
CREATE INDEX IF NOT EXISTS idx_training_assets_created_at ON training_assets(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_training_assets_name ON training_assets(name);

-- Index for ai_training_examples performance
CREATE INDEX IF NOT EXISTS idx_ai_training_examples_source_feedback_id ON ai_training_examples(source_feedback_id);
CREATE INDEX IF NOT EXISTS idx_ai_training_examples_active ON ai_training_examples(active);
CREATE INDEX IF NOT EXISTS idx_ai_training_examples_created_at ON ai_training_examples(created_at DESC);

-- Index for admin audit table (if it exists)
CREATE INDEX IF NOT EXISTS idx_admin_audit_admin_email ON admin_audit(admin_email);
CREATE INDEX IF NOT EXISTS idx_admin_audit_action ON admin_audit(action);
CREATE INDEX IF NOT EXISTS idx_admin_audit_created_at ON admin_audit(created_at DESC);

-- Performance comments
COMMENT ON INDEX idx_ai_feedback_review_status IS 'Optimizes admin feedback list filtering by status (pending/accepted/rejected)';
COMMENT ON INDEX idx_ai_feedback_created_at IS 'Optimizes admin feedback list ordering by submission date';
COMMENT ON INDEX idx_training_assets_created_at IS 'Optimizes admin training assets list ordering by creation date';
COMMENT ON INDEX idx_ai_training_examples_source_feedback_id IS 'Optimizes feedback-to-training promotion lookups';