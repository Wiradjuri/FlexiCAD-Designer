# FlexiCAD Designer Database Migrations

This document outlines the database migrations needed to fully set up the FlexiCAD Designer system with all features enabled.

## Prerequisites

- Supabase project set up and configured
- Admin access to Supabase SQL editor
- Environment variables properly configured in Netlify

## Migration Steps

### 1. Core Tables Setup (Required)

If you haven't already set up the basic tables, run this first:

```sql
-- Basic profiles table (usually auto-created by Supabase Auth)
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

-- Basic designs table
CREATE TABLE IF NOT EXISTS designs (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    prompt TEXT,
    code TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE designs ENABLE ROW LEVEL SECURITY;

-- Basic RLS policies
CREATE POLICY "Users can view own profile" ON profiles FOR SELECT USING (auth.uid() = id);
CREATE POLICY "Users can update own profile" ON profiles FOR UPDATE USING (auth.uid() = id);
CREATE POLICY "Users can view own designs" ON designs FOR ALL USING (auth.uid() = user_id);
```

### 2. AI Learning System Migration

Run the complete AI learning setup from the database directory:

```sql
-- Copy and paste the contents of database/setup_ai_learning.sql
-- This includes:
-- - ai_learning_sessions table
-- - ai_knowledge_base table  
-- - ai_corrections table
-- - Proper indexes
-- - RLS policies
```

Or run it directly if you have access to the file:

```bash
# If using Supabase CLI
supabase db reset --db-url "your-supabase-url"
supabase db push
```

### 3. Promo Codes System Migration

Set up the promo codes system:

```sql
-- Copy and paste the contents of database/setup_promo_codes.sql
-- This includes:
-- - promo_codes table
-- - RLS policies for admin access
-- - Example promo codes
```

### 4. Enhanced Designs Table Migration

Upgrade the designs table to integrate with AI learning:

```sql
-- Add AI learning integration to existing designs table
ALTER TABLE designs ADD COLUMN IF NOT EXISTS ai_session_id UUID REFERENCES ai_learning_sessions(id);
ALTER TABLE designs ADD COLUMN IF NOT EXISTS template_used TEXT;
ALTER TABLE designs ADD COLUMN IF NOT EXISTS parameters JSONB;

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_designs_ai_session ON designs(ai_session_id);
CREATE INDEX IF NOT EXISTS idx_designs_template ON designs(template_used);
```

### 5. Admin User Setup

Set up admin privileges (replace with your actual admin email):

```sql
-- Update the admin email in RLS policies
-- This is set in database/setup_promo_codes.sql
-- Make sure to update 'bmuzza1992@gmail.com' to your admin email

-- Verify admin access
SELECT 'Admin access configured for: bmuzza1992@gmail.com' as admin_info;
```

## Verification Steps

After running the migrations, verify everything is working:

### 1. Check Tables Exist

```sql
-- Verify all tables exist
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
    AND table_name IN ('profiles', 'designs', 'ai_learning_sessions', 'ai_knowledge_base', 'promo_codes')
ORDER BY table_name;
```

### 2. Check RLS Policies

```sql
-- Check RLS is enabled
SELECT schemaname, tablename, rowsecurity 
FROM pg_tables 
WHERE schemaname = 'public' 
    AND tablename IN ('profiles', 'designs', 'ai_learning_sessions', 'ai_knowledge_base', 'promo_codes');
```

### 3. Test Promo Codes

```sql
-- Check example promo codes were created
SELECT code, description, discount_percent, active 
FROM promo_codes 
WHERE active = true;
```

### 4. Run Integration Tests

```bash
# Install test dependencies
npm install

# Run tests against local dev server
npm run test:dev

# Or against production
npm run test:prod
```

## Rollback Instructions

If you need to rollback any migration:

### Remove AI Learning System

```sql
-- WARNING: This will delete all AI learning data
DROP TABLE IF EXISTS ai_corrections CASCADE;
DROP TABLE IF EXISTS ai_knowledge_base CASCADE;
DROP TABLE IF EXISTS ai_learning_sessions CASCADE;

-- Remove columns from designs table
ALTER TABLE designs DROP COLUMN IF EXISTS ai_session_id;
ALTER TABLE designs DROP COLUMN IF EXISTS template_used;
ALTER TABLE designs DROP COLUMN IF EXISTS parameters;
```

### Remove Promo Codes System

```sql
-- WARNING: This will delete all promo codes
DROP TABLE IF EXISTS promo_codes CASCADE;
```

## Troubleshooting

### Common Issues

1. **Permission Denied**: Ensure you're running migrations as the database owner or with proper permissions.

2. **Table Already Exists**: All migrations use `CREATE TABLE IF NOT EXISTS` so they're safe to re-run.

3. **RLS Policy Conflicts**: If policies already exist, you may need to drop them first:
   ```sql
   DROP POLICY IF EXISTS "policy_name" ON table_name;
   ```

4. **Admin Email Not Working**: Update the admin email in the RLS policies:
   ```sql
   -- Find existing policies
   SELECT policyname, tablename FROM pg_policies WHERE tablename = 'promo_codes';
   
   -- Update admin email in policies
   -- You'll need to drop and recreate the policies with the correct email
   ```

### Getting Help

If you encounter issues:

1. Check the Supabase dashboard for error messages
2. Review the Netlify function logs for runtime errors
3. Run the integration tests to identify specific problems
4. Check the browser console for frontend issues

## Environment Variables Checklist

Ensure these are set in your Netlify environment:

- `SUPABASE_URL` - Your Supabase project URL
- `SUPABASE_ANON_KEY` - Supabase anonymous key (public)
- `SUPABASE_SERVICE_ROLE_KEY` - Supabase service role key (private)
- `OPENAI_API_KEY` - OpenAI API key for AI generation
- `STRIPE_SECRET_KEY` - Stripe secret key for payments
- `STRIPE_PUBLISHABLE_KEY` - Stripe publishable key (public)

## Next Steps

After migrations are complete:

1. Test the payment flow end-to-end
2. Verify AI generation and feedback work
3. Test promo code creation and validation
4. Run full integration tests
5. Set up monitoring and logging
6. Configure backup strategy for your database

All migrations are designed to be idempotent - you can run them multiple times safely.