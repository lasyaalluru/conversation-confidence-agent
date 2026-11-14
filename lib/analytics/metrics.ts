import { CATEGORIES, PLAYABLE_SCENARIOS, getScenario, type CategoryId } from "@/lib/scenarios/catalog";
import type { Mission, PracticeSession, Profile, SavedPhrase } from "@/types/domain";

/**
 * Deterministic analytics (FR-07 / TR-06). Everything here is computed from stored data —
 * timestamps, counts and the user's own ratings. No AI judgment, no estimates.
 */

export function sessionDurationSeconds(s: PracticeSession): number | null {
  if (!s.endedAt) return null;
  const ms = Date.parse(s.endedAt) - Date.parse(s.startedAt);
  return Number.isFinite(ms) && ms >= 0 ? Math.round(ms / 1000) : null;
}

export function formatDuration(seconds: number | null): string {
  if (seconds === null) return "—";
  if (seconds < 60) return `${seconds}s`;
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return s ? `${m}m ${s}s` : `${m}m`;
}

export function confidenceChange(s: PracticeSession): number | null {
  return s.confidenceBefore !== null && s.confidenceAfter !== null ? s.confidenceAfter - s.confidenceBefore : null;
}

export interface Summary {
  sessionsCompleted: number;
  scenariosAttempted: number;
  totalPracticeSeconds: number;
  totalTurns: number;
  missionsTried: number;
  missionsTotal: number;
  phrasesSaved: number;
  avgConfidenceBefore: number | null;
  avgConfidenceAfter: number | null;
  avgConfidenceChange: number | null;
}

const avg = (xs: number[]) => (xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : null);

export function summarize(sessions: PracticeSession[], missions: Mission[], phrases: SavedPhrase[]): Summary {
  const done = sessions.filter((s) => s.status !== "in_progress");
  const rated = done.filter((s) => s.confidenceBefore !== null && s.confidenceAfter !== null);
  return {
    sessionsCompleted: done.filter((s) => s.status === "completed").length,
    scenariosAttempted: new Set(done.map((s) => s.scenarioId)).size,
    totalPracticeSeconds: done.reduce((sum, s) => sum + (sessionDurationSeconds(s) ?? 0), 0),
    totalTurns: done.reduce((sum, s) => sum + s.userTurnCount, 0),
    missionsTried: missions.filter((m) => m.status === "tried").length,
    missionsTotal: missions.length,
    phrasesSaved: phrases.length,
    avgConfidenceBefore: avg(rated.map((s) => s.confidenceBefore!)),
    avgConfidenceAfter: avg(rated.map((s) => s.confidenceAfter!)),
    avgConfidenceChange: avg(rated.map((s) => s.confidenceAfter! - s.confidenceBefore!)),
  };
}

export interface ConfidencePoint {
  /** ISO time of the rating. */
  at: string;
  value: number;
  kind: "baseline" | "before" | "after";
  sessionId?: string;
}

/** Every self-rating in time order: onboarding baseline, then before/after for each session. */
export function confidenceSeries(profile: Profile | null, sessions: PracticeSession[]): ConfidencePoint[] {
  const points: ConfidencePoint[] = [];
  if (profile?.baselineConfidence && profile.onboardedAt) {
    points.push({ at: profile.onboardedAt, value: profile.baselineConfidence, kind: "baseline" });
  }
  for (const s of [...sessions].sort((a, b) => a.startedAt.localeCompare(b.startedAt))) {
    if (s.status === "in_progress") continue;
    if (s.confidenceBefore !== null) points.push({ at: s.startedAt, value: s.confidenceBefore, kind: "before", sessionId: s.id });
    if (s.confidenceAfter !== null)
      points.push({ at: s.endedAt ?? s.startedAt, value: s.confidenceAfter, kind: "after", sessionId: s.id });
  }
  return points;
}

/** Sessions per local day for the last `days` days (oldest first). */
export function activityByDay(sessions: PracticeSession[], days = 28, today = new Date()): { date: string; count: number }[] {
  const key = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
  const counts = new Map<string, number>();
  for (const s of sessions) {
    if (s.status === "in_progress") continue;
    const k = key(new Date(s.startedAt));
    counts.set(k, (counts.get(k) ?? 0) + 1);
  }
  const out: { date: string; count: number }[] = [];
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date(today.getFullYear(), today.getMonth(), today.getDate() - i);
    out.push({ date: key(d), count: counts.get(key(d)) ?? 0 });
  }
  return out;
}

export function sessionsByCategory(sessions: PracticeSession[]): { category: CategoryId; title: string; count: number; available: boolean }[] {
  return CATEGORIES.map((c) => ({
    category: c.id,
    title: c.title,
    count: sessions.filter((s) => s.status !== "in_progress" && getScenario(s.scenarioId)?.category === c.id).length,
    available: PLAYABLE_SCENARIOS.some((s) => s.category === c.id),
  }));
}

/** Current streak of consecutive days (ending today or yesterday) with at least one session. */
export function practiceStreak(sessions: PracticeSession[], today = new Date()): number {
  const days = activityByDay(sessions, 60, today).reverse();
  let i = days[0].count > 0 ? 0 : 1;
  let streak = 0;
  for (; i < days.length && days[i].count > 0; i++) streak++;
  return streak;
}
