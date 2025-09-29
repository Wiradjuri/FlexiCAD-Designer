-- Training Assets Schema
-- Storage metadata table for uploaded SVG/SCAD/JSONL training files
-- Used by admin to manage training assets and by AI generator to reference them

CREATE TABLE IF NOT EXISTS training_assets (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    object_path TEXT NOT NULL, -- Path in Supabase Storage
    asset_type TEXT NOT NULL CHECK (asset_type IN ('svg', 'scad', 'jsonl')),
    filename TEXT NOT NULL, -- Original filename
    content_type TEXT NOT NULL,
    size_bytes BIGINT NOT NULL,
    tags TEXT[] DEFAULT '{}',
    active BOOLEAN DEFAULT TRUE,
    created_by UUID NOT NULL REFERENCES auth.users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_training_assets_created_at ON training_assets(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_training_assets_asset_type ON training_assets(asset_type);
CREATE INDEX IF NOT EXISTS idx_training_assets_tags ON training_assets USING GIN(tags);
CREATE INDEX IF NOT EXISTS idx_training_assets_active ON training_assets(active);
CREATE INDEX IF NOT EXISTS idx_training_assets_created_by ON training_assets(created_by);

-- RLS Policies
ALTER TABLE training_assets ENABLE ROW LEVEL SECURITY;

-- Helper function to check if user is admin
CREATE OR REPLACE FUNCTION public.is_admin(user_email TEXT DEFAULT NULL)
RETURNS BOOLEAN AS $$
BEGIN
    -- If no email provided, use current user's email
    IF user_email IS NULL THEN
        SELECT email INTO user_email FROM profiles WHERE id = auth.uid();
    END IF;
    
    -- Check against admin email list (can be expanded)
    RETURN user_email IN ('bmuzza1992@gmail.com');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Admin can view all training assets
CREATE POLICY "Admin can view all training assets" ON training_assets
    FOR SELECT USING (public.is_admin());

-- Admin can insert training assets
CREATE POLICY "Admin can insert training assets" ON training_assets
    FOR INSERT WITH CHECK (public.is_admin());

-- Admin can update training assets
CREATE POLICY "Admin can update training assets" ON training_assets
    FOR UPDATE USING (public.is_admin());

-- Admin can delete training assets
CREATE POLICY "Admin can delete training assets" ON training_assets
    FOR DELETE USING (public.is_admin());

-- System/service role can read for AI generation
CREATE POLICY "System can read active training assets" ON training_assets
    FOR SELECT USING (
        auth.jwt() ->> 'role' = 'service_role' AND active = TRUE
    );

-- Trigger to update updated_at
CREATE OR REPLACE FUNCTION update_training_assets_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER training_assets_updated_trigger
    BEFORE UPDATE ON training_assets
    FOR EACH ROW
    EXECUTE FUNCTION update_training_assets_updated_at();