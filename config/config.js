window.FlexiCADConfig = {
  environment: "development",
  siteUrl: "http://localhost:3000",
  api: {
    baseUrl: "/.netlify/functions"
  },
  supabase: {
    // Replace with your actual Supabase credentials
    url: "https://fifqqnflxwfgnidawxzw.supabase.co",
    anonKey: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZpZnFxbmZseHdmZ25pZGF3eHp3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTg5MzUyNDUsImV4cCI6MjA3NDUxMTI0NX0.-49wxfcA9xwEbTHzuSL3RFGS9QCLaH9Dyb8lw_zSDk0"
  },
  features: {
    aiGeneration: true,
    userAuth: true,
    payments: false
  }
};