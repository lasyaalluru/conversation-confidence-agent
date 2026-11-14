import type { ComfortLevel, GoalId } from "./types";

export interface ComfortLevelInfo {
  level: ComfortLevel;
  name: string;
  /** How the learner describes themselves (shown in onboarding). */
  selfDescription: string;
  /** What changes in practice at this level (shown in pre-brief/settings). */
  whatToExpect: string[];
}

export const COMFORT_LEVELS: ComfortLevelInfo[] = [
  {
    level: 1,
    name: "Building Confidence",
    selfDescription: "I know English, but I often feel nervous, hesitate, or struggle to find words when speaking.",
    whatToExpect: ["A patient, friendly partner", "Slower speech and simple questions", "Hints whenever you want them"],
  },
  {
    level: 2,
    name: "Finding My Flow",
    selfDescription:
      "I can hold conversations, but sometimes struggle with small talk, spontaneous responses, or expressing myself naturally.",
    whatToExpect: ["Natural pace and more small talk", "Follow-up questions and a mild surprise", "Hints on request"],
  },
  {
    level: 3,
    name: "Expressing Myself Confidently",
    selfDescription:
      "I can communicate comfortably but want to become more articulate, persuasive, and confident in academic, social, or professional situations.",
    whatToExpect: ["Spontaneous, varied conversation", "Unexpected questions and real choices", "Minimal help unless you ask"],
  },
];

export function getComfortLevel(level: ComfortLevel): ComfortLevelInfo {
  return COMFORT_LEVELS[level - 1];
}

export function isComfortLevel(value: unknown): value is ComfortLevel {
  return value === 1 || value === 2 || value === 3;
}

export function parseComfortLevel(value: unknown): ComfortLevel | null {
  const n = typeof value === "string" ? Number(value) : value;
  return isComfortLevel(n) ? n : null;
}

export const GOALS: { id: GoalId; label: string }[] = [
  { id: "everyday", label: "Everyday conversations" },
  { id: "small_talk", label: "Small talk" },
  { id: "friends", label: "Making friends" },
  { id: "classroom", label: "Classroom participation" },
  { id: "group_discussion", label: "Group discussions" },
  { id: "professional", label: "Professional communication" },
  { id: "networking", label: "Networking" },
  { id: "interviews_presentations", label: "Interviews and presentations" },
];

export function goalLabel(id: GoalId): string {
  return GOALS.find((g) => g.id === id)?.label ?? id;
}
