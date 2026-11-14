"use client";

import { createBrowserClient } from "@supabase/ssr";
import type { SupabaseClient } from "@supabase/supabase-js";

/**
 * Browser Supabase client (publishable key only — safe in the browser).
 * All data access is protected by Row Level Security (supabase/migrations).
 * Returns null when Supabase isn't configured, so guest mode keeps working.
 */
let client: SupabaseClient | null | undefined;

export function isSupabaseConfigured(): boolean {
  return Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY);
}

export function getSupabaseBrowser(): SupabaseClient | null {
  if (client !== undefined) return client;
  client = isSupabaseConfigured()
    ? createBrowserClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!)
    : null;
  return client;
}
