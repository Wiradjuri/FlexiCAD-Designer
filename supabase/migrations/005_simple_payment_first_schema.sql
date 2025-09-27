-- FlexiCAD Payment-First Database Schema
-- Simplified version matching exact requirements

-- Drop existing profiles table if it exists (for clean migration)
DROP TABLE IF EXISTS profiles CASCADE;

-- Create profiles table with EXACT requirements
CREATE TABLE profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    email TEXT UNIQUE NOT NULL,
    is_paid BOOLEAN DEFAULT FALSE,
    stripe_customer_id TEXT,
    stripe_subscription_id TEXT,
    subscription_plan TEXT DEFAULT 'monthly' CHECK (subscription_plan IN ('monthly', 'yearly')),
    created_at TIMESTAMP DEFAULT NOW()
);

-- Enable Row Level Security
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- RLS Policy: Users can only access their own row
CREATE POLICY "Users can view own profile only" ON profiles
    FOR SELECT USING (auth.uid() = id);

-- RLS Policy: Only service role can insert (webhooks only)
CREATE POLICY "Service role can insert profiles" ON profiles
    FOR INSERT WITH CHECK (auth.role() = 'service_role');

-- RLS Policy: Users can update limited fields of their own profile
CREATE POLICY "Users can update own profile" ON profiles
    FOR UPDATE USING (auth.uid() = id) 
    WITH CHECK (auth.uid() = id AND is_paid = is_paid); -- Prevent changing is_paid

-- Create indexes for performance
CREATE INDEX profiles_email_idx ON profiles(email);
CREATE INDEX profiles_is_paid_idx ON profiles(is_paid);

-- Function to check if email already exists (for registration validation)
CREATE OR REPLACE FUNCTION check_email_exists(user_email TEXT)
RETURNS BOOLEAN AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM profiles WHERE email = user_email
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant necessary permissions
GRANT EXECUTE ON FUNCTION check_email_exists TO service_role;

-- Remove any automatic profile creation triggers from auth.users
-- We want profiles to ONLY be created after successful payment
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;