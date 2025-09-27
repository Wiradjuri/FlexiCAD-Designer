# 🔐 PRODUCTION SECURITY SETUP GUIDE

## ⚠️ CRITICAL SECURITY ACTIONS REQUIRED

### 1. IMMEDIATE ACTIONS - PROTECT YOUR KEYS

**🚨 Your current .env file contains LIVE production keys that could be exposed!**

#### A. Secure Your Repository
```bash
# 1. Make sure .env is in .gitignore (✅ Already done)
# 2. Remove any committed .env files from Git history
git rm --cached .env
git commit -m "Remove .env file with sensitive data"

# 3. Check if any secrets are in your GitHub repo
git log --all --grep="STRIPE\|SUPABASE" --oneline
```

#### B. Rotate Your API Keys (RECOMMENDED)
1. **Stripe Keys**: 
   - Go to https://dashboard.stripe.com/apikeys
   - Create new keys and update your .env file
   - Delete the old keys from Stripe dashboard

2. **Supabase Keys**: 
   - Go to your Supabase project > Settings > API
   - Regenerate your anon key if possible
   - Update your .env file with new keys

### 2. PRODUCTION DEPLOYMENT SETUP

#### A. Environment Variables for Netlify
1. Go to your Netlify dashboard
2. Go to Site Settings > Environment Variables
3. Add these variables (DO NOT add to config.js):

```bash
# Supabase Configuration
SUPABASE_URL=https://fifqqnflxwfgnidawxzw.supabase.co
SUPABASE_ANON_KEY=your-anon-key-here
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key-here

# Stripe Configuration  
STRIPE_PUBLISHABLE_KEY=pk_live_...
STRIPE_SECRET_KEY=sk_live_...
STRIPE_WEBHOOK_SECRET=whsec_...

# OpenAI Configuration
OPENAI_API_KEY=sk-proj-...
OPENAI_MODEL=gpt-4o-mini
OPENAI_ASSISTANT_ID=asst_...
OPENAI_VECTOR_STORE_ID=vs_...

# Application Configuration
NODE_ENV=production
APP_ENV=production
ENFORCE_HTTPS=true
ENABLE_CSP=true
APP_NAME=FlexiCAD Designer
APP_VERSION=0.1.0
SUPPORT_EMAIL=admin@Flexicad.com
PAYMENT_CURRENCY=aud
```

#### B. Build and Deploy Process
```bash
# 1. Build with environment variables
npm run build

# 2. Deploy to production
npm run deploy
```

### 3. CONFIGURATION FILES - WHAT'S SAFE

#### ✅ SAFE for GitHub (public/config/config.js):
```javascript
const CONFIG = {
    // These use environment variables - SAFE for GitHub
    SUPABASE_URL: typeof window !== 'undefined' ? window.ENV?.SUPABASE_URL : '',
    SUPABASE_ANON_KEY: typeof window !== 'undefined' ? window.ENV?.SUPABASE_ANON_KEY : '',
    STRIPE_PUBLISHABLE_KEY: typeof window !== 'undefined' ? window.ENV?.STRIPE_PUBLISHABLE_KEY : '',
    
    // Static config - SAFE
    APP_NAME: 'FlexiCAD Designer',
    VERSION: '1.0.0',
    NETLIFY_FUNCTIONS_BASE: '/.netlify/functions'
};
```

#### ❌ NEVER commit to GitHub:
- `.env` files (any environment)
- Hardcoded API keys in any file
- Secret keys in config files
- Database passwords
- Webhook secrets

### 4. PRODUCTION CHECKLIST

#### Before Going Live:
- [ ] All secrets moved to Netlify environment variables
- [ ] .env file not committed to GitHub
- [ ] Config files use environment variables only
- [ ] Test payment flow with live Stripe keys
- [ ] Verify all Netlify functions work in production
- [ ] Set NODE_ENV=production in Netlify
- [ ] Enable HTTPS enforcement
- [ ] Test user registration and authentication
- [ ] Verify AI generation works with production keys

#### Security Verification:
- [ ] No hardcoded secrets in any public file
- [ ] All sensitive config loaded from environment
- [ ] CORS properly configured for production domain
- [ ] Stripe webhooks pointing to production URL
- [ ] Database RLS policies active
- [ ] Authentication sessions properly secured

### 5. DEVELOPMENT vs PRODUCTION

#### Development (.env file):
```bash
NODE_ENV=development
SUPABASE_URL=https://your-project.supabase.co
STRIPE_PUBLISHABLE_KEY=pk_test_...  # Test keys
```

#### Production (Netlify Environment Variables):
```bash
NODE_ENV=production
SUPABASE_URL=https://your-project.supabase.co  
STRIPE_PUBLISHABLE_KEY=pk_live_...  # Live keys
```

### 6. EMERGENCY PROCEDURES

If keys are exposed:
1. **Immediately** rotate all API keys
2. Check Stripe dashboard for unauthorized transactions
3. Review Supabase logs for suspicious activity
4. Update environment variables with new keys
5. Redeploy application

## 🎯 NEXT STEPS

1. **Set up Netlify environment variables**
2. **Test the payment flow** 
3. **Verify the build works** with `npm run build`
4. **Deploy to production** with `npm run deploy`

Your application is now production-ready with proper security practices!