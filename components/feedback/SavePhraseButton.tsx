"use client";

import { useProgress } from "@/components/providers/ProgressProvider";
import { newId, nowIso } from "@/lib/database/store";

export function SavePhraseButton({
  phrase,
  context,
  scenarioId,
  tone = "light",
}: {
  phrase: string;
  context: string;
  scenarioId: string | null;
  tone?: "light" | "dark";
}) {
  const { phrases, savePhrase } = useProgress();
  const saved = phrases.some((p) => p.phrase.toLowerCase() === phrase.toLowerCase());
  return (
    <button
      type="button"
      disabled={saved}
      onClick={() => void savePhrase({ id: newId(), phrase, context, scenarioId, savedAt: nowIso() }).catch(() => {})}
      aria-label={saved ? `Saved: ${phrase}` : `Save phrase: ${phrase}`}
      className={`inline-flex shrink-0 items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-medium transition-colors ${
        saved
          ? "border-sage-ink/30 bg-sage-soft text-sage-ink"
          : tone === "dark"
            ? "border-white/20 text-ivory hover:bg-white/10"
            : "border-line-strong text-ink hover:border-ink"
      }`}
    >
      <svg viewBox="0 0 16 16" className="h-3.5 w-3.5" aria-hidden>
        {saved ? (
          <path d="m3.5 8.5 3 3 6-7" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
        ) : (
          <path d="M4 2.5h8a.5.5 0 0 1 .5.5v10.5L8 11l-4.5 2.5V3a.5.5 0 0 1 .5-.5Z" fill="none" stroke="currentColor" strokeWidth="1.4" />
        )}
      </svg>
      {saved ? "Saved" : "Save phrase"}
    </button>
  );
}
