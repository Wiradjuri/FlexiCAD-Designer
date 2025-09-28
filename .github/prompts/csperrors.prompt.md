---
mode: agent
---
You need to add a Content-Security-Policy header to your Netlify configuration to enhance the security of your web application. The policy should restrict the sources from which various types of content can be loaded, including scripts, styles, fonts, images, frames, and connections.

The stripe payment integration requires specific permissions to load scripts and frames from Stripe's domains. Additionally, you are using Supabase for backend services, which also needs to be allowed in the connect-src directive.

Here is the updated Content-Security-Policy header that you should add to your Netlify configuration:

```Content-Security-Policy = "default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval' https://unpkg.com https://cdn.jsdelivr.net https://js.stripe.com; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src 'self' https://fonts.gstatic.com; img-src 'self' data: https:; frame-src 'self' https://js.stripe.com https://*.stripe.com; connect-src 'self' https://*.supabase.co https://api.stripe.com https://*.stripe.com;"
```
Make sure to replace the existing Content-Security-Policy line in your Netlify configuration with the one provided above. This will ensure that your application is secure while still allowing the necessary functionality for Stripe payments and Supabase connections.

Here is how the relevant section of your `netlify.toml` file should look after the update:

```toml
[[headers]]
  for = "/*"
  [headers.values]
    X-Frame-Options = "DENY"
    X-XSS-Protection = "1; mode=block"
    X-Content-Type-Options = "nosniff"
    Referrer-Policy = "strict-origin-when-cross-origin"
    Permissions-Policy = "camera=(), microphone=(), geolocation=()"
    Content-Security-Policy = "default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval' https://unpkg.com https://cdn.jsdelivr.net https://js.stripe.com; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src 'self' https://fonts.gstatic.com; img-src 'self' data: https:; frame-src 'self' https://js.stripe.com https://*.stripe.com; connect-src 'self' https://*.supabase.co https://api.stripe.com https://*.stripe.com;"

```

ensure there is a promo code box on the pricing page and it should check if the admin has made any promo codes and apply them if valid

FIX this csp error:
Content-Security-Policy: The page’s settings blocked the loading of a resource (frame-src) at https://js.stripe.com/v3/m-outer-3437aaddcdf6922d623e172c2d6f9278.html#url=http%3A%2F%2Flocalhost%3A8888%2Fpayment-success.html%3Fsession_id%3Dcs_live_a1Yef9IyDJsl1IzcuZtzE4hb76Oqyg5tT73vxhFJ1kuiR3FlVonOhFynXS%26user_id%3D&title=Payment%20Success%20-%20FlexiCAD%20Designer&referrer=&muid=NA&sid=NA&version=6&preview=false&__shared_params__[version]=v3 because it violates the following directive: “default-src 'self'” payment-success.html
You need to update your Content-Security-Policy (CSP) to allow loading resources from Stripe's domains. The error message indicates that the current CSP is too restrictive and is blocking the loading of a resource from `https://js.stripe.com`.

To fix this, you should modify the `script-src` and `frame-src` directives in your CSP to include Stripe's domains. Here is an updated version of your CSP that includes the necessary permissions for Stripe:

```toml
Content-Security-Policy = "default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval' https://unpkg.com https://cdn.jsdelivr.net https://js.stripe.com; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src 'self' https://fonts.gstatic.com; img-src 'self' data: https:; frame-src 'self' https://js.stripe.com https://*.stripe.com; connect-src 'self' https://*.supabase.co https://api.stripe.com https://*.stripe.com;"
```
Make sure to replace the existing `Content-Security-Policy` line in your Netlify configuration with the one provided above. This will ensure that your application can load resources from Stripe while maintaining a secure CSP.

