"use client";

import Link from "next/link";
import { useTranslations } from "next-intl";
import type { Language, Scenario } from "@/types";

export default function ScenarioCard({
  scenario,
  practiceLanguage,
}: {
  scenario: Scenario;
  practiceLanguage: Language;
}) {
  const t = useTranslations();
  const key = `scenarios.${scenario.i18nKey}`;
  const hasLanguage = Boolean(scenario.content[practiceLanguage]);
  const enabled = scenario.available && hasLanguage;

  const body = (
    <>
      <div className="flex items-center justify-between gap-2 text-xs text-muted">
        <span>
          {t(`common.difficulty.${scenario.difficulty}`)} · {t(`${key}.category`)}
        </span>
        {!scenario.available && (
          <span className="rounded-full bg-warn-soft text-warn px-2 py-0.5">{t("common.comingSoon")}</span>
        )}
      </div>
      <h3 className="text-base font-semibold">{t(`${key}.title`)}</h3>
      <p className="text-sm text-muted leading-relaxed">{t(`${key}.description`)}</p>
      {scenario.available && !hasLanguage && <p className="text-xs text-warn">{t("home.notInLanguage")}</p>}
      {enabled && <span className="mt-1 text-sm font-medium text-accent">{t("home.start")} →</span>}
    </>
  );

  const base = "flex flex-col gap-2 rounded-2xl border border-line bg-surface p-5";

  if (!enabled) {
    return <div className={`${base} opacity-60`} aria-disabled>{body}</div>;
  }

  return (
    <Link
      href={`/practice/${scenario.id}?lang=${practiceLanguage}`}
      className={`${base} hover:border-accent transition-colors`}
    >
      {body}
    </Link>
  );
}
