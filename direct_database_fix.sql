-- Direct fix for production database
-- Run this in Supabase SQL Editor to add missing columns

-- Add the essential missing columns only if they don't exist
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS is_paid BOOLEAN DEFAULT FALSE NOT NULL;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS subscription_plan TEXT DEFAULT 'none';
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS stripe_customer_id TEXT;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS is_admin BOOLEAN DEFAULT FALSE NOT NULL;

-- Update your test user to be paid
UPDATE profiles 
SET is_paid = TRUE, subscription_plan = 'monthly'
WHERE email = 'bmuzza1992@gmail.com';

-- Verify the fix
SELECT id, email, is_paid, subscription_plan, created_at 
FROM profiles 
ORDER BY created_at DESC;