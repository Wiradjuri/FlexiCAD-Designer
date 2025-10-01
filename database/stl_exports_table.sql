-- STL Exports Table for Phase 4.6/4.7
-- Tracks STL files generated and uploaded by users

CREATE TABLE IF NOT EXISTS stl_exports (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    filename TEXT NOT NULL,
    file_path TEXT NOT NULL, -- Path in Supabase Storage
    file_size BIGINT, -- File size in bytes
    original_code TEXT, -- Original OpenSCAD code
    metadata JSONB DEFAULT '{}', -- Export settings, resolution, etc.
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_stl_exports_user_id ON stl_exports(user_id);
CREATE INDEX IF NOT EXISTS idx_stl_exports_created_at ON stl_exports(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_stl_exports_filename ON stl_exports(filename);

-- RLS Policies
ALTER TABLE stl_exports ENABLE ROW LEVEL SECURITY;

-- Users can only see their own STL exports
CREATE POLICY "Users can view their own STL exports" ON stl_exports
    FOR SELECT USING (auth.uid() = user_id);

-- Users can insert their own STL exports
CREATE POLICY "Users can create STL exports" ON stl_exports
    FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Users can update their own STL exports (metadata only)
CREATE POLICY "Users can update their own STL exports" ON stl_exports
    FOR UPDATE USING (auth.uid() = user_id);

-- Users can delete their own STL exports
CREATE POLICY "Users can delete their own STL exports" ON stl_exports
    FOR DELETE USING (auth.uid() = user_id);

-- Update timestamp trigger
CREATE OR REPLACE FUNCTION update_stl_exports_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_stl_exports_updated_at
    BEFORE UPDATE ON stl_exports
    FOR EACH ROW
    EXECUTE FUNCTION update_stl_exports_updated_at();