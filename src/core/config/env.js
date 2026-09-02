// Safe environment configuration loader with production fallback safety

const DEFAULT_CONFIG = {
  SUPABASE_URL: 'https://uxymzrpnwdtppxutjwum.supabase.co',
  SUPABASE_ANON_KEY:
    'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InV4eW16cnBud2R0cHB4dXRqd3VtIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODgyNjE1NTgsImV4cCI6MjEwMzgzNzU1OH0.WTht3iZiWf0K3OwM14im1BkshHApYKhGL2ASNQaRcv8',
  GOOGLE_MAPS_API_KEY: '',
  APP_ENV: 'development',
};

// In React Native with Babel/Metro, env variables can be loaded or configured
export const ENV = {
  SUPABASE_URL: process.env.SUPABASE_URL || DEFAULT_CONFIG.SUPABASE_URL,
  SUPABASE_ANON_KEY: process.env.SUPABASE_ANON_KEY || DEFAULT_CONFIG.SUPABASE_ANON_KEY,
  GOOGLE_MAPS_API_KEY: process.env.GOOGLE_MAPS_API_KEY || DEFAULT_CONFIG.GOOGLE_MAPS_API_KEY,
  APP_ENV: process.env.APP_ENV || DEFAULT_CONFIG.APP_ENV,
};

export const isSupabaseConfigured = () => {
  return (
    ENV.SUPABASE_URL &&
    !ENV.SUPABASE_URL.includes('your-supabase-project-id') &&
    ENV.SUPABASE_ANON_KEY &&
    !ENV.SUPABASE_ANON_KEY.includes('your-anon-key-here')
  );
};
