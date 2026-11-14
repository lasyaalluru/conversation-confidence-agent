import { notFound } from "next/navigation";
import { getTranslations } from "next-intl/server";
import PracticeSession from "@/components/PracticeSession";
import { getScenario, isLanguage } from "@/lib/scenarios";

// /practice/ordering-coffee?lang=en
export default async function PracticePage({ params, searchParams }: PageProps<"/practice/[scenarioId]">) {
  const { scenarioId } = await params;
  const { lang } = await searchParams;
  const practiceLanguage = isLanguage(lang) ? lang : "en";

  const scenario = getScenario(scenarioId);
  const content = scenario?.content[practiceLanguage];
  if (!scenario || !scenario.available || !content) notFound();

  const t = await getTranslations("scenarios");

  return (
    <PracticeSession
      // `key` resets all state if the learner switches practice language
      key={`${scenarioId}-${practiceLanguage}`}
      scenarioId={scenarioId}
      practiceLanguage={practiceLanguage}
      content={content}
      title={t(`${scenario.i18nKey}.title`)}
    />
  );
}
