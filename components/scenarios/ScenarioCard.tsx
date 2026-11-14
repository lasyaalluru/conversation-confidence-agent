import Link from "next/link";
import { Badge } from "@/components/ui/primitives";
import type { Scenario } from "@/lib/scenarios/catalog";

const CATEGORY_TINT: Record<Scenario["category"], string> = {
  everyday: "from-champagne-soft",
  social: "from-lavender-soft",
  group: "from-sage-soft",
  academic: "from-lavender-soft",
  professional: "from-champagne-soft",
};

/** Playable scenarios are links. "Coming soon" ones are plain, clearly labeled, non-interactive cards. */
export function ScenarioCard({ scenario, level }: { scenario: Scenario; level?: number }) {
  if (scenario.status === "coming_soon") {
    return (
      <div className="flex h-full flex-col gap-2 rounded-3xl border border-dashed border-line-strong bg-paper/50 p-5" aria-disabled>
        <div className="flex items-start justify-between gap-3">
          <h3 className="font-medium text-ink/70">{scenario.title}</h3>
          <Badge>Coming soon</Badge>
        </div>
        <p className="text-sm leading-relaxed text-slate">{scenario.summary}</p>
      </div>
    );
  }

  return (
    <Link
      href={`/practice/${scenario.id}${level ? `?level=${level}` : ""}`}
      className={`group relative flex h-full flex-col gap-3 overflow-hidden rounded-3xl border border-line bg-gradient-to-br ${CATEGORY_TINT[scenario.category]} to-paper p-6 shadow-soft transition-all hover:-translate-y-0.5 hover:shadow-lift`}
    >
      <div className="flex items-start justify-between gap-3">
        <h3 className="font-display text-3xl leading-tight">{scenario.title}</h3>
        <Badge tone="sage">Available</Badge>
      </div>
      <p className="leading-relaxed text-slate">{scenario.summary}</p>
      <div className="mt-auto flex items-center justify-between pt-3 text-sm">
        <span className="text-slate">~{scenario.estimatedMinutes} min · 3 comfort levels</span>
        <span className="font-medium text-ink transition-transform group-hover:translate-x-0.5">Practice →</span>
      </div>
    </Link>
  );
}
