"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { getSupabaseBrowser } from "@/lib/database/supabase-client";

// Magic-link landing page: exchange the one-time ?code for a session (PKCE), then go to settings.
export default function AuthCallbackPage() {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const supabase = getSupabaseBrowser();
    const code = new URLSearchParams(window.location.search).get("code");
    if (!supabase || !code) {
      router.replace("/auth");
      return;
    }
    supabase.auth.exchangeCodeForSession(code).then(({ error }) => {
      if (error) setError(error.message);
      else router.replace("/settings");
    });
  }, [router]);

  return (
    <main id="main" className="flex min-h-svh items-center justify-center bg-ivory p-6 text-center">
      {error ? (
        <p role="alert" className="text-danger">
          Sign-in link didn&apos;t work: {error}. <a href="/auth" className="underline">Try again</a>
        </p>
      ) : (
        <p role="status" className="text-slate">Signing you in…</p>
      )}
    </main>
  );
}
