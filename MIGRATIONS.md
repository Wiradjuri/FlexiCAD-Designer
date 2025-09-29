# FlexiCAD Designer Database Migrations

This document outlines the database schema setup and migrations required for FlexiCAD Designer after the surgical hardening improvements.

## Latest Changes (Surgical Hardening Update)

The recent surgical improvements include:
- Enhanced AI feedback system with quality_score and quality_label
- Admin console with health monitoring  
- Star rating system with explicit meanings
- All existing tables and RLS policies remain functional

## Prerequisites

- Supabase project set up and configured
- Admin access to Supabase SQL editor
- Environment variables properly configured in Netlify

## Required Environment Variables

Ensure these are set in your Netlify dashboard:

**Core:**
- `SUPABASE_URL`, `SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`
- `OPENAI_API_KEY`, `OPENAI_MODEL` (defaults to gpt-4o-mini)
- `STRIPE_SECRET_KEY`, `STRIPE_PUBLISHABLE_KEY`
- `STRIPE_MONTHLY_PRICE_ID`, `STRIPE_YEARLY_PRICE_ID`, `STRIPE_WEBHOOK_SECRET`

**Admin Test Harness:**
- `ADMIN_EMAIL` (defaults to bmuzza1992@gmail.com)
- `STRIPE_PRICE_TEST` (Stripe price ID for admin test checkouts)
- `OPENAI_MAX_TOKENS` (defaults to 256 for smoke tests)

**Optional:**
- `E2E_BASE_URL`, `RUN_ADMIN_E2E` (for automated testing)

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

### 6. Phase 4.3 Admin Test Harness Extensions

**A) Feedback Review System**

```sql
-- Copy and paste the contents of database/feedback_review_schema.sql
-- This adds review fields to existing ai_feedback table:
-- - review_status (pending/accepted/rejected)
-- - reviewed_by (admin email)
-- - reviewed_at (timestamp)
-- - quality_label (unusable/poor/ok/good/excellent)
```

**B) Training Examples Storage**

```sql
-- Copy and paste the contents of database/training_examples_schema.sql
-- This creates ai_training_examples table for curated learning data:
-- - Stores accepted feedback as training examples
-- - Admin-only RLS policies
-- - Tags and categorization support
```

**C) Webhook Events Tracking (Optional)**

```sql
-- Copy and paste the contents of database/webhook_events_schema.sql
-- This creates webhook_events table for admin test harness:
-- - Tracks Stripe webhook events for testing
-- - Admin-only access for debugging payment flows
-- - Optional table - only needed for webhook monitoring
```

**D) Training Assets Database Table**

```sql
-- Copy and paste the contents of database/training_assets_schema.sql
-- This creates training_assets table for uploaded file metadata:
-- - Stores SVG/SCAD/JSONL file metadata
-- - Admin-only RLS policies via is_admin() helper function
-- - Supports tagging and file categorization
-- - Tracks upload metadata and file paths
```

**E) AI Feedback Table with Review Workflow**

```sql
-- Copy and paste the contents of database/ai_feedback_schema.sql
-- This creates proper ai_feedback table with review workflow:
-- - Stores user feedback with quality scores and ratings
-- - Admin review workflow with pending/accepted/rejected states
-- - Audit trail for admin decisions
-- - Integration with ai_training_examples for accepted feedback
```

**F) Supabase Storage Setup**

For training assets management, create a storage bucket:

1. Go to Supabase Dashboard → Storage
2. Create new bucket named `training-assets`
3. Set bucket policy to admin-only:

```sql
-- Storage policy for training assets (run in Supabase SQL editor)
INSERT INTO storage.policies (name, bucket_id, roles, query)
VALUES (
    'Admin can manage training assets',
    'training-assets',
    '{authenticated}',
    'auth.uid() IN (SELECT id FROM profiles WHERE email = ''bmuzza1992@gmail.com'')'
);
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

**Required for Core Functionality:**
- `SUPABASE_URL` - Your Supabase project URL
- `SUPABASE_ANON_KEY` - Supabase anonymous key (public)
- `SUPABASE_SERVICE_ROLE_KEY` - Supabase service role key (private)
- `OPENAI_API_KEY` - OpenAI API key for AI generation
- `STRIPE_SECRET_KEY` - Stripe secret key for payments
- `STRIPE_PUBLISHABLE_KEY` - Stripe publishable key (public)

**Required for Admin Test Harness:**
- `ADMIN_EMAIL` - Admin email (defaults to bmuzza1992@gmail.com)
- `STRIPE_PRICE_TEST` - Stripe price ID for admin test checkout (e.g., price_test_...)

**Optional for Enhanced Testing:**
- `OPENAI_MODEL` - AI model (defaults to gpt-4o-mini)
- `OPENAI_MAX_TOKENS` - Token limit for smoke tests (defaults to 256)
- `E2E_BASE_URL` - Base URL for E2E testing
- `RUN_ADMIN_E2E` - Enable admin E2E tests (true/false)

## Admin Test Harness Setup

### 1. Webhook Events Table (Optional)

For full admin testing capabilities, add the webhook events table:

```sql
-- See database/webhook_events_schema.sql for complete setup
CREATE TABLE IF NOT EXISTS webhook_events (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    event_id VARCHAR(255) UNIQUE NOT NULL,
    event_type VARCHAR(100) NOT NULL,
    customer_email VARCHAR(255),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

### 2. Stripe Test Mode Configuration

1. Use Stripe **Test Mode** keys only (`sk_test_` and `pk_test_`)
2. Create a test price in Stripe Dashboard
3. Set `STRIPE_PRICE_TEST` environment variable to the price ID
4. Admin console will automatically detect live keys and disable tests

### 3. Admin Access Verification

The admin console at `/admin/manage-prompts.html` requires:
- Authenticated user with email matching `ADMIN_EMAIL`
- All environment variables properly configured
- Proper RLS policies (automatically applied during migrations)

## Next Steps

After migrations are complete:

1. **Test Core Flow**: Registration → Payment → AI Generation → Feedback
2. **Admin Console**: Access `/admin/manage-prompts.html` and run all tests
3. **Stripe Testing**: Use test card `4242 4242 4242 4242` for checkout tests
4. **AI Smoke Test**: Verify AI generation works with token limits
5. **Monitor Health**: Check system health indicators regularly
6. **Set Up Monitoring**: Configure logging and error tracking

All migrations are designed to be idempotent - you can run them multiple times safely.