"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { AnimatePresence, MotionConfig, motion } from "motion/react";
import { useProgress } from "@/components/providers/ProgressProvider";
import { Logo } from "@/components/layout/Logo";
import { Button } from "@/components/ui/Button";
import { ConfidenceScale } from "@/components/ui/ConfidenceScale";
import { DEFAULT_CONSENT, nowIso } from "@/lib/database/store";
import { COMFORT_LEVELS, GOALS, getComfortLevel, type ComfortLevel, type GoalId } from "@/lib/scenarios/catalog";
import { recommendFirstScenario } from "@/lib/recommendations/rules";

const STEPS = ["Welcome", "Comfort", "Goals", "Confidence", "Begin"] as const;

/** Wait until saved data is loaded so returning users see their previous answers. */
export function Onboarding() {
  const { ready } = useProgress();
  if (!ready) return <div className="min-h-svh bg-ivory" />;
  return <OnboardingFlow />;
}

function OnboardingFlow() {
  const router = useRouter();
  const { profile, saveProfile, storeKind } = useProgress();
  const [step, setStep] = useState(0);
  const [level, setLevel] = useState<ComfortLevel | null>(profile?.comfortLevel ?? null);
  const [goals, setGoals] = useState<GoalId[]>(profile?.goals ?? []);
  const [confidence, setConfidence] = useState<number | null>(profile?.baselineConfidence ?? null);
  const [saving, setSaving] = useState(false);

  const canContinue = [true, level !== null, goals.length > 0, confidence !== null, true][step];
  const first = level ? recommendFirstScenario(level, goals) : null;

  async function finish(destination: string) {
    if (!level) return;
    setSaving(true);
    await saveProfile({
      comfortLevel: level,
      goals,
      baselineConfidence: confidence,
      onboardedAt: profile?.onboardedAt ?? nowIso(),
      consent: profile?.consent ?? { ...DEFAULT_CONSENT },
      createdAt: profile?.createdAt ?? nowIso(),
    }).catch(() => {});
    router.push(destination);
  }

  function toggleGoal(id: GoalId) {
    setGoals((g) => (g.includes(id) ? g.filter((x) => x !== id) : [...g, id]));
  }

  return (
    <MotionConfig reducedMotion="user">
      <div className="flex min-h-svh flex-col bg-ivory">
        <header className="mx-auto flex h-20 w-full max-w-3xl items-center justify-between px-4 sm:px-6">
          <Logo />
          <span className="text-sm text-slate">About 1 minute</span>
        </header>

        <div className="mx-auto w-full max-w-3xl px-4 sm:px-6">
          <ol className="flex gap-1.5" aria-label={`Step ${step + 1} of ${STEPS.length}`}>
            {STEPS.map((s, i) => (
              <li key={s} className="flex-1">
                <span className="sr-only">
                  {s}
                  {i === step ? " (current)" : i < step ? " (done)" : ""}
                </span>
                <span
                  aria-hidden
                  className={`block h-1 rounded-full transition-colors duration-500 ${i <= step ? "bg-ink" : "bg-line-strong"}`}
                />
              </li>
            ))}
          </ol>
        </div>

        <main id="main" className="mx-auto flex w-full max-w-3xl flex-1 flex-col px-4 pb-10 pt-12 sm:px-6 sm:pt-16">
          <AnimatePresence mode="wait">
            <motion.section
              key={step}
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
              className="flex flex-1 flex-col"
              aria-live="polite"
            >
              {step === 0 && (
                <div className="flex flex-col gap-6">
                  <h1 className="font-display text-[clamp(2.6rem,6vw,4.25rem)] leading-[1.02]">
                    Every confident conversation <em className="text-lavender-ink">starts somewhere.</em>
                  </h1>
                  <p className="max-w-xl text-lg leading-relaxed text-slate">
                    We won&apos;t test your English. Instead, tell us how comfortable speaking feels right now — your AI partner
                    will adapt its pace, its questions and how much it helps. You can change this any time.
                  </p>
                  <ul className="mt-2 grid gap-3 text-sm text-slate sm:grid-cols-3">
                    {["No account needed", "Your accent is welcome", "Voice is never stored"].map((t) => (
                      <li key={t} className="flex items-center gap-2 rounded-2xl border border-line bg-paper px-4 py-3">
                        <span aria-hidden className="h-1.5 w-1.5 rounded-full bg-sage-ink" />
                        {t}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {step === 1 && (
                <fieldset className="flex flex-col gap-6">
                  <legend className="font-display text-[clamp(2rem,4.5vw,3rem)] leading-[1.08]">
                    How comfortable do you feel speaking English in everyday conversations?
                  </legend>
                  <p className="mt-4 text-slate">This is about comfort, not grammar or test scores.</p>
                  <div className="grid gap-3">
                    {COMFORT_LEVELS.map((c) => (
                      <label key={c.level} className="group cursor-pointer">
                        <input
                          type="radio"
                          name="comfort"
                          className="peer sr-only"
                          checked={level === c.level}
                          onChange={() => setLevel(c.level)}
                        />
                        <span className="flex gap-5 rounded-3xl border border-line bg-paper p-5 shadow-soft transition-all peer-checked:border-ink peer-checked:shadow-lift peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-lavender-ink group-hover:border-ink/40 sm:p-6">
                          <span className="font-display text-4xl leading-none text-lavender-ink">{c.level}</span>
                          <span className="flex flex-col gap-1">
                            <span className="font-medium">{c.name}</span>
                            <span className="text-sm leading-relaxed text-slate">&ldquo;{c.selfDescription}&rdquo;</span>
                          </span>
                        </span>
                      </label>
                    ))}
                  </div>
                </fieldset>
              )}

              {step === 2 && (
                <fieldset className="flex flex-col gap-6">
                  <legend className="font-display text-[clamp(2rem,4.5vw,3rem)] leading-[1.08]">
                    Where do you want to feel more confident?
                  </legend>
                  <p className="mt-4 text-slate">Choose as many as you like.</p>
                  <div className="flex flex-wrap gap-2.5">
                    {GOALS.map((g) => {
                      const on = goals.includes(g.id);
                      return (
                        <label key={g.id} className="cursor-pointer">
                          <input type="checkbox" className="peer sr-only" checked={on} onChange={() => toggleGoal(g.id)} />
                          <span className="inline-flex items-center gap-2 rounded-full border border-line-strong bg-paper px-4 py-2.5 text-[15px] transition-all peer-checked:border-ink peer-checked:bg-ink peer-checked:text-ivory peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-lavender-ink hover:border-ink/50">
                            {on && (
                              <svg viewBox="0 0 16 16" className="h-3.5 w-3.5" aria-hidden>
                                <path d="m3.5 8.5 3 3 6-7" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
                              </svg>
                            )}
                            {g.label}
                          </span>
                        </label>
                      );
                    })}
                  </div>
                </fieldset>
              )}

              {step === 3 && (
                <div className="flex flex-col gap-6">
                  <h1 className="font-display text-[clamp(2rem,4.5vw,3rem)] leading-[1.08]">
                    Right now, how confident do you feel speaking English?
                  </h1>
                  <ConfidenceScale
                    legend="Your starting point"
                    description="Just how it feels today — this is your personal baseline, not a measurement of your ability."
                    value={confidence}
                    onChange={setConfidence}
                  />
                </div>
              )}

              {step === 4 && level && first && (
                <div className="flex flex-col gap-6">
                  <h1 className="font-display text-[clamp(2.4rem,5.5vw,3.75rem)] leading-[1.04]">
                    Welcome. Let&apos;s find <em className="text-lavender-ink">your voice.</em>
                  </h1>
                  <p className="max-w-xl text-lg leading-relaxed text-slate">
                    You&apos;re starting at <strong className="font-medium text-ink">Level {level} — {getComfortLevel(level).name}</strong>.{" "}
                    {first.reason}
                  </p>
                  <div className="rounded-3xl border border-line bg-paper p-6 shadow-soft">
                    <p className="text-xs uppercase tracking-[0.18em] text-slate">Your first conversation</p>
                    <p className="mt-2 font-display text-3xl">{first.scenario.title}</p>
                    <p className="mt-1 text-slate">{first.scenario.summary}</p>
                    <ul className="mt-4 flex flex-wrap gap-2 text-sm text-slate">
                      {getComfortLevel(level).whatToExpect.map((w) => (
                        <li key={w} className="rounded-full bg-ink/5 px-3 py-1">
                          {w}
                        </li>
                      ))}
                    </ul>
                  </div>
                  <p className="text-sm text-slate">
                    {storeKind === "supabase"
                      ? "Your progress is saved to your account."
                      : "Your choices and progress are saved in this browser only. You can create an account later to sync."}
                  </p>
                </div>
              )}
            </motion.section>
          </AnimatePresence>

          <div className="mt-12 flex flex-wrap items-center justify-between gap-3 border-t border-line pt-6">
            {step > 0 ? (
              <Button variant="ghost" onClick={() => setStep((s) => s - 1)}>
                ← Back
              </Button>
            ) : (
              <Link href="/" className="text-sm text-slate hover:text-ink">
                Back to home
              </Link>
            )}
            {step < STEPS.length - 1 ? (
              <Button size="lg" onClick={() => setStep((s) => s + 1)} disabled={!canContinue}>
                Continue
              </Button>
            ) : (
              <div className="flex flex-wrap gap-2">
                <Button variant="secondary" size="lg" disabled={saving} onClick={() => finish("/dashboard")}>
                  Go to my dashboard
                </Button>
                <Button
                  size="lg"
                  disabled={saving}
                  onClick={() => first && finish(`/practice/${first.scenario.id}?level=${first.level}`)}
                >
                  Start my first conversation
                </Button>
              </div>
            )}
          </div>
        </main>
      </div>
    </MotionConfig>
  );
}
