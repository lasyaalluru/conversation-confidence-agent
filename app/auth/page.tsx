"use client";

import { useState } from "react";
import { Logo } from "@/components/layout/Logo";
import { Button, ButtonLink } from "@/components/ui/Button";
import { getSupabaseBrowser, isSupabaseConfigured } from "@/lib/database/supabase-client";

// Email magic-link sign-in (Supabase Auth). Optional — guests can use everything.
export default function AuthPage() {
  const [email, setEmail] = useState("");
  const [state, setState] = useState<"idle" | "sending" | "sent" | "error">("idle");
  const [message, setMessage] = useState("");

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    const supabase = getSupabaseBrowser();
    if (!supabase) return;
    setState("sending");
    const { error } = await supabase.auth.signInWithOtp({
      email: email.trim(),
      options: { emailRedirectTo: `${window.location.origin}/auth/callback` },
    });
    if (error) {
      setState("error");
      setMessage(error.message);
    } else setState("sent");
  }

  return (
    <div className="flex min-h-svh flex-col bg-ivory">
      <header className="mx-auto flex h-20 w-full max-w-md items-center px-4">
        <Logo />
      </header>
      <main id="main" className="mx-auto flex w-full max-w-md flex-1 flex-col gap-6 px-4 pt-10">
        <h1 className="font-display text-5xl leading-[1.02]">Save your progress everywhere.</h1>
        {!isSupabaseConfigured() ? (
          <>
            <p className="text-slate">Accounts aren&apos;t enabled on this deployment yet. Your progress is saved in this browser.</p>
            <ButtonLink href="/dashboard" className="self-start">
              Back to dashboard
            </ButtonLink>
          </>
        ) : state === "sent" ? (
          <p className="rounded-2xl bg-sage-soft p-5 text-sage-ink" role="status">
            Check your inbox — we sent a sign-in link to <strong>{email}</strong>.
          </p>
        ) : (
          <form onSubmit={submit} className="flex flex-col gap-3">
            <p className="text-slate">We&apos;ll email you a one-time sign-in link. No password needed.</p>
            <label htmlFor="email" className="text-sm font-medium">
              Email
            </label>
            <input
              id="email"
              type="email"
              required
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="h-12 rounded-2xl border border-line-strong bg-paper px-4 focus:border-ink focus:outline-none"
            />
            <Button type="submit" size="lg" disabled={state === "sending"}>
              {state === "sending" ? "Sending…" : "Email me a sign-in link"}
            </Button>
            {state === "error" && (
              <p className="text-sm text-danger" role="alert">
                {message}
              </p>
            )}
          </form>
        )}
      </main>
    </div>
  );
}
