"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import { useProgress } from "@/components/providers/ProgressProvider";
import { ButtonLink, Button } from "@/components/ui/Button";
import { ConfidenceScale } from "@/components/ui/ConfidenceScale";
import { Card, DemoBadge, Eyebrow, Spinner } from "@/components/ui/primitives";
import type { ApiError, FeedbackResponse } from "@/lib/ai/contract";
import { formatDuration, sessionDurationSeconds } from "@/lib/analytics/metrics";
import { getComfortLevel, getPlayableScenario, type ComfortLevel } from "@/lib/scenarios/catalog";
import type { PilotReflection, PracticeSession } from "@/types/domain";
import { MissionCard } from "./MissionCard";
import { SavePhraseButton } from "./SavePhraseButton";

export function FeedbackView({ sessionId }: { sessionId: string }) {
  const { ready, sessions } = useProgress();
  const session = sessions.find((s) => s.id === sessionId);

  if (!ready) return <FeedbackSkeleton label="Loading your session…" />;
  if (!session) {
    return (
      <Card className="mx-auto max-w-xl p-8 text-center">
        <h1 className="font-display text-3xl">We couldn&apos;t find this session</h1>
        <p className="mt-2 text-slate">
          It may have been deleted, or saved on a different device or browser (guest progress stays on the device where you practiced).
        </p>
        <ButtonLink href="/dashboard" className="mt-6">
          Go to dashboard
        </ButtonLink>
      </Card>
    );
  }
  return <FeedbackContent session={session} />;
}

function FeedbackSkeleton({ label }: { label: string }) {
  return (
    <div className="flex flex-col items-center gap-4 py-24 text-slate" role="status">
      <Spinner className="h-6 w-6 text-lavender-ink" />
      <p>{label}</p>
    </div>
  );
}

function FeedbackContent({ session }: { session: PracticeSession }) {
  const { saveSession, missions, profile } = useProgress();
  const scenario = getPlayableScenario(session.scenarioId);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(!session.feedback);
  const requested = useRef(false);
  const mission = missions.find((m) => m.sessionId === session.id);
  const level = session.comfortLevel as ComfortLevel;

  const generate = useCallback(async () => {
    setError(null);
    setLoading(true);
    try {
      const res = await fetch("/api/feedback", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          scenarioId: session.scenarioId,
          comfortLevel: session.comfortLevel,
          history: session.turns.map((t) => ({ speaker: t.speaker, text: t.text })),
        }),
      });
      if (!res.ok) {
        const body = (await res.json().catch(() => null)) as ApiError | null;
        throw new Error(body?.error.message ?? "Couldn't generate feedback.");
      }
      const feedback = (await res.json()) as FeedbackResponse;
      await saveSession({ ...session, feedback });
    } catch (e) {
      setError(e instanceof Error ? e.message : "Couldn't generate feedback.");
    } finally {
      setLoading(false);
    }
  }, [session, saveSession]);

  useEffect(() => {
    if (session.feedback || requested.current || !session.turns.length) return;
    requested.current = true;
    void generate();
  }, [session.feedback, session.turns.length, generate]);

  if (!scenario) return null;
  const fb = session.feedback;
  const duration = formatDuration(sessionDurationSeconds(session));

  return (
    <div className="flex flex-col gap-12">
      <header className="flex flex-col gap-4">
        <Eyebrow>
          {scenario.title} · Level {level} — {getComfortLevel(level).name}
        </Eyebrow>
        <h1 className="font-display text-[clamp(2.6rem,6vw,4.5rem)] leading-[1]">
          Every conversation <em className="text-lavender-ink">is progress.</em>
        </h1>
        <dl className="flex flex-wrap gap-x-8 gap-y-2 text-sm text-slate">
          <div className="flex gap-2">
            <dt>Duration</dt>
            <dd className="font-medium text-ink">{duration}</dd>
          </div>
          <div className="flex gap-2">
            <dt>Your turns</dt>
            <dd className="font-medium text-ink">{session.userTurnCount}</dd>
          </div>
          <div className="flex gap-2">
            <dt>Status</dt>
            <dd className="font-medium text-ink">{session.status === "completed" ? "Completed" : "Ended early"}</dd>
          </div>
        </dl>
        {fb?.mode === "demo" && <DemoBadge className="self-start" label="Demo Mode · rule-based sample feedback, not AI coaching" />}
      </header>

      {loading && <FeedbackSkeleton label="Reading your conversation…" />}
      {error && (
        <Card className="flex flex-wrap items-center justify-between gap-4 border-danger/20 bg-danger-soft p-5" role="alert">
          <p className="text-danger">{error} Your conversation is saved — nothing is lost.</p>
          <Button variant="secondary" onClick={() => void generate()}>
            Try again
          </Button>
        </Card>
      )}
      {!fb && !loading && !error && !session.turns.length && (
        <Card className="p-6 text-slate">There&apos;s no transcript for this session, so feedback can&apos;t be generated.</Card>
      )}

      {fb && (
        <>
          <p className="max-w-3xl font-display text-[clamp(1.5rem,3vw,2.1rem)] leading-snug text-ink">{fb.summary}</p>

          <section aria-labelledby="well" className="flex flex-col gap-4">
            <h2 id="well" className="font-display text-3xl">What went well</h2>
            <div className="grid gap-4 md:grid-cols-2">
              {fb.wentWell.map((w, i) => (
                <Card key={i} className="flex flex-col gap-2 p-6">
                  <div className="flex items-center gap-2">
                    <span aria-hidden className="flex h-6 w-6 items-center justify-center rounded-full bg-sage-soft text-sage-ink">
                      <svg viewBox="0 0 16 16" className="h-3.5 w-3.5">
                        <path d="m3.5 8.5 3 3 6-7" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
                      </svg>
                    </span>
                    <h3 className="font-medium">{w.title}</h3>
                  </div>
                  <p className="leading-relaxed text-slate">{w.detail}</p>
                  {w.quote && <p className="mt-1 border-l-2 border-sage pl-3 text-sm italic text-ink/80">&ldquo;{w.quote}&rdquo;</p>}
                </Card>
              ))}
            </div>
          </section>

          {fb.improve.length > 0 && (
            <section aria-labelledby="improve" className="flex flex-col gap-4">
              <h2 id="improve" className="font-display text-3xl">What you can try next time</h2>
              <div className="grid gap-4 md:grid-cols-3">
                {fb.improve.map((m, i) => (
                  <Card key={i} className="flex flex-col gap-2 p-6">
                    <h3 className="font-medium">{m.title}</h3>
                    <p className="text-sm leading-relaxed text-slate">{m.detail}</p>
                    {m.tryThis && (
                      <div className="mt-auto flex flex-wrap items-center justify-between gap-2 rounded-2xl bg-lavender-soft px-4 py-3">
                        <span className="text-[15px] text-lavender-ink">&ldquo;{m.tryThis}&rdquo;</span>
                        <SavePhraseButton phrase={m.tryThis} context={m.title} scenarioId={scenario.id} />
                      </div>
                    )}
                  </Card>
                ))}
              </div>
            </section>
          )}

          {fb.alternatives.length > 0 && (
            <section aria-labelledby="alts" className="flex flex-col gap-4">
              <div>
                <h2 id="alts" className="font-display text-3xl">Natural alternatives</h2>
                <p className="text-slate">Options, not rules — keep what sounds like you.</p>
              </div>
              <Card className="divide-y divide-line">
                {fb.alternatives.map((a, i) => (
                  <div key={i} className="flex flex-col gap-2 p-6 sm:flex-row sm:items-start sm:justify-between sm:gap-6">
                    <div className="flex flex-col gap-1.5">
                      <p className="text-xs uppercase tracking-[0.16em] text-slate">{a.context}</p>
                      {a.youSaid && <p className="text-sm text-slate">You said: &ldquo;{a.youSaid}&rdquo;</p>}
                      <p className="font-display text-2xl leading-snug">&ldquo;{a.alternative}&rdquo;</p>
                      <p className="text-sm leading-relaxed text-slate">{a.why}</p>
                    </div>
                    <SavePhraseButton phrase={a.alternative} context={a.context} scenarioId={scenario.id} />
                  </div>
                ))}
              </Card>
            </section>
          )}

          <section aria-labelledby="reflection" className="rounded-3xl bg-midnight p-8 text-ivory sm:p-10">
            <p className="text-xs uppercase tracking-[0.2em] text-champagne/80">Conversation reflection</p>
            <h2 id="reflection" className="mt-3 font-display text-3xl leading-snug">{fb.reflection.title}</h2>
            <p className="mt-3 max-w-2xl leading-relaxed text-ivory/75">{fb.reflection.body}</p>
          </section>
        </>
      )}

      <ConfidenceAfter session={session} />

      {mission && <MissionCard mission={mission} />}

      <section aria-labelledby="again" className="flex flex-col gap-4">
        <h2 id="again" className="font-display text-3xl">Try it again</h2>
        <p className="text-slate">Repetition is how new phrases become automatic. Same level, or change it up.</p>
        <div className="flex flex-wrap gap-2">
          <ButtonLink href={`/practice/${scenario.id}?level=${level}`}>Practice again · Level {level}</ButtonLink>
          {([1, 2, 3] as const)
            .filter((l) => l !== level)
            .map((l) => (
              <ButtonLink key={l} variant="secondary" href={`/practice/${scenario.id}?level=${l}`}>
                Level {l} · {getComfortLevel(l).name}
              </ButtonLink>
            ))}
        </div>
      </section>

      {session.turns.length > 0 && (
        <details className="group rounded-3xl border border-line bg-paper p-6">
          <summary className="cursor-pointer list-none font-medium">
            <span className="group-open:hidden">View transcript</span>
            <span className="hidden group-open:inline">Hide transcript</span>
          </summary>
          <ol className="mt-4 flex flex-col gap-2 text-[15px]">
            {session.turns.map((t) => (
              <li key={t.sequence} className="flex gap-3">
                <span className="w-16 shrink-0 text-sm text-slate">{t.speaker === "ai" ? scenario.character.name : "You"}</span>
                <span>{t.text}</span>
              </li>
            ))}
          </ol>
          <p className="mt-4 text-xs text-slate">
            Voice turns were transcribed automatically and may contain recognition errors.
            {profile?.consent.storeTranscripts === false ? " This transcript will be removed once feedback is saved." : ""}
          </p>
        </details>
      )}

      {profile?.consent.pilotReflections !== false && <PilotReflectionForm session={session} />}

      <div className="flex justify-between border-t border-line pt-6 text-sm">
        <Link href="/dashboard" className="text-slate hover:text-ink">
          ← Back to dashboard
        </Link>
        <Link href="/progress" className="text-slate hover:text-ink">
          See your progress →
        </Link>
      </div>
    </div>
  );
}

function ConfidenceAfter({ session }: { session: PracticeSession }) {
  const { saveSession } = useProgress();
  const [value, setValue] = useState<number | null>(session.confidenceAfter);
  const before = session.confidenceBefore;

  return (
    <Card className="grid gap-8 p-6 sm:p-8 md:grid-cols-[1fr_auto]">
      <ConfidenceScale
        legend="How confident do you feel now?"
        description="Your own rating — compared with how you felt before you started."
        value={value}
        onChange={(n) => {
          setValue(n);
          void saveSession({ ...session, confidenceAfter: n }).catch(() => {});
        }}
      />
      {before !== null && value !== null && (
        <div className="flex items-center gap-6 self-center rounded-2xl bg-ivory px-6 py-5" aria-live="polite">
          <div className="text-center">
            <p className="text-xs text-slate">Before</p>
            <p className="font-display text-5xl">{before}</p>
          </div>
          <span aria-hidden className="text-2xl text-slate">→</span>
          <div className="text-center">
            <p className="text-xs text-slate">After</p>
            <p className="font-display text-5xl text-lavender-ink">{value}</p>
          </div>
          <p className="max-w-[9rem] text-sm text-slate">
            {value > before ? "You feel more confident than when you started." : value === before ? "Steady — and you showed up." : "Harder than expected? That's normal. Try it once more."}
          </p>
        </div>
      )}
    </Card>
  );
}

function PilotReflectionForm({ session }: { session: PracticeSession }) {
  const { saveSession } = useProgress();
  const [r, setR] = useState<PilotReflection>(session.reflection ?? { feedbackClear: null, wantAnother: null, vsGenericChat: "" });
  const [saved, setSaved] = useState(Boolean(session.reflection));

  const choice = <K extends "feedbackClear" | "wantAnother">(key: K, options: [NonNullable<PilotReflection[K]>, string][], legend: string) => (
    <fieldset className="flex flex-col gap-2">
      <legend className="text-sm font-medium">{legend}</legend>
      <div className="flex flex-wrap gap-2">
        {options.map(([v, label]) => (
          <label key={v} className="cursor-pointer">
            <input type="radio" className="peer sr-only" name={`${session.id}-${key}`} checked={r[key] === v} onChange={() => { setR({ ...r, [key]: v }); setSaved(false); }} />
            <span className="inline-flex rounded-full border border-line-strong px-3.5 py-1.5 text-sm peer-checked:border-ink peer-checked:bg-ink peer-checked:text-ivory peer-focus-visible:outline-2 peer-focus-visible:outline-lavender-ink">
              {label}
            </span>
          </label>
        ))}
      </div>
    </fieldset>
  );

  return (
    <details className="rounded-3xl border border-dashed border-line-strong p-6">
      <summary className="cursor-pointer font-medium">Help us improve (optional, 30 seconds)</summary>
      <form
        className="mt-5 flex flex-col gap-5"
        onSubmit={(e) => {
          e.preventDefault();
          void saveSession({ ...session, reflection: r }).then(() => setSaved(true)).catch(() => {});
        }}
      >
        <p className="text-sm text-slate">
          Saved with your progress only. Nothing is sent anywhere unless you choose to export it from Settings.
        </p>
        {choice("feedbackClear", [["yes", "Yes"], ["somewhat", "Somewhat"], ["no", "No"]], "Was the feedback clear?")}
        {choice("wantAnother", [["yes", "Yes"], ["maybe", "Maybe"], ["no", "No"]], "Would you like to try another scenario?")}
        <label className="flex flex-col gap-2 text-sm font-medium">
          How was this different from chatting with a general AI assistant?
          <textarea
            value={r.vsGenericChat}
            onChange={(e) => { setR({ ...r, vsGenericChat: e.target.value }); setSaved(false); }}
            maxLength={600}
            rows={3}
            className="rounded-2xl border border-line bg-paper px-4 py-3 font-normal focus:border-ink focus:outline-none"
          />
        </label>
        <div className="flex items-center gap-3">
          <Button type="submit" variant="secondary" size="sm">
            Save reflection
          </Button>
          {saved && <span className="text-sm text-sage-ink" role="status">Saved — thank you!</span>}
        </div>
      </form>
    </details>
  );
}
