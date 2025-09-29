-- Admin emails table for database-based admin allow-list
-- Run this in Supabase SQL Editor

-- Create admin_emails table
CREATE TABLE IF NOT EXISTS public.admin_emails (
    email TEXT PRIMARY KEY,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    created_by TEXT,
    active BOOLEAN DEFAULT TRUE
);

-- Insert initial admin email
INSERT INTO public.admin_emails (email, created_by, active) 
VALUES ('bmuzza1992@gmail.com', 'system', true)
ON CONFLICT (email) DO UPDATE SET 
    active = EXCLUDED.active,
    created_at = COALESCE(public.admin_emails.created_at, NOW());

-- Add RLS policy for admin_emails (only service role can access)
ALTER TABLE public.admin_emails ENABLE ROW LEVEL SECURITY;

-- Only service role can read/write admin_emails
CREATE POLICY "Service role can manage admin emails" ON public.admin_emails
    FOR ALL USING (auth.role() = 'service_role');

-- Grant permissions
GRANT ALL ON public.admin_emails TO service_role;
GRANT SELECT ON public.admin_emails TO postgres;

-- Verify the setup
SELECT email, created_at, active FROM public.admin_emails WHERE active = true;