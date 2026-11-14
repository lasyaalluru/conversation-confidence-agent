"use client";

import { useId } from "react";

const LABELS = ["", "Very nervous", "A bit nervous", "Okay", "Fairly confident", "Very confident"];

/**
 * 1–5 self-rated confidence (radio group — fully keyboard accessible).
 * This is a SELF-REPORT. Never present it as an objective measurement.
 */
export function ConfidenceScale({
  legend,
  value,
  onChange,
  description,
}: {
  legend: string;
  value: number | null;
  onChange: (value: number) => void;
  description?: string;
}) {
  const name = useId();
  return (
    <fieldset className="flex flex-col gap-3">
      <legend className="text-lg font-medium leading-snug">{legend}</legend>
      {description && <p className="-mt-1 text-sm text-slate">{description}</p>}
      <div className="flex flex-wrap gap-2 pt-1">
        {[1, 2, 3, 4, 5].map((n) => (
          <label key={n} className="group relative cursor-pointer">
            <input
              type="radio"
              name={name}
              value={n}
              checked={value === n}
              onChange={() => onChange(n)}
              className="peer sr-only"
            />
            <span className="flex h-14 w-14 items-center justify-center rounded-2xl border border-line-strong bg-paper text-lg font-medium transition-all peer-checked:border-ink peer-checked:bg-ink peer-checked:text-ivory peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-lavender-ink group-hover:border-ink/50">
              {n}
            </span>
            <span className="sr-only">{LABELS[n]}</span>
          </label>
        ))}
      </div>
      <div className="flex w-full max-w-[19rem] justify-between text-xs text-slate">
        <span>Very nervous</span>
        <span>Very confident</span>
      </div>
      {value !== null && <p className="text-sm text-slate" aria-live="polite">{value} — {LABELS[value]}</p>}
    </fieldset>
  );
}
