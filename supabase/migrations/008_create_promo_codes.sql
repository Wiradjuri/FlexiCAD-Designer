-- Create promo codes table and related functionality
-- This migration adds promo code support to the FlexiCAD system

-- Create promo_codes table
CREATE TABLE IF NOT EXISTS public.promo_codes (
    code TEXT PRIMARY KEY,
    description TEXT,
    discount_percent INTEGER CHECK (discount_percent >= 1 AND discount_percent <= 100) NOT NULL,
    active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    expires_at TIMESTAMPTZ
);

-- Add promo_code foreign key to profiles table
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema='public' AND table_name='profiles' AND column_name='promo_code'
    ) THEN
        ALTER TABLE public.profiles ADD COLUMN promo_code TEXT REFERENCES public.promo_codes(code);
    END IF;
END$$;

-- Add admin role column to profiles table
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema='public' AND table_name='profiles' AND column_name='is_admin'
    ) THEN
        ALTER TABLE public.profiles ADD COLUMN is_admin BOOLEAN DEFAULT FALSE;
    END IF;
END$$;

-- Enable RLS on promo_codes table
ALTER TABLE public.promo_codes ENABLE ROW LEVEL SECURITY;

-- Function to check if current user is admin
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM public.profiles
        WHERE id = auth.uid() AND is_admin = TRUE AND is_paid = TRUE
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permission on admin check function
GRANT EXECUTE ON FUNCTION public.is_admin TO authenticated;

-- RLS Policy: Allow service_role and admin users to manage promo codes
CREATE POLICY "promo_codes_admin_access" ON public.promo_codes
    FOR ALL USING (auth.role() = 'service_role' OR public.is_admin());

-- RLS Policy: Allow authenticated users to read promo codes for validation
CREATE POLICY "promo_codes_read_for_validation" ON public.promo_codes
    FOR SELECT USING (auth.role() = 'authenticated');

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS promo_codes_active_idx ON public.promo_codes(active);
CREATE INDEX IF NOT EXISTS promo_codes_expires_at_idx ON public.promo_codes(expires_at);
CREATE INDEX IF NOT EXISTS profiles_promo_code_idx ON public.profiles(promo_code);

-- Grant permissions to service_role
GRANT ALL ON public.promo_codes TO service_role;

-- Function to validate promo code
CREATE OR REPLACE FUNCTION public.validate_promo_code(promo_code_input TEXT)
RETURNS TABLE (
    is_valid BOOLEAN,
    discount_percent INTEGER,
    description TEXT,
    error_message TEXT
) AS $$
BEGIN
    -- Check if promo code exists and is valid
    RETURN QUERY
    SELECT
        CASE
            WHEN pc.code IS NULL THEN FALSE
            WHEN pc.active = FALSE THEN FALSE
            WHEN pc.expires_at IS NOT NULL AND pc.expires_at <= NOW() THEN FALSE
            ELSE TRUE
        END as is_valid,
        COALESCE(pc.discount_percent, 0) as discount_percent,
        pc.description,
        CASE
            WHEN pc.code IS NULL THEN 'Promo code not found'
            WHEN pc.active = FALSE THEN 'Promo code is inactive'
            WHEN pc.expires_at IS NOT NULL AND pc.expires_at <= NOW() THEN 'Promo code has expired'
            ELSE NULL
        END as error_message
    FROM public.promo_codes pc
    WHERE pc.code = promo_code_input
    UNION ALL
    SELECT FALSE, 0, NULL, 'Promo code not found'
    WHERE NOT EXISTS (SELECT 1 FROM public.promo_codes WHERE code = promo_code_input);

    -- Return only the first row
    RETURN;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permission on validation function
GRANT EXECUTE ON FUNCTION public.validate_promo_code TO service_role;
GRANT EXECUTE ON FUNCTION public.validate_promo_code TO authenticated;

-- Example SQL operations for promo code management:

-- INSERT: Add sample promo codes
-- INSERT INTO public.promo_codes (code, description, discount_percent, expires_at)
-- VALUES ('WELCOME20', '20% off for new customers', 20, '2024-12-31 23:59:59');

-- INSERT INTO public.promo_codes (code, description, discount_percent)
-- VALUES ('FOREVER10', '10% off forever', 10);

-- INSERT INTO public.promo_codes (code, description, discount_percent, expires_at)
-- VALUES ('LAUNCH50', 'Launch week special - 50% off!', 50, '2024-03-01 23:59:59');

-- ADMIN SETUP: Make a user admin (replace USER_ID with actual user ID)
-- UPDATE public.profiles SET is_admin = TRUE WHERE email = 'your-admin@email.com';

-- UPDATE: Deactivate a promo code
-- UPDATE public.promo_codes SET active = FALSE WHERE code = 'WELCOME20';

-- UPDATE: Reactivate a promo code
-- UPDATE public.promo_codes SET active = TRUE WHERE code = 'WELCOME20';

-- UPDATE: Extend expiry date
-- UPDATE public.promo_codes SET expires_at = '2025-06-30 23:59:59' WHERE code = 'WELCOME20';

-- DELETE: Remove a promo code completely
-- DELETE FROM public.promo_codes WHERE code = 'WELCOME20';

-- SELECT: List all promo codes
-- SELECT code, description, discount_percent, active, created_at, expires_at
-- FROM public.promo_codes ORDER BY created_at DESC;

-- SELECT: Validate a specific promo code
-- SELECT * FROM public.validate_promo_code('WELCOME20');

-- SELECT: Check if user is admin
-- SELECT public.is_admin();