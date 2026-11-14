"use client";

import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import LanguageSelector from "@/components/LanguageSelector";
import ScenarioCard from "@/components/ScenarioCard";
import { SCENARIOS } from "@/lib/scenarios";
import type { Language } from "@/types";

export default function ScenarioPicker({ practiceLanguage }: { practiceLanguage: Language }) {
  const router = useRouter();
  const t = useTranslations();

  return (
    <section className="flex flex-col gap-6">
      <div className="flex flex-col gap-2">
        <span className="text-sm font-medium">{t("common.practiceLanguage")}</span>
        <LanguageSelector
          value={practiceLanguage}
          onChange={(lang) => router.replace(`/?lang=${lang}`, { scroll: false })}
          label={t("common.practiceLanguage")}
        />
      </div>

      <div className="flex flex-col gap-3">
        <h2 className="text-lg font-semibold">{t("home.chooseScenario")}</h2>
        <div className="grid gap-3 sm:grid-cols-2">
          {SCENARIOS.map((s) => (
            <ScenarioCard key={s.id} scenario={s} practiceLanguage={practiceLanguage} />
          ))}
        </div>
      </div>
    </section>
  );
}
