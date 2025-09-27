-- Safe migration to add is_paid column with RLS policies
-- This migration is idempotent and can be run multiple times safely

-- Add is_paid column if missing
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema='public' AND table_name='profiles' AND column_name='is_paid'
  ) THEN
    ALTER TABLE public.profiles ADD COLUMN is_paid boolean DEFAULT false;
  END IF;
END$$;

-- Ensure existing columns
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema='public' AND table_name='profiles' AND column_name='created_at'
  ) THEN
    ALTER TABLE public.profiles ADD COLUMN created_at timestamptz DEFAULT now();
  END IF;
END$$;

-- RLS policies to allow owner read/insert/update of their profile
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='profiles' AND policyname='profiles_read_own'
  ) THEN
    CREATE POLICY "profiles_read_own" ON public.profiles
    FOR SELECT USING (auth.uid() = id);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='profiles' AND policyname='profiles_insert_own'
  ) THEN
    CREATE POLICY "profiles_insert_own" ON public.profiles
    FOR INSERT WITH CHECK (auth.uid() = id);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='profiles' AND policyname='profiles_update_own'
  ) THEN
    CREATE POLICY "profiles_update_own" ON public.profiles
    FOR UPDATE USING (auth.uid() = id) WITH CHECK (auth.uid() = id);
  END IF;
END$$;