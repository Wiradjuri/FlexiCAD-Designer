-- Add missing is_active column to profiles table
-- This column allows for account suspension even if payment is valid

-- Add is_active column if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'profiles' AND column_name = 'is_active'
    ) THEN
        EXECUTE 'ALTER TABLE profiles ADD COLUMN is_active BOOLEAN DEFAULT TRUE';
    END IF;
END
$$ LANGUAGE plpgsql;

-- Create index for performance if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_indexes WHERE indexname = 'profiles_is_active_idx'
    ) THEN
        CREATE INDEX profiles_is_active_idx ON profiles(is_active);
    END IF;
END $$;

-- Update existing records to be active by default
UPDATE profiles SET is_active = TRUE WHERE is_active IS NULL;