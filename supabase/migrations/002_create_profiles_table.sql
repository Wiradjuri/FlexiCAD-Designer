-- SQL script to create user profiles table
-- Run this in your Supabase SQL Editor

-- Create profiles table
CREATE TABLE IF NOT EXISTS public.profiles (
    id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
    email TEXT,
    full_name TEXT,
    username TEXT UNIQUE,
    avatar_url TEXT,
    website TEXT,
    bio TEXT,
    
    -- FlexiCAD specific fields
    design_count INTEGER DEFAULT 0,
    preferred_units TEXT DEFAULT 'mm' CHECK (preferred_units IN ('mm', 'cm', 'in')),
    theme_preference TEXT DEFAULT 'dark' CHECK (theme_preference IN ('light', 'dark', 'auto')),
    
    -- Subscription/plan info (for future use)
    plan_type TEXT DEFAULT 'free' CHECK (plan_type IN ('free', 'pro', 'enterprise')),
    subscription_status TEXT DEFAULT 'active' CHECK (subscription_status IN ('active', 'inactive', 'cancelled', 'past_due')),
    subscription_end_date TIMESTAMP WITH TIME ZONE,
    
    -- Usage tracking
    ai_generations_used INTEGER DEFAULT 0,
    ai_generations_limit INTEGER DEFAULT 50, -- Monthly limit for free users
    last_ai_generation TIMESTAMP WITH TIME ZONE,
    
    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Create policies for profiles
CREATE POLICY "Public profiles are viewable by everyone" ON public.profiles
    FOR SELECT USING (true);

CREATE POLICY "Users can insert their own profile" ON public.profiles
    FOR INSERT WITH CHECK (auth.uid() = id);

CREATE POLICY "Users can update own profile" ON public.profiles
    FOR UPDATE USING (auth.uid() = id);

-- Create function to automatically create profile on user signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.profiles (id, email, full_name)
    VALUES (
        NEW.id,
        NEW.email,
        COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'name', split_part(NEW.email, '@', 1))
    );
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger to automatically create profile on signup
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();

-- Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to automatically update updated_at
CREATE TRIGGER handle_profiles_updated_at
    BEFORE UPDATE ON public.profiles
    FOR EACH ROW EXECUTE PROCEDURE public.handle_updated_at();

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS profiles_username_idx ON public.profiles(username);
CREATE INDEX IF NOT EXISTS profiles_email_idx ON public.profiles(email);
CREATE INDEX IF NOT EXISTS profiles_plan_type_idx ON public.profiles(plan_type);

-- Create function to increment design count
CREATE OR REPLACE FUNCTION public.increment_design_count(user_uuid UUID)
RETURNS void AS $$
BEGIN
    UPDATE public.profiles 
    SET design_count = design_count + 1,
        updated_at = NOW()
    WHERE id = user_uuid;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create function to increment AI generation count
CREATE OR REPLACE FUNCTION public.increment_ai_generation(user_uuid UUID)
RETURNS boolean AS $$
DECLARE
    current_count INTEGER;
    generation_limit INTEGER;
BEGIN
    SELECT ai_generations_used, ai_generations_limit 
    INTO current_count, generation_limit
    FROM public.profiles 
    WHERE id = user_uuid;
    
    -- Check if user has exceeded limit
    IF current_count >= generation_limit THEN
        RETURN false; -- Limit exceeded
    END IF;
    
    -- Increment count
    UPDATE public.profiles 
    SET ai_generations_used = ai_generations_used + 1,
        last_ai_generation = NOW(),
        updated_at = NOW()
    WHERE id = user_uuid;
    
    RETURN true; -- Success
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;