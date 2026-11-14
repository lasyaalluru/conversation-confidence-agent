import type { Metadata } from "next";
import { ScenarioCard } from "@/components/scenarios/ScenarioCard";
import { Eyebrow } from "@/components/ui/primitives";
import { CATEGORIES, scenariosByCategory } from "@/lib/scenarios/catalog";

export const metadata: Metadata = { title: "Practice library" };

export default function ScenariosPage() {
  return (
    <div className="flex flex-col gap-14">
      <header className="flex max-w-2xl flex-col gap-3">
        <Eyebrow>Practice library</Eyebrow>
        <h1 className="font-display text-[clamp(2.5rem,5vw,3.75rem)] leading-[1.02]">Real situations, one step at a time.</h1>
        <p className="text-lg leading-relaxed text-slate">
          Scenarios are organized as a confidence ladder — from everyday moments to professional conversations. We&apos;re
          starting with one carefully built conversation; more are on the way.
        </p>
      </header>

      {CATEGORIES.map((c) => {
        const items = scenariosByCategory(c.id);
        const playable = items.filter((s) => s.status === "available");
        const upcoming = items.filter((s) => s.status === "coming_soon");
        return (
          <section key={c.id} aria-labelledby={`cat-${c.id}`} className="flex flex-col gap-5">
            <div className="flex items-baseline gap-4 border-b border-line pb-3">
              <span className="font-mono text-xs text-slate">Step {c.ladderStep}</span>
              <div>
                <h2 id={`cat-${c.id}`} className="font-display text-3xl">
                  {c.title}
                </h2>
                <p className="text-sm text-slate">{c.tagline}</p>
              </div>
            </div>
            {playable.length > 0 && (
              <div className="grid gap-4 md:grid-cols-2">
                {playable.map((s) => (
                  <ScenarioCard key={s.id} scenario={s} />
                ))}
              </div>
            )}
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {upcoming.map((s) => (
                <ScenarioCard key={s.id} scenario={s} />
              ))}
            </div>
          </section>
        );
      })}
    </div>
  );
}
