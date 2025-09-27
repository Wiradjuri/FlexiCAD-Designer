-- Seed data for FlexiCAD testing
-- This creates a test user that can login and test the payment-first system

-- Insert test user into auth.users
INSERT INTO auth.users (
    id, 
    instance_id,
    email, 
    encrypted_password, 
    email_confirmed_at, 
    created_at, 
    updated_at, 
    raw_app_meta_data, 
    raw_user_meta_data, 
    is_super_admin, 
    role,
    aud,
    confirmation_token,
    recovery_token
) VALUES (
    'aae6c2f0-9fe1-48ff-98b0-a8828992cd97',
    '00000000-0000-0000-0000-000000000000',
    'bmuzza1992@gmail.com', 
    'password123', -- Replace with a hashed password if needed
    GETDATE(), 
    GETDATE(), 
    GETDATE(), 
    '{"provider":"email","providers":["email"]}',
    '{}', 
    0, 
    'authenticated',
    'authenticated',
    '',
    ''
);

-- Insert corresponding profile with paid status
INSERT INTO profiles (
    id, 
    email, 
    is_paid, 
    subscription_plan, 
    stripe_customer_id,
    stripe_subscription_id,
    created_at
) VALUES (
    'aae6c2f0-9fe1-48ff-98b0-a8828992cd97',
    'bmuzza1992@gmail.com', 
    1, 
    'monthly', 
    'cus_test_123',
    'sub_test_123',
    GETDATE()
);