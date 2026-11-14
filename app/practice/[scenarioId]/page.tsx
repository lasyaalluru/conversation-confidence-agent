import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { PracticeExperience } from "@/components/conversation/PracticeExperience";
import { getPlayableScenario, parseComfortLevel } from "@/lib/scenarios/catalog";

export async function generateMetadata({ params }: PageProps<"/practice/[scenarioId]">): Promise<Metadata> {
  const { scenarioId } = await params;
  return { title: getPlayableScenario(scenarioId)?.title ?? "Practice" };
}

// /practice/ordering-coffee?level=2 — level is optional (defaults to the user's comfort level).
export default async function PracticePage({ params, searchParams }: PageProps<"/practice/[scenarioId]">) {
  const { scenarioId } = await params;
  const { level } = await searchParams;
  const scenario = getPlayableScenario(scenarioId);
  if (!scenario) notFound();
  return <PracticeExperience key={scenarioId} scenario={scenario} requestedLevel={parseComfortLevel(level)} />;
}
