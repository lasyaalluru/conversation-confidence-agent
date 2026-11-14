"use client";

import { Button } from "@/components/ui/Button";
import { ConfidenceScale } from "@/components/ui/ConfidenceScale";
import { DemoBadge } from "@/components/ui/primitives";
import type { AiMode } from "@/lib/ai/contract";
import { COMFORT_LEVELS, getComfortLevel, type ComfortLevel, type PlayableScenario } from "@/lib/scenarios/catalog";

/** Before practice: title, length, comfort level (overridable), one convention, confidence rating. */
export function PreBrief({
  scenario,
  level,
  onLevelChange,
  confidence,
  onConfidence,
  mode,
  onStart,
  recommendedLevel,
}: {
  scenario: PlayableScenario;
  level: ComfortLevel;
  onLevelChange: (l: ComfortLevel) => void;
  confidence: number | null;
  onConfidence: (n: number) => void;
  mode: AiMode | null;
  onStart: () => void;
  recommendedLevel: ComfortLevel;
}) {
  const tip = scenario.conventionTip;
  return (
    <div className="mx-auto grid w-full max-w-5xl gap-6 lg:grid-cols-[1.1fr_1fr]">
      <section className="flex flex-col gap-6 text-ivory">
        <div className="flex flex-wrap items-center gap-2 text-sm text-ivory/60">
          <span>~{scenario.estimatedMinutes} minutes</span>
          <span aria-hidden>·</span>
          <span>You&apos;ll talk with {scenario.character.name}, the {scenario.character.role}</span>
        </div>
        <h1 className="font-display text-[clamp(2.75rem,6vw,4.5rem)] leading-[1]">{scenario.title}</h1>
        <p className="max-w-lg text-lg leading-relaxed text-ivory/70">{scenario.setting}</p>

        <div className="rounded-3xl border border-white/10 bg-white/[0.04] p-6 backdrop-blur">
          <p className="text-xs uppercase tracking-[0.2em] text-champagne/80">Before you start · a useful convention</p>
          <h2 className="mt-3 font-display text-2xl leading-snug">{tip.title}</h2>
          <p className="mt-2 leading-relaxed text-ivory/70">{tip.body}</p>
          <ol className="mt-5 flex flex-wrap items-center gap-2 text-sm">
            {tip.pattern.map((p, i) => (
              <li key={p} className="flex items-center gap-2">
                <span className="rounded-full border border-white/15 px-3 py-1 text-ivory/85">{p}</span>
                {i < tip.pattern.length - 1 && <span aria-hidden className="text-ivory/30">→</span>}
              </li>
            ))}
          </ol>
        </div>

        <div>
          <p className="text-sm font-medium text-ivory/80">What you&apos;ll practice</p>
          <ul className="mt-2 grid gap-1.5 text-sm text-ivory/65 sm:grid-cols-2">
            {scenario.objectives.map((o) => (
              <li key={o.id} className="flex items-center gap-2">
                <span aria-hidden className="h-1 w-1 rounded-full bg-sage" />
                {o.label}
              </li>
            ))}
          </ul>
        </div>
      </section>

      <section className="flex flex-col gap-7 rounded-[2rem] bg-paper p-6 text-ink shadow-lift sm:p-8">
        <fieldset className="flex flex-col gap-3">
          <legend className="text-lg font-medium">Comfort level</legend>
          <div className="grid gap-2">
            {COMFORT_LEVELS.map((c) => (
              <label key={c.level} className="cursor-pointer">
                <input
                  type="radio"
                  name="level"
                  className="peer sr-only"
                  checked={level === c.level}
                  onChange={() => onLevelChange(c.level)}
                />
                <span className="flex items-center justify-between gap-3 rounded-2xl border border-line px-4 py-3 transition-all peer-checked:border-ink peer-checked:bg-ink peer-checked:text-ivory peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-lavender-ink hover:border-ink/40">
                  <span>
                    <span className="font-medium">Level {c.level}</span> · {c.name}
                  </span>
                  {c.level === recommendedLevel && <span className="text-xs opacity-70">Your level</span>}
                </span>
              </label>
            ))}
          </div>
          <p className="text-sm text-slate">{getComfortLevel(level).whatToExpect.join(" · ")}</p>
        </fieldset>

        <ConfidenceScale legend="How confident do you feel about this conversation?" value={confidence} onChange={onConfidence} />

        <div className="flex flex-col gap-3 border-t border-line pt-6">
          {mode === "demo" && (
            <div className="flex flex-col gap-2 rounded-2xl bg-champagne-soft p-4 text-sm text-champagne-ink">
              <DemoBadge className="self-start" />
              <p>
                No AI key is configured, so {scenario.character.name}&apos;s replies are scripted and feedback is rule-based.
                Voice transcription also needs a key — type your replies in Demo Mode.
              </p>
            </div>
          )}
          <Button size="lg" onClick={onStart} disabled={confidence === null} className="w-full">
            Start Conversation
          </Button>
          <p className="text-xs leading-relaxed text-slate">
            {mode === "live"
              ? "When you tap the mic, your browser will ask for permission. Your audio is sent for transcription and immediately discarded — we never store recordings. "
              : ""}
            You can type instead of speaking at any time.
          </p>
        </div>
      </section>
    </div>
  );
}
