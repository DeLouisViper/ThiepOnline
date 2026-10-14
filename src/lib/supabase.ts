import { createClient, type SupabaseClient } from '@supabase/supabase-js';

const url = import.meta.env.VITE_SUPABASE_URL;
const key = import.meta.env.VITE_SUPABASE_ANON_KEY;

// Only the public anon/publishable key is ever used in the browser.
// All protection comes from Row Level Security (see supabase/schema.sql).
export const isSupabaseConfigured = Boolean(url && key && !String(url).includes('YOUR-PROJECT'));

export const supabase: SupabaseClient | null = isSupabaseConfigured
  ? createClient(url as string, key as string, {
      auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: false },
    })
  : null;

export const BUCKET_MEDIA = 'wedding-media';
export const BUCKET_GUEST = 'guest-photos';

export function publicUrl(bucket: string, path: string | null | undefined): string | null {
  if (!supabase || !path) return null;
  return supabase.storage.from(bucket).getPublicUrl(path).data.publicUrl;
}
