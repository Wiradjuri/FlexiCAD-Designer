-- Manual database fix for FlexiCAD testing
-- Run this in your Supabase SQL Editor to set a user as paid

-- Option 1: Update specific user by email
UPDATE profiles 
SET is_paid = TRUE, 
    subscription_plan = 'monthly',
    stripe_customer_id = 'test_customer_id'
WHERE email = 'bmuzza1992@gmail.com';

-- Option 2: Update all existing users to be paid (for testing)
-- UPDATE profiles SET is_paid = TRUE, subscription_plan = 'monthly';

-- Option 3: Check current profile status
SELECT id, email, is_paid, subscription_plan, stripe_customer_id, created_at 
FROM profiles 
WHERE email = 'bmuzza1992@gmail.com';

-- Option 4: Add the is_active column if you want (optional)
-- ALTER TABLE profiles ADD COLUMN is_active BOOLEAN DEFAULT TRUE;
-- UPDATE profiles SET is_active = TRUE;

-- Verify the changes
SELECT 'Profile updated successfully' as result;