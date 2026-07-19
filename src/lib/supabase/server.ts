import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { isSupabaseConfigured } from './client';

/** Server Supabase client — returns null when env vars are not set yet */
export function getSupabaseServerClient(): SupabaseClient | null {
  if (!isSupabaseConfigured()) return null;
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
      },
    }
  );
}
