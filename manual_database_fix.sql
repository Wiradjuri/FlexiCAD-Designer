-- FlexiCAD Database Manual Fix Script
-- Run these commands in your Supabase SQL Editor
-- This will add the missing payment-first columns to your profiles table

-- Step 1: Add missing columns to profiles table
-- (These commands are safe to run multiple times - they won't fail if columns already exist)

-- Add is_paid column (main payment status column)
ALTER TABLE profiles 
ADD COLUMN IF NOT EXISTS is_paid BOOLEAN DEFAULT FALSE NOT NULL;

-- Add subscription_plan column
ALTER TABLE profiles 
ADD COLUMN IF NOT EXISTS subscription_plan TEXT DEFAULT 'none';

-- Add stripe_customer_id column for payment tracking
ALTER TABLE profiles 
ADD COLUMN IF NOT EXISTS stripe_customer_id TEXT;

-- Add is_admin column for admin users
ALTER TABLE profiles 
ADD COLUMN IF NOT EXISTS is_admin BOOLEAN DEFAULT FALSE NOT NULL;

-- Step 2: Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_profiles_is_paid ON profiles(is_paid);
CREATE INDEX IF NOT EXISTS idx_profiles_subscription_plan ON profiles(subscription_plan);
CREATE INDEX IF NOT EXISTS idx_profiles_stripe_customer_id ON profiles(stripe_customer_id);

-- Step 3: Update existing test users to be marked as paid (CUSTOMIZE THIS)
-- IMPORTANT: Replace 'your-test-email@example.com' with your actual test account email
-- This ensures you can test the system with a paid account

UPDATE profiles 
SET 
    is_paid = TRUE,
    subscription_plan = 'monthly'
WHERE email = 'your-test-email@example.com';

-- If you don't know your test email, you can see all profiles with:
-- SELECT id, email, is_paid, subscription_plan FROM profiles ORDER BY created_at DESC;

-- Step 4: Set up Row Level Security (RLS) policies for new columns
-- Allow users to read their own payment status
CREATE POLICY IF NOT EXISTS "Users can read own payment status" ON profiles
    FOR SELECT USING (auth.uid() = id);

-- Allow users to update their own payment status (for Stripe webhooks)
CREATE POLICY IF NOT EXISTS "Users can update own payment status" ON profiles
    FOR UPDATE USING (auth.uid() = id);

-- Step 5: Verification queries (run these to confirm everything worked)
-- Check table structure
SELECT column_name, data_type, is_nullable, column_default 
FROM information_schema.columns 
WHERE table_name = 'profiles' 
AND table_schema = 'public'
ORDER BY ordinal_position;

-- Check your test user's payment status
-- SELECT email, is_paid, subscription_plan, created_at 
-- FROM profiles 
-- WHERE email = 'your-test-email@example.com';

-- Step 6: If you have an is_active column that was used before, 
-- you can migrate the data like this:
-- UPDATE profiles SET is_paid = is_active WHERE is_active IS NOT NULL;

COMMENT ON COLUMN profiles.is_paid IS 'Payment-first system: true if user has completed payment and can access the app';
COMMENT ON COLUMN profiles.subscription_plan IS 'User subscription plan: monthly, yearly, or none';
COMMENT ON COLUMN profiles.stripe_customer_id IS 'Stripe customer ID for payment processing';
COMMENT ON COLUMN profiles.is_admin IS 'Admin flag for privileged users';

-- That's it! Your database should now have all required columns for the payment-first system.