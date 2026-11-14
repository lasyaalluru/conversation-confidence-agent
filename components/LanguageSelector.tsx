"use client";

import { useTranslations } from "next-intl";
import { LANGUAGES } from "@/lib/scenarios";
import type { Language } from "@/types";

/** Segmented toggle for choosing a language. Used for both UI and practice language. */
export default function LanguageSelector({
  value,
  onChange,
  label,
  size = "md",
}: {
  value: Language;
  onChange: (lang: Language) => void;
  label: string;
  size?: "sm" | "md";
}) {
  const t = useTranslations("common.languages");
  const pad = size === "sm" ? "px-2.5 py-1 text-xs" : "px-4 py-2 text-sm";

  return (
    <div role="radiogroup" aria-label={label} className="inline-flex rounded-full border border-line bg-surface p-0.5">
      {LANGUAGES.map((lang) => (
        <button
          key={lang}
          type="button"
          role="radio"
          aria-checked={value === lang}
          onClick={() => onChange(lang)}
          className={`${pad} rounded-full transition-colors ${
            value === lang ? "bg-accent text-accent-foreground" : "text-muted hover:text-foreground"
          }`}
        >
          {t(lang)}
        </button>
      ))}
    </div>
  );
}
