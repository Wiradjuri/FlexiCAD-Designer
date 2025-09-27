-- Migration to add payment tracking fields to profiles table
-- PostgreSQL syntax for Supabase

-- Add payment-related columns to profiles table if they don't exist
DO $$
BEGIN
    -- Add is_paid column
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'profiles' AND column_name = 'is_paid'
    ) THEN
        ALTER TABLE profiles ADD COLUMN is_paid BOOLEAN DEFAULT FALSE NOT NULL;
    END IF;

    -- Add stripe_customer_id column
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'profiles' AND column_name = 'stripe_customer_id'
    ) THEN
        ALTER TABLE profiles ADD COLUMN stripe_customer_id TEXT;
    END IF;

    -- Add stripe_subscription_id column
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'profiles' AND column_name = 'stripe_subscription_id'
    ) THEN
        ALTER TABLE profiles ADD COLUMN stripe_subscription_id TEXT;
    END IF;

    -- Add payment_date column
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'profiles' AND column_name = 'payment_date'
    ) THEN
        ALTER TABLE profiles ADD COLUMN payment_date TIMESTAMPTZ;
    END IF;

    -- Add subscription_plan column
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'profiles' AND column_name = 'subscription_plan'
    ) THEN
        ALTER TABLE profiles ADD COLUMN subscription_plan TEXT DEFAULT 'none';
    END IF;

    -- Add is_admin column
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'profiles' AND column_name = 'is_admin'
    ) THEN
        ALTER TABLE profiles ADD COLUMN is_admin BOOLEAN DEFAULT FALSE NOT NULL;
    END IF;
END $$;

-- Add check constraint for subscription_plan
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint 
        WHERE conname = 'ck_profiles_subscription_plan'
    ) THEN
        ALTER TABLE profiles 
        ADD CONSTRAINT ck_profiles_subscription_plan 
        CHECK (subscription_plan IN ('none', 'monthly', 'yearly'));
    END IF;
END $$;

-- Create indexes for performance
DO $$
BEGIN
    -- Index for payment status queries
    IF NOT EXISTS (
        SELECT 1 FROM pg_indexes WHERE indexname = 'profiles_is_paid_idx'
    ) THEN
        CREATE INDEX profiles_is_paid_idx ON profiles(is_paid);
    END IF;

    -- Index for Stripe customer lookups
    IF NOT EXISTS (
        SELECT 1 FROM pg_indexes WHERE indexname = 'profiles_stripe_customer_idx'
    ) THEN
        CREATE INDEX profiles_stripe_customer_idx ON profiles(stripe_customer_id);
    END IF;
END $$;

-- Create function to mark user as paid
CREATE OR REPLACE FUNCTION mark_user_as_paid(
    user_email TEXT,
    customer_id TEXT,
    subscription_id TEXT,
    plan TEXT
) RETURNS VOID AS $$
BEGIN
    UPDATE profiles
    SET 
        is_paid = TRUE,
        stripe_customer_id = customer_id,
        stripe_subscription_id = subscription_id,
        payment_date = NOW(),
        subscription_plan = plan,
        updated_at = NOW()
    WHERE email = user_email;
    
    IF NOT FOUND THEN
        RAISE EXCEPTION 'Profile not found for email: %', user_email;
    END IF;
END;
$$ LANGUAGE plpgsql;

-- Create function to get user payment status
CREATE OR REPLACE FUNCTION get_user_payment_status(user_uuid UUID)
RETURNS TABLE(is_paid BOOLEAN, subscription_plan TEXT, payment_date TIMESTAMPTZ) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        p.is_paid,
        p.subscription_plan,
        p.payment_date
    FROM profiles p
    WHERE p.id = user_uuid;
END;
$$ LANGUAGE plpgsql;

-- Grant execute permissions (adjust roles as needed)
-- GRANT EXECUTE ON mark_user_as_paid TO service_role;
-- GRANT EXECUTE ON get_user_payment_status TO authenticated;