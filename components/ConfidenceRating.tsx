"use client";

import { useTranslations } from "next-intl";

/** 1–5 self-rated confidence. Directly measurable — store it as-is (no AI judgment involved). */
export default function ConfidenceRating({
  label,
  value,
  onChange,
}: {
  label: string;
  value: number | null;
  onChange: (value: number) => void;
}) {
  const t = useTranslations("practice");

  return (
    <fieldset className="flex flex-col gap-3">
      <legend className="font-medium mb-3">{label}</legend>
      <div className="flex gap-2">
        {[1, 2, 3, 4, 5].map((n) => (
          <button
            key={n}
            type="button"
            aria-pressed={value === n}
            onClick={() => onChange(n)}
            className={`h-12 w-12 rounded-full border text-lg font-medium transition-colors ${
              value === n ? "bg-accent text-accent-foreground border-accent" : "border-line bg-surface hover:border-accent"
            }`}
          >
            {n}
          </button>
        ))}
      </div>
      <div className="flex justify-between text-xs text-muted w-[17rem]">
        <span>{t("confidenceLow")}</span>
        <span>{t("confidenceHigh")}</span>
      </div>
    </fieldset>
  );
}
