-- Production Database Setup Script
-- Run this in your Supabase SQL editor to create a paid profile

-- Replace 'your-user-id-here' with your actual Supabase user ID
-- Replace 'your-email@example.com' with your actual email

INSERT INTO profiles (
    id,
    email,
    is_paid,
    is_active,
    subscription_plan,
    stripe_customer_id,
    payment_date,
    created_at,
    updated_at
) VALUES (
    'your-user-id-here',  -- Get this from Supabase Auth users table
    'your-email@example.com',
    true,
    true,
    'monthly',
    'manual_setup',
    NOW(),
    NOW(),
    NOW()
);

-- To find your user ID, run this first:
-- SELECT id, email FROM auth.users WHERE email = 'your-email@example.com';