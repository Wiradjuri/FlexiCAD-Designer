# Netlify Environment Variables Setup

To fix the build failure, you need to set these environment variables in your Netlify dashboard:

## Critical (Required for build to succeed):
```
OPENAI_API_KEY=sk-proj-your-openai-key-here
```

## Optional (for full functionality):
```
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_ANON_KEY=your-supabase-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-supabase-service-role-key
STRIPE_PUBLISHABLE_KEY=pk_live_or_test_your-stripe-key
STRIPE_SECRET_KEY=sk_live_or_test_your-stripe-secret
STRIPE_WEBHOOK_SECRET=whsec_your-webhook-secret
```

## How to set environment variables in Netlify:

1. Go to your Netlify dashboard
2. Select your FlexiCAD-Designer project
3. Go to "Site settings" > "Environment variables"
4. Click "Add variable" for each one
5. Set the variable name and value
6. Click "Save"

## Build Configuration Changes Made:

- ✅ Modified build script to only require OPENAI_API_KEY as critical
- ✅ Added feature flags based on available environment variables
- ✅ Created production-specific build script
- ✅ Updated netlify.toml to use production build script
- ✅ Added graceful handling of missing optional variables

## What will work with current setup:
- ✅ AI Code Generation (if OPENAI_API_KEY is set)
- ❌ User Authentication (requires Supabase)
- ❌ Payments (requires Stripe)

The site will build and deploy successfully with just the OpenAI API key configured!