import {
  PLAYABLE_SCENARIOS,
  SCENARIOS,
  getComfortLevel,
  getPlayableScenario,
  type ComfortLevel,
  type GoalId,
  type PlayableScenario,
  type Scenario,
} from "@/lib/scenarios/catalog";
import type { PracticeSession, Profile } from "@/types/domain";

/**
 * Transparent, rule-based recommendations (FR-10). Every recommendation carries a plain-language
 * `reason` and `rule` so users (and the team) can see WHY. Users can always override the level.
 */
export interface Recommendation {
  scenario: PlayableScenario;
  level: ComfortLevel;
  reason: string;
  rule: string;
}

export interface Recommendations {
  today: Recommendation;
  nextChallenge: Recommendation | null;
  /** A not-yet-playable scenario that matches the user's goals — shown as "coming soon", never as playable. */
  upcoming: Scenario | null;
}

const COMFORTABLE = 4; // self-rated confidence at or above this counts as "comfortable"

export function recommendFirstScenario(level: ComfortLevel, goals: GoalId[]): Recommendation {
  const scenario =
    PLAYABLE_SCENARIOS.find((s) => s.goals.some((g) => goals.includes(g))) ?? PLAYABLE_SCENARIOS[0];
  return {
    scenario,
    level,
    rule: "first-session",
    reason: "It's short, low-stakes and happens every day — a quick first win.",
  };
}

function completed(sessions: PracticeSession[]) {
  return sessions
    .filter((s) => s.status === "completed")
    .sort((a, b) => a.startedAt.localeCompare(b.startedAt));
}

export function recommend(profile: Profile | null, sessions: PracticeSession[]): Recommendations {
  const level: ComfortLevel = profile?.comfortLevel ?? 1;
  const goals = profile?.goals ?? [];
  const done = completed(sessions);
  const last = done.at(-1);
  const upcoming = SCENARIOS.find((s) => s.status === "coming_soon" && s.goals.some((g) => goals.includes(g))) ?? null;

  if (!last) {
    const first = recommendFirstScenario(level, goals);
    return {
      today: first,
      nextChallenge: level < 3 ? { ...first, level: (level + 1) as ComfortLevel, rule: "preview-next-level", reason: `When you're ready, try Level ${level + 1} — ${getComfortLevel((level + 1) as ComfortLevel).name}.` } : null,
      upcoming,
    };
  }

  const scenario = getPlayableScenario(last.scenarioId) ?? PLAYABLE_SCENARIOS[0];
  const atLevel = done.filter((s) => s.scenarioId === scenario.id && s.comfortLevel === last.comfortLevel);
  const comfortableAtLevel = atLevel.filter((s) => (s.confidenceAfter ?? 0) >= COMFORTABLE).length;
  const dropped = last.confidenceAfter !== null && last.confidenceBefore !== null && last.confidenceAfter < last.confidenceBefore;

  let today: Recommendation;
  if (dropped) {
    today = {
      scenario,
      level: last.comfortLevel,
      rule: "repeat-after-dip",
      reason: "Last time felt harder than expected. Repeating the same conversation is one of the fastest ways to build ease.",
    };
  } else if (comfortableAtLevel >= 2 && last.comfortLevel < 3) {
    const next = (last.comfortLevel + 1) as ComfortLevel;
    today = {
      scenario,
      level: next,
      rule: "level-up",
      reason: `You've felt comfortable at Level ${last.comfortLevel} ${comfortableAtLevel} times. Ready to stretch to ${getComfortLevel(next).name}?`,
    };
  } else {
    today = {
      scenario,
      level: last.comfortLevel,
      rule: "practice-again",
      reason:
        atLevel.length === 1
          ? "Repeat it once more and try one thing from your feedback."
          : "Keep the rhythm going — small, regular practice builds automatic responses.",
    };
  }

  let nextChallenge: Recommendation | null = null;
  if (today.level < 3) {
    const next = (today.level + 1) as ComfortLevel;
    nextChallenge = {
      scenario,
      level: next,
      rule: "stretch",
      reason: `A gentle stretch: ${getComfortLevel(next).name} adds ${next === 2 ? "more small talk and a mild surprise" : "spontaneous questions and real choices"}.`,
    };
  } else {
    nextChallenge = {
      scenario,
      level: 3,
      rule: "level-3-variety",
      reason: "At Level 3 every conversation is different — practice handling the unexpected.",
    };
  }

  return { today, nextChallenge, upcoming };
}
