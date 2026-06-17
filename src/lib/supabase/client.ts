import { createBrowserClient } from '@supabase/ssr'

/** Browser Supabase client (anon/publishable key). Used for the admin login flow. */
export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  )
}
