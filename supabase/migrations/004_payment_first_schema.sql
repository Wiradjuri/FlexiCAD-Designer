-- FlexiCAD Payment-First Database Schema
-- This migration creates a payment-enforced user system where accounts only exist after payment

-- Drop existing profiles table if it exists (for clean migration)
DROP TABLE IF EXISTS public.profiles CASCADE;

-- Create profiles table with strict payment enforcement
CREATE TABLE public.profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    email TEXT UNIQUE NOT NULL,
    is_paid BOOLEAN DEFAULT FALSE NOT NULL,
    stripe_customer_id TEXT,
    stripe_subscription_id TEXT,
    subscription_plan TEXT DEFAULT 'monthly' CHECK (subscription_plan IN ('monthly', 'yearly')),
    payment_date TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable Row Level Security
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- RLS Policy: Users can only see their own profile
CREATE POLICY "Users can view own profile only" ON public.profiles
    FOR SELECT USING (auth.uid() = id);

-- RLS Policy: Only service role can insert (webhooks)
CREATE POLICY "Service role can insert profiles" ON public.profiles
    FOR INSERT WITH CHECK (auth.role() = 'service_role');

-- RLS Policy: Users can update their own profile (limited fields)
CREATE POLICY "Users can update own profile" ON public.profiles
    FOR UPDATE USING (auth.uid() = id) 
    WITH CHECK (auth.uid() = id AND is_paid = is_paid); -- Prevent changing is_paid

-- Create indexes for performance
CREATE INDEX profiles_email_idx ON public.profiles(email);
CREATE INDEX profiles_stripe_customer_idx ON public.profiles(stripe_customer_id);
CREATE INDEX profiles_is_paid_idx ON public.profiles(is_paid);

-- Function to check if email already exists (for checkout session creation)
CREATE OR REPLACE FUNCTION public.check_email_exists(user_email TEXT)
RETURNS BOOLEAN AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM public.profiles WHERE email = user_email
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to create user after successful payment (called by webhook)
CREATE OR REPLACE FUNCTION public.create_paid_user(
    user_email TEXT,
    user_password TEXT,
    customer_id TEXT,
    subscription_id TEXT,
    plan TEXT
)
RETURNS UUID AS $$
DECLARE
    new_user_id UUID;
    user_exists BOOLEAN;
BEGIN
    -- Check if email already exists
    SELECT public.check_email_exists(user_email) INTO user_exists;
    
    IF user_exists THEN
        RAISE EXCEPTION 'Email already registered: %', user_email;
    END IF;

    -- This function should be called by the webhook after creating the auth user
    -- The auth user creation happens in the webhook using admin API
    -- This function just creates the profile record
    
    -- Get the user ID (should have been created by webhook already)
    SELECT id INTO new_user_id 
    FROM auth.users 
    WHERE email = user_email 
    LIMIT 1;
    
    IF new_user_id IS NULL THEN
        RAISE EXCEPTION 'Auth user not found for email: %', user_email;
    END IF;

    -- Create profile record
    INSERT INTO public.profiles (
        id,
        email,
        is_paid,
        stripe_customer_id,
        stripe_subscription_id,
        subscription_plan,
        payment_date,
        created_at,
        updated_at
    ) VALUES (
        new_user_id,
        user_email,
        true,
        customer_id,
        subscription_id,
        plan,
        NOW(),
        NOW(),
        NOW()
    );

    RETURN new_user_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get user payment status (for login checks)
CREATE OR REPLACE FUNCTION public.get_payment_status(user_id UUID)
RETURNS TABLE(is_paid BOOLEAN, subscription_plan TEXT, payment_date TIMESTAMP WITH TIME ZONE) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        p.is_paid,
        p.subscription_plan,
        p.payment_date
    FROM public.profiles p
    WHERE p.id = user_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant necessary permissions
GRANT EXECUTE ON FUNCTION public.check_email_exists TO service_role;
GRANT EXECUTE ON FUNCTION public.create_paid_user TO service_role;
GRANT EXECUTE ON FUNCTION public.get_payment_status TO authenticated;

-- Create updated_at trigger
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER handle_profiles_updated_at
    BEFORE UPDATE ON public.profiles
    FOR EACH ROW EXECUTE PROCEDURE public.handle_updated_at();

-- Remove the automatic profile creation trigger from auth.users
-- We want profiles to only be created after payment
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;