-- Payment-first profiles table - users only created after successful payment
CREATE TABLE IF NOT EXISTS public.profiles (
    id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
    email TEXT NOT NULL,
    full_name TEXT,
    username TEXT UNIQUE,
    avatar_url TEXT,
    
    -- Basic FlexiCAD fields
    design_count INTEGER DEFAULT 0,
    preferred_units TEXT DEFAULT 'mm' CHECK (preferred_units IN ('mm', 'cm', 'in')),
    
    -- Payment-first fields
    is_paid BOOLEAN DEFAULT false NOT NULL,
    subscription_plan TEXT DEFAULT 'monthly' CHECK (subscription_plan IN ('monthly', 'yearly')),
    is_active BOOLEAN DEFAULT true NOT NULL,
    stripe_customer_id TEXT,
    payment_date TIMESTAMP WITH TIME ZONE,
    
    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
);

-- Enable RLS
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Simple RLS policies
CREATE POLICY "Public profiles are viewable by everyone" ON public.profiles
    FOR SELECT USING (true);

CREATE POLICY "Users can insert their own profile" ON public.profiles
    FOR INSERT WITH CHECK (auth.uid() = id);

CREATE POLICY "Users can update own profile" ON public.profiles
    FOR UPDATE USING (auth.uid() = id);

-- Payment-first profile creation function - only creates profile after payment
CREATE OR REPLACE FUNCTION public.create_paid_profile(
    user_id UUID,
    user_email TEXT,
    user_name TEXT,
    plan TEXT DEFAULT 'monthly',
    customer_id TEXT DEFAULT NULL
)
RETURNS UUID AS $$
BEGIN
    INSERT INTO public.profiles (id, email, full_name, subscription_plan, is_paid, is_active, stripe_customer_id, payment_date)
    VALUES (
        user_id,
        user_email,
        user_name,
        plan,
        true,
        true,
        customer_id,
        NOW()
    );
    RETURN user_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Remove auto-profile creation trigger (payment-first system)
-- Profiles are only created after successful payment

-- Auto-update timestamp
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

-- Basic indexes
CREATE INDEX IF NOT EXISTS profiles_username_idx ON public.profiles(username);
CREATE INDEX IF NOT EXISTS profiles_email_idx ON public.profiles(email);