"use client";

import Link from "next/link";
import { useState } from "react";
import { useProgress } from "@/components/providers/ProgressProvider";
import { Button, ButtonLink } from "@/components/ui/Button";
import { Card, Eyebrow, Spinner } from "@/components/ui/primitives";
import { DEFAULT_CONSENT, nowIso } from "@/lib/database/store";
import { COMFORT_LEVELS, GOALS, type GoalId } from "@/lib/scenarios/catalog";
import type { ConsentPreferences, Profile } from "@/types/domain";

function Toggle({ id, checked, onChange, label, description }: { id: string; checked: boolean; onChange: (v: boolean) => void; label: string; description: string }) {
  return (
    <div className="flex items-start justify-between gap-6 py-4">
      <div>
        <label htmlFor={id} className="font-medium">
          {label}
        </label>
        <p className="mt-1 text-sm leading-relaxed text-slate">{description}</p>
      </div>
      <button
        id={id}
        type="button"
        role="switch"
        aria-checked={checked}
        onClick={() => onChange(!checked)}
        className={`relative mt-1 h-7 w-12 shrink-0 rounded-full transition-colors ${checked ? "bg-ink" : "bg-line-strong"}`}
      >
        <span className={`absolute top-1 h-5 w-5 rounded-full bg-paper shadow transition-all ${checked ? "left-6" : "left-1"}`} />
      </button>
    </div>
  );
}

export function SettingsView() {
  const p = useProgress();
  const [confirming, setConfirming] = useState(false);
  const [importMsg, setImportMsg] = useState<string | null>(null);

  if (!p.ready) return <Spinner className="h-6 w-6 text-slate" />;

  const profile: Profile = p.profile ?? {
    comfortLevel: 1,
    goals: [],
    baselineConfidence: null,
    onboardedAt: null,
    consent: { ...DEFAULT_CONSENT },
    createdAt: nowIso(),
  };
  const save = (patch: Partial<Profile>) => void p.saveProfile({ ...profile, ...patch }).catch(() => {});
  const setConsent = (patch: Partial<ConsentPreferences>) => save({ consent: { ...profile.consent, ...patch } });
  const toggleGoal = (g: GoalId) => save({ goals: profile.goals.includes(g) ? profile.goals.filter((x) => x !== g) : [...profile.goals, g] });

  function exportData() {
    const blob = new Blob(
      [JSON.stringify({ exportedAt: nowIso(), app: "ConvoConfidence AI", profile: p.profile, sessions: p.sessions, missions: p.missions, phrases: p.phrases }, null, 2)],
      { type: "application/json" },
    );
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `convoconfidence-data-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }

  return (
    <div className="flex flex-col gap-10">
      <header className="flex flex-col gap-3">
        <Eyebrow>Settings</Eyebrow>
        <h1 className="font-display text-[clamp(2.6rem,5.5vw,4rem)] leading-[1.02]">Make it yours.</h1>
      </header>

      {p.error && (
        <Card className="border-danger/20 bg-danger-soft p-4 text-sm text-danger" role="alert">
          {p.error}
        </Card>
      )}

      <Card className="flex flex-col gap-4 p-6 sm:p-8">
        <h2 className="font-display text-3xl">Comfort level</h2>
        <p className="text-slate">Used as your default. You can still pick any level before each conversation.</p>
        <div className="grid gap-3 md:grid-cols-3" role="radiogroup" aria-label="Comfort level">
          {COMFORT_LEVELS.map((c) => (
            <button
              key={c.level}
              type="button"
              role="radio"
              aria-checked={profile.comfortLevel === c.level}
              onClick={() => save({ comfortLevel: c.level })}
              className={`flex flex-col gap-1 rounded-2xl border p-4 text-left transition-all ${
                profile.comfortLevel === c.level ? "border-ink bg-ink text-ivory" : "border-line hover:border-ink/40"
              }`}
            >
              <span className="font-display text-3xl">{c.level}</span>
              <span className="font-medium">{c.name}</span>
            </button>
          ))}
        </div>
      </Card>

      <Card className="flex flex-col gap-4 p-6 sm:p-8">
        <h2 className="font-display text-3xl">Communication goals</h2>
        <div className="flex flex-wrap gap-2">
          {GOALS.map((g) => {
            const on = profile.goals.includes(g.id);
            return (
              <button
                key={g.id}
                type="button"
                aria-pressed={on}
                onClick={() => toggleGoal(g.id)}
                className={`rounded-full border px-4 py-2 text-sm transition-colors ${on ? "border-ink bg-ink text-ivory" : "border-line-strong hover:border-ink"}`}
              >
                {g.label}
              </button>
            );
          })}
        </div>
      </Card>

      <Card className="flex flex-col p-6 sm:p-8">
        <h2 className="font-display text-3xl">Privacy &amp; consent</h2>
        <div className="mt-4 rounded-2xl bg-ivory p-5 text-sm leading-relaxed text-slate">
          <p className="font-medium text-ink">What we store</p>
          <ul className="mt-2 list-disc space-y-1 pl-5">
            <li>
              <strong className="font-medium text-ink">Never stored:</strong> your voice recordings. Speech is turned into text either by your
              browser&apos;s built-in speech service (Google in Chrome, Apple in Safari) or by our speech-to-text provider, then discarded.
            </li>
            <li>
              <strong className="font-medium text-ink">Stored {p.storeKind === "supabase" ? "in your account" : "in this browser only"}:</strong> your
              comfort level and goals, confidence ratings, session times and turn counts, feedback, missions, saved phrases — and transcripts if
              allowed below.
            </li>
            <li>Conversation text is sent to the AI provider to generate replies and feedback.</li>
          </ul>
        </div>
        <div className="mt-2 divide-y divide-line">
          <Toggle
            id="store-transcripts"
            checked={profile.consent.storeTranscripts}
            onChange={(v) => setConsent({ storeTranscripts: v })}
            label="Keep conversation transcripts"
            description="Lets you re-read past conversations. When off, a transcript is deleted as soon as its feedback is saved."
          />
          <Toggle
            id="pilot-reflections"
            checked={profile.consent.pilotReflections}
            onChange={(v) => setConsent({ pilotReflections: v })}
            label="Ask me for optional reflections"
            description="A short, optional survey after feedback to help us improve. Never shared unless you export and send it."
          />
        </div>
      </Card>

      <Card className="flex flex-col gap-4 p-6 sm:p-8">
        <h2 className="font-display text-3xl">Account</h2>
        {!p.supabaseConfigured ? (
          <p className="text-slate">
            Accounts aren&apos;t enabled on this deployment yet. You&apos;re practicing as a guest — progress is saved in this browser.
          </p>
        ) : p.accountEmail ? (
          <>
            <p className="text-slate">
              Signed in as <span className="font-medium text-ink">{p.accountEmail}</span>. Your progress syncs across devices.
            </p>
            <div className="flex flex-wrap gap-2">
              <Button
                variant="secondary"
                onClick={async () => {
                  const n = await p.importLocalIntoAccount().catch(() => -1);
                  setImportMsg(n < 0 ? "Couldn't copy guest progress." : `Copied ${n} guest session${n === 1 ? "" : "s"} from this browser.`);
                }}
              >
                Copy this browser&apos;s guest progress to my account
              </Button>
              <Button variant="ghost" onClick={() => void p.signOut()}>
                Sign out
              </Button>
            </div>
            {importMsg && <p className="text-sm text-slate" role="status">{importMsg}</p>}
          </>
        ) : (
          <>
            <p className="text-slate">Create a free account with your email to save progress across devices. Optional.</p>
            <ButtonLink href="/auth" className="self-start">
              Sign in with email
            </ButtonLink>
          </>
        )}
      </Card>

      <Card className="flex flex-col gap-4 p-6 sm:p-8">
        <h2 className="font-display text-3xl">Your data</h2>
        <div className="flex flex-wrap gap-2">
          <Button variant="secondary" onClick={exportData}>
            Download my data (JSON)
          </Button>
          {!confirming ? (
            <Button variant="ghost" className="text-danger" onClick={() => setConfirming(true)}>
              Delete all my data…
            </Button>
          ) : (
            <div className="flex flex-wrap items-center gap-2 rounded-2xl bg-danger-soft px-4 py-2" role="alert">
              <span className="text-sm text-danger">Delete everything {p.storeKind === "supabase" ? "in your account" : "in this browser"}? This can&apos;t be undone.</span>
              <Button
                size="sm"
                className="bg-danger text-paper hover:bg-danger/90"
                onClick={async () => {
                  await p.deleteAll().catch(() => {});
                  setConfirming(false);
                }}
              >
                Delete
              </Button>
              <Button size="sm" variant="ghost" onClick={() => setConfirming(false)}>
                Cancel
              </Button>
            </div>
          )}
        </div>
        <p className="text-sm text-slate">
          Taking part in the pilot? Download your data and share the file with the team only if you choose to. <Link href="/onboarding" className="underline">Redo setup</Link>
        </p>
      </Card>
    </div>
  );
}
