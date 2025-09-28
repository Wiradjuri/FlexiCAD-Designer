-- Complete AI Learning System Setup for FlexiCAD Designer
-- Run this in your Supabase SQL Editor

-- 1. First, ensure the profiles table exists with payment status
CREATE TABLE IF NOT EXISTS profiles (
    id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
    email TEXT NOT NULL,
    full_name TEXT,
    username TEXT UNIQUE,
    avatar_url TEXT,
    
    -- Payment status fields
    is_paid BOOLEAN DEFAULT false NOT NULL,
    subscription_plan TEXT DEFAULT 'monthly' CHECK (subscription_plan IN ('monthly', 'yearly')),
    is_active BOOLEAN DEFAULT true NOT NULL,
    stripe_customer_id TEXT,
    payment_date TIMESTAMP WITH TIME ZONE,
    
    -- FlexiCAD specific fields
    design_count INTEGER DEFAULT 0,
    preferred_units TEXT DEFAULT 'mm' CHECK (preferred_units IN ('mm', 'cm', 'in')),
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. AI Learning Sessions table (stores all generations)
CREATE TABLE IF NOT EXISTS ai_learning_sessions (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
    session_id TEXT NOT NULL,
    user_prompt TEXT NOT NULL,
    system_prompt TEXT NOT NULL,
    generated_code TEXT NOT NULL,
    user_feedback INTEGER CHECK (user_feedback BETWEEN 1 AND 5),
    feedback_text TEXT,
    was_modified BOOLEAN DEFAULT FALSE,
    final_code TEXT,
    design_category TEXT,
    complexity_level TEXT CHECK (complexity_level IN ('beginner', 'intermediate', 'advanced')),
    generation_time_ms INTEGER,
    tokens_used INTEGER,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. AI Knowledge Base (learned patterns)
CREATE TABLE IF NOT EXISTS ai_knowledge_base (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    pattern_name TEXT UNIQUE NOT NULL,
    description TEXT,
    keywords TEXT[],
    example_prompt TEXT NOT NULL,
    successful_code TEXT NOT NULL,
    usage_count INTEGER DEFAULT 1,
    average_rating DECIMAL(3,2) DEFAULT 0.0,
    category TEXT,
    complexity_level TEXT CHECK (complexity_level IN ('beginner', 'intermediate', 'advanced')),
    created_from_session UUID REFERENCES ai_learning_sessions(id),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. Promo Codes System
CREATE TABLE IF NOT EXISTS promo_codes (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    code TEXT UNIQUE NOT NULL,
    description TEXT,
    discount_percent INTEGER NOT NULL CHECK (discount_percent BETWEEN 1 AND 100),
    active BOOLEAN DEFAULT TRUE,
    expires_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 5. Enhanced Designs table with AI learning integration
CREATE TABLE IF NOT EXISTS designs (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    prompt TEXT,
    code TEXT NOT NULL,
    ai_session_id UUID REFERENCES ai_learning_sessions(id),
    template_used TEXT,
    parameters JSONB,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 6. Create Indexes for Performance
CREATE INDEX IF NOT EXISTS idx_ai_learning_user_id ON ai_learning_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_ai_learning_category ON ai_learning_sessions(design_category);
CREATE INDEX IF NOT EXISTS idx_ai_learning_created ON ai_learning_sessions(created_at);
CREATE INDEX IF NOT EXISTS idx_ai_knowledge_keywords ON ai_knowledge_base USING GIN(keywords);
CREATE INDEX IF NOT EXISTS idx_ai_knowledge_category ON ai_knowledge_base(category);
CREATE INDEX IF NOT EXISTS idx_ai_knowledge_rating ON ai_knowledge_base(average_rating DESC);
CREATE INDEX IF NOT EXISTS idx_designs_user_id ON designs(user_id);
CREATE INDEX IF NOT EXISTS idx_designs_created ON designs(created_at DESC);

-- 7. Enable Row Level Security
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_learning_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_knowledge_base ENABLE ROW LEVEL SECURITY;
ALTER TABLE promo_codes ENABLE ROW LEVEL SECURITY;
ALTER TABLE designs ENABLE ROW LEVEL SECURITY;

-- 8. RLS Policies

-- Profiles policies
CREATE POLICY "Public profiles are viewable by everyone" ON profiles
    FOR SELECT USING (true);

CREATE POLICY "Users can insert their own profile" ON profiles
    FOR INSERT WITH CHECK (auth.uid() = id);

CREATE POLICY "Users can update own profile" ON profiles
    FOR UPDATE USING (auth.uid() = id);

-- AI Learning Sessions policies
CREATE POLICY "Users can view own learning sessions" ON ai_learning_sessions
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own learning sessions" ON ai_learning_sessions
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own learning sessions" ON ai_learning_sessions
    FOR UPDATE USING (auth.uid() = user_id);

-- Knowledge base policies (readable by paid users)
CREATE POLICY "Paid users can view knowledge base" ON ai_knowledge_base
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM profiles 
            WHERE profiles.id = auth.uid() 
            AND profiles.is_paid = true 
            AND profiles.is_active = true
        )
    );

-- Service role can modify knowledge base
CREATE POLICY "Service can modify knowledge base" ON ai_knowledge_base
    FOR ALL USING (auth.jwt() ->> 'role' = 'service_role');

-- Promo codes (admin only)
CREATE POLICY "Admin can manage promo codes" ON promo_codes
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM profiles 
            WHERE profiles.id = auth.uid() 
            AND profiles.email = 'bmuzza1992@gmail.com'
        )
    );

-- Designs policies
CREATE POLICY "Users can view own designs" ON designs
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own designs" ON designs
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own designs" ON designs
    FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own designs" ON designs
    FOR DELETE USING (auth.uid() = user_id);

-- 9. Functions for AI Learning

-- Function to update knowledge base from high-rated sessions
CREATE OR REPLACE FUNCTION update_knowledge_base_from_session()
RETURNS TRIGGER AS $$
BEGIN
    -- Only process sessions with high ratings (4 or 5)
    IF NEW.user_feedback >= 4 AND NEW.user_feedback IS NOT NULL THEN
        INSERT INTO ai_knowledge_base (
            pattern_name,
            description,
            keywords,
            example_prompt,
            successful_code,
            category,
            complexity_level,
            created_from_session,
            average_rating
        ) VALUES (
            'Pattern_' || NEW.session_id,
            'Successful pattern learned from user session',
            string_to_array(
                lower(regexp_replace(NEW.user_prompt, '[^\w\s]', '', 'g')), 
                ' '
            ),
            NEW.user_prompt,
            COALESCE(NEW.final_code, NEW.generated_code),
            NEW.design_category,
            NEW.complexity_level,
            NEW.id,
            NEW.user_feedback::decimal
        )
        ON CONFLICT (pattern_name) DO UPDATE SET
            usage_count = ai_knowledge_base.usage_count + 1,
            average_rating = (ai_knowledge_base.average_rating + NEW.user_feedback::decimal) / 2,
            updated_at = NOW();
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger for knowledge base updates
CREATE TRIGGER ai_learning_feedback_trigger
    AFTER UPDATE OF user_feedback ON ai_learning_sessions
    FOR EACH ROW
    EXECUTE FUNCTION update_knowledge_base_from_session();

-- 10. Insert some example promo codes
INSERT INTO promo_codes (code, description, discount_percent, expires_at) VALUES
('WELCOME20', '20% off for new customers', 20, '2025-12-31 23:59:59+00'),
('EARLYBIRD', '30% off early bird special', 30, '2025-11-30 23:59:59+00'),
('STUDENT15', '15% student discount', 15, NULL),
('BLACKFRIDAY', '50% Black Friday special', 50, '2025-11-30 23:59:59+00')
ON CONFLICT (code) DO NOTHING;

-- 11. Create admin profile for bmuzza1992@gmail.com
-- First check if user exists
DO $$
DECLARE
    admin_user_id UUID;
BEGIN
    -- Try to find the user in auth.users
    SELECT id INTO admin_user_id FROM auth.users WHERE email = 'bmuzza1992@gmail.com' LIMIT 1;
    
    IF admin_user_id IS NOT NULL THEN
        -- Create or update profile
        INSERT INTO profiles (id, email, is_paid, is_active, subscription_plan, stripe_customer_id, payment_date)
        VALUES (admin_user_id, 'bmuzza1992@gmail.com', true, true, 'monthly', 'admin_manual', NOW())
        ON CONFLICT (id) DO UPDATE SET
            is_paid = true,
            is_active = true,
            updated_at = NOW();
            
        RAISE NOTICE 'Admin profile created/updated for bmuzza1992@gmail.com';
    ELSE
        RAISE NOTICE 'User bmuzza1992@gmail.com not found in auth.users - register first, then run this again';
    END IF;
END $$;

-- Success message
SELECT 'FlexiCAD AI Learning System setup complete!' as status;