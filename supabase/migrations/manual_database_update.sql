-- Manual SQL to run in Supabase Dashboard SQL Editor
-- This safely adds the missing columns to your existing profiles table

-- Check current table structure
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns 
WHERE table_schema = 'public' AND table_name = 'profiles'
ORDER BY ordinal_position;

-- Add missing columns safely
DO $$
BEGIN
    -- Add is_active column if missing
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' AND table_name = 'profiles' AND column_name = 'is_active'
    ) THEN
        ALTER TABLE public.profiles ADD COLUMN is_active BOOLEAN DEFAULT TRUE;
        CREATE INDEX IF NOT EXISTS profiles_is_active_idx ON public.profiles(is_active);
        UPDATE public.profiles SET is_active = TRUE WHERE is_active IS NULL;
        RAISE NOTICE 'Added is_active column';
    END IF;

    -- Add is_paid column if missing
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' AND table_name = 'profiles' AND column_name = 'is_paid'
    ) THEN
        ALTER TABLE public.profiles ADD COLUMN is_paid BOOLEAN DEFAULT FALSE;
        CREATE INDEX IF NOT EXISTS profiles_is_paid_idx ON public.profiles(is_paid);
        RAISE NOTICE 'Added is_paid column';
    END IF;

    -- Add subscription_plan column if missing
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' AND table_name = 'profiles' AND column_name = 'subscription_plan'
    ) THEN
        ALTER TABLE public.profiles ADD COLUMN subscription_plan TEXT DEFAULT 'monthly';
        RAISE NOTICE 'Added subscription_plan column';
    END IF;

    -- Add stripe columns if missing
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' AND table_name = 'profiles' AND column_name = 'stripe_customer_id'
    ) THEN
        ALTER TABLE public.profiles ADD COLUMN stripe_customer_id TEXT;
        RAISE NOTICE 'Added stripe_customer_id column';
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' AND table_name = 'profiles' AND column_name = 'stripe_subscription_id'
    ) THEN
        ALTER TABLE public.profiles ADD COLUMN stripe_subscription_id TEXT;
        RAISE NOTICE 'Added stripe_subscription_id column';
    END IF;
END $$;

-- Set your test account as paid
UPDATE public.profiles 
SET is_paid = TRUE, 
    is_active = TRUE, 
    subscription_plan = 'monthly',
    stripe_customer_id = 'test_customer_id'
WHERE email = 'bmuzza1992@gmail.com';

-- Verify the changes
SELECT id, email, is_paid, is_active, subscription_plan, stripe_customer_id 
FROM public.profiles 
LIMIT 5;