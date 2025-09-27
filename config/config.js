window.flexicadConfig = {
  environment: "development",
  siteUrl: "http://localhost:8888",
  api: {
    baseUrl: "/.netlify/functions"
  },
  supabase: {
    // Replace with your actual Supabase credentials
    url: "https://fifqqnflxwfgnidawxzw.supabase.co",
    anonKey: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZpZnFxbmZseHdmZ25pZGF3eHp3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTg5MzUyNDUsImV4cCI6MjA3NDUxMTI0NX0.-49wxfcA9xwEbTHzuSL3RFGS9QCLaH9Dyb8lw_zSDk0"
  },
  stripe: {
    publishableKey: "pk_test_your_stripe_publishable_key_here"
  },
  features: {
    aiGeneration: true,
    userAuth: true,
    payments: true
  }
};

// Log successful config load
console.log('✅ FlexiCAD configuration loaded');

// Validate configuration
if (!window.flexicadConfig.supabase.url || !window.flexicadConfig.supabase.anonKey) {
    console.error('❌ Supabase configuration is missing');
}

if (window.flexicadConfig.features.payments && !window.flexicadConfig.stripe.publishableKey) {
    console.warn('⚠️ Stripe configuration is missing but payments are enabled');
}