-- Safe migration to add missing columns to existing production database
-- This migration checks if columns exist before adding them

-- Add is_active column if it doesn't exist
DO $$
BEGIN
    -- Check if is_active column exists, if not add it
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'profiles' 
        AND column_name = 'is_active'
    ) THEN
        ALTER TABLE public.profiles ADD COLUMN is_active BOOLEAN DEFAULT TRUE;
        
        -- Create index if it doesn't exist
        IF NOT EXISTS (
            SELECT 1 FROM pg_indexes 
            WHERE schemaname = 'public' 
            AND tablename = 'profiles' 
            AND indexname = 'profiles_is_active_idx'
        ) THEN
            CREATE INDEX profiles_is_active_idx ON public.profiles(is_active);
        END IF;
        
        -- Update existing records to be active by default
        UPDATE public.profiles SET is_active = TRUE WHERE is_active IS NULL;
        
        RAISE NOTICE 'Added is_active column to profiles table';
    ELSE
        RAISE NOTICE 'is_active column already exists in profiles table';
    END IF;
    
    -- Check if is_paid column exists, if not add it
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'profiles' 
        AND column_name = 'is_paid'
    ) THEN
        ALTER TABLE public.profiles ADD COLUMN is_paid BOOLEAN DEFAULT FALSE;
        
        -- Create index if it doesn't exist
        IF NOT EXISTS (
            SELECT 1 FROM pg_indexes 
            WHERE schemaname = 'public' 
            AND tablename = 'profiles' 
            AND indexname = 'profiles_is_paid_idx'
        ) THEN
            CREATE INDEX profiles_is_paid_idx ON public.profiles(is_paid);
        END IF;
        
        RAISE NOTICE 'Added is_paid column to profiles table';
    ELSE
        RAISE NOTICE 'is_paid column already exists in profiles table';
    END IF;
    
    -- Ensure subscription_plan column exists with proper constraint
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'profiles' 
        AND column_name = 'subscription_plan'
    ) THEN
        ALTER TABLE public.profiles ADD COLUMN subscription_plan TEXT DEFAULT 'monthly';
        
        -- Add constraint if it doesn't exist
        IF NOT EXISTS (
            SELECT 1 FROM information_schema.table_constraints 
            WHERE constraint_schema = 'public' 
            AND table_name = 'profiles' 
            AND constraint_name = 'profiles_subscription_plan_check'
        ) THEN
            ALTER TABLE public.profiles ADD CONSTRAINT profiles_subscription_plan_check 
            CHECK (subscription_plan IN ('monthly', 'yearly'));
        END IF;
        
        RAISE NOTICE 'Added subscription_plan column to profiles table';
    ELSE
        RAISE NOTICE 'subscription_plan column already exists in profiles table';
    END IF;
    
    -- Ensure stripe_customer_id column exists
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'profiles' 
        AND column_name = 'stripe_customer_id'
    ) THEN
        ALTER TABLE public.profiles ADD COLUMN stripe_customer_id TEXT;
        
        RAISE NOTICE 'Added stripe_customer_id column to profiles table';
    ELSE
        RAISE NOTICE 'stripe_customer_id column already exists in profiles table';
    END IF;
    
    -- Ensure stripe_subscription_id column exists
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'profiles' 
        AND column_name = 'stripe_subscription_id'
    ) THEN
        ALTER TABLE public.profiles ADD COLUMN stripe_subscription_id TEXT;
        
        RAISE NOTICE 'Added stripe_subscription_id column to profiles table';
    ELSE
        RAISE NOTICE 'stripe_subscription_id column already exists in profiles table';
    END IF;
    
END $$;