# 🔧 DEVELOPMENT CONFIGURATION

## For Local Development Only

When running `netlify dev` locally, you need your actual Supabase keys in these files:

### 1. Update your local .env file:
```env
SUPABASE_URL=https://fifqqnflxwfgnidawxzw.supabase.co
SUPABASE_ANON_KEY=[YOUR_NEW_REGENERATED_KEY]
SUPABASE_SERVICE_ROLE_KEY=[YOUR_NEW_REGENERATED_SERVICE_KEY]
OPENAI_API_KEY=[YOUR_OPENAI_KEY]
```

### 2. Update public/config/config.js for local testing:
```javascript
const CONFIG = {
    SUPABASE_URL: 'https://fifqqnflxwfgnidawxzw.supabase.co',
    SUPABASE_ANON_KEY: '[YOUR_NEW_REGENERATED_KEY]',
    APP_NAME: 'FlexiCAD Designer',
    VERSION: '1.0.0',
    NETLIFY_FUNCTIONS_BASE: '/.netlify/functions'
};
```

### 3. Local Development Commands:
```bash
# Start local development server
netlify dev

# Your local site will be at:
# http://localhost:8888
```

## ⚠️ IMPORTANT SECURITY NOTES:

1. **NEVER commit real API keys to GitHub**
2. **Always use placeholder values in config.js when pushing**
3. **Use environment variables for production (Netlify handles this)**

## Development vs Production:

- **Local:** Real keys in .env and config.js for testing
- **Production:** Real keys in Netlify env vars, placeholders in code