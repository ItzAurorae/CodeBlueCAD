import { createClient, type SupabaseClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://jntdvjkigwoqvkcydxcp.supabase.co';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImpudGR2amtpZ3dvcXZrY3lkeGNwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODc0MjI3NjAsImV4cCI6MjEwMjk5ODc2MH0.2J6zHILQIUOpuGLDMToDi_Lpq6i9heIwq0afIKvypDQ';

export const supabase: SupabaseClient = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: false,
    autoRefreshToken: true,
    detectSessionInUrl: false,
  },
});
