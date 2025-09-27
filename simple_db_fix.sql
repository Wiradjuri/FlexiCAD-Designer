-- Simple Database Fix for FlexiCAD
-- Run this in your Supabase SQL Editor
-- This adds only the essential missing columns

-- Add the missing payment columns
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS is_paid BOOLEAN DEFAULT FALSE NOT NULL;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS subscription_plan TEXT DEFAULT 'none';
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS stripe_customer_id TEXT;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS is_admin BOOLEAN DEFAULT FALSE NOT NULL;

-- Update your test user to be paid (REPLACE WITH YOUR EMAIL)
UPDATE profiles 
SET is_paid = TRUE, subscription_plan = 'monthly'
WHERE email = 'bradm.developer@gmail.com';

-- Verify the changes
SELECT id, email, is_paid, subscription_plan, created_at FROM profiles ORDER BY created_at DESC LIMIT 5;