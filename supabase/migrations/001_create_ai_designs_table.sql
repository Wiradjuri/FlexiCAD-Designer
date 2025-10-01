-- SQL script to create the ai_designs table if it doesn't exist
-- Run this in your Supabase SQL Editor

CREATE TABLE IF NOT EXISTS public.ai_designs (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    name TEXT NOT NULL,
    prompt TEXT NOT NULL,
    code TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create RLS (Row Level Security) policies
ALTER TABLE public.ai_designs ENABLE ROW LEVEL SECURITY;

-- Policy: Users can only see their own designs
DROP POLICY IF EXISTS "Users can view own designs" ON public.ai_designs;
CREATE POLICY "Users can view own designs" ON public.ai_designs
    FOR SELECT USING (auth.uid() = user_id);

-- Policy: Users can insert their own designs
DROP POLICY IF EXISTS "Users can insert own designs" ON public.ai_designs;
CREATE POLICY "Users can insert own designs" ON public.ai_designs
    FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Policy: Users can update their own designs
DROP POLICY IF EXISTS "Users can update own designs" ON public.ai_designs;
CREATE POLICY "Users can update own designs" ON public.ai_designs
    FOR UPDATE USING (auth.uid() = user_id);

-- Policy: Users can delete their own designs
DROP POLICY IF EXISTS "Users can delete own designs" ON public.ai_designs;
CREATE POLICY "Users can delete own designs" ON public.ai_designs
    FOR DELETE USING (auth.uid() = user_id);

-- Create an index for better query performance
CREATE INDEX IF NOT EXISTS ai_designs_user_id_idx ON public.ai_designs(user_id);
CREATE INDEX IF NOT EXISTS ai_designs_created_at_idx ON public.ai_designs(created_at DESC);