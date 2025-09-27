-- Quick fix for missing columns in production database
-- Run this in your Supabase Dashboard → SQL Editor

-- First, let's see what columns currently exist
SELECT column_name 
FROM information_schema.columns 
WHERE table_schema = 'public' AND table_name = 'profiles'
ORDER BY ordinal_position;

-- Add the missing columns one by one (PostgreSQL will skip if they already exist)

-- Add is_paid column
ALTER TABLE profiles 
ADD COLUMN IF NOT EXISTS is_paid BOOLEAN DEFAULT FALSE;

-- Add subscription_plan column  
ALTER TABLE profiles 
ADD COLUMN IF NOT EXISTS subscription_plan TEXT DEFAULT 'monthly';

-- Add stripe_customer_id column
ALTER TABLE profiles 
ADD COLUMN IF NOT EXISTS stripe_customer_id TEXT;

-- Add stripe_subscription_id column  
ALTER TABLE profiles 
ADD COLUMN IF NOT EXISTS stripe_subscription_id TEXT;

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS profiles_is_paid_idx ON profiles(is_paid);
CREATE INDEX IF NOT EXISTS profiles_subscription_plan_idx ON profiles(subscription_plan);

-- Set your test account as paid so you can login
UPDATE profiles 
SET is_paid = TRUE, 
    subscription_plan = 'monthly',
    stripe_customer_id = 'test_customer_123'
WHERE email = 'bmuzza1992@gmail.com';

-- Verify the changes
SELECT id, email, is_paid, subscription_plan, stripe_customer_id, created_at 
FROM profiles 
WHERE email = 'bmuzza1992@gmail.com';

-- Show final table structure
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns 
WHERE table_schema = 'public' AND table_name = 'profiles'
ORDER BY ordinal_position;