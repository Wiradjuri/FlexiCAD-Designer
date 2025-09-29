-- Phase 4.4.3.1 Storage Policies for Training Assets Bucket
-- Ensures admin users can list/delete objects in training-assets bucket

-- Create admin list policy for training-assets bucket
CREATE POLICY IF NOT EXISTS "admin_list_training_assets"
ON storage.objects FOR SELECT
TO authenticated
USING (
    bucket_id = 'training-assets' 
    AND EXISTS (
        SELECT 1 FROM profiles 
        WHERE profiles.id = auth.uid() 
        AND profiles.is_admin = true
    )
);

-- Create admin delete policy for training-assets bucket  
CREATE POLICY IF NOT EXISTS "admin_delete_training_assets"
ON storage.objects FOR DELETE
TO authenticated
USING (
    bucket_id = 'training-assets'
    AND EXISTS (
        SELECT 1 FROM profiles 
        WHERE profiles.id = auth.uid() 
        AND profiles.is_admin = true
    )
);

-- Ensure training-assets bucket exists (idempotent)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
    'training-assets',
    'training-assets', 
    false,
    10485760, -- 10MB limit
    ARRAY['application/json', 'text/plain', 'image/svg+xml', 'application/octet-stream']
)
ON CONFLICT (id) DO NOTHING;

-- Comments for documentation
COMMENT ON POLICY "admin_list_training_assets" ON storage.objects IS 'Allows admin users to list objects in training-assets bucket for management interface';
COMMENT ON POLICY "admin_delete_training_assets" ON storage.objects IS 'Allows admin users to delete training asset files when cleaning up storage';