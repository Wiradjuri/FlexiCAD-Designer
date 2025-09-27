# SECURITY NOTICE

This directory previously contained files that exposed API keys to the public.

Those files have been moved to secure server-side configuration.

## Files removed for security:
- env-config.js (DELETED - contained exposed API keys)
- config.js (moved to config.js.INSECURE.backup)

## New secure system:
- All sensitive configuration is now served from /.netlify/functions/get-public-config
- Client applications use js/secure-config-loader.js
- No API keys are stored in publicly accessible files

## DO NOT:
- Add any .js files to this directory that contain API keys
- Expose SUPABASE_SERVICE_ROLE_KEY or other private keys
- Commit any files containing real secrets to git

This file exists to prevent accidental recreation of insecure config files.