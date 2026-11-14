// Supabase client — NOT USED YET. Progress is currently stored in localStorage (see lib/progress.ts).
//
// TODO (Member 3):
//   1. Create a Supabase project and run supabase/schema.sql in the SQL editor.
//   2. Put NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY in .env.local.
//   3. For auth with the App Router, follow Supabase's Next.js guide (it uses @supabase/ssr).
//   4. Swap the localStorage functions in lib/progress.ts for Supabase queries.

import { createClient, type SupabaseClient } from "@supabase/supabase-js";

let client: SupabaseClient | null | undefined;

/** Returns a browser-safe Supabase client, or null if env vars aren't configured. */
export function getSupabase(): SupabaseClient | null {
  if (client !== undefined) return client;
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  client = url && key ? createClient(url, key) : null;
  return client;
}
