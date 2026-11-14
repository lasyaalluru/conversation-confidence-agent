import { describe, expect, it } from "vitest";
import { activityByDay, confidenceSeries, practiceStreak, sessionDurationSeconds, sessionsByCategory, summarize } from "@/lib/analytics/metrics";
import { SPEECH_METRICS } from "@/lib/analytics/registry";
import { applyConsent } from "@/lib/database/store";
import { recommend, recommendFirstScenario } from "@/lib/recommendations/rules";
import { rateLimit, resetRateLimits } from "@/lib/server/rate-limit";
import type { Mission, PracticeSession, Profile } from "@/types/domain";

const profile: Profile = {
  comfortLevel: 1,
  goals: ["everyday"],
  baselineConfidence: 2,
  onboardedAt: "2026-11-01T09:00:00.000Z",
  consent: { storeTranscripts: true, pilotReflections: true },
  createdAt: "2026-11-01T09:00:00.000Z",
};

let n = 0;
function session(p: Partial<PracticeSession> = {}): PracticeSession {
  n++;
  return {
    id: `s${n}`,
    scenarioId: "ordering-coffee",
    comfortLevel: 1,
    mode: "demo",
    status: "completed",
    startedAt: `2026-11-${String(2 + n).padStart(2, "0")}T10:00:00.000Z`,
    endedAt: `2026-11-${String(2 + n).padStart(2, "0")}T10:04:10.000Z`,
    confidenceBefore: 2,
    confidenceAfter: 3,
    turns: [{ speaker: "user", text: "hi", at: "", sequence: 0 }],
    userTurnCount: 5,
    events: [],
    feedback: null,
    reflection: null,
    ...p,
  };
}

describe("analytics (deterministic)", () => {
  it("computes duration from real timestamps", () => {
    expect(sessionDurationSeconds(session())).toBe(250);
    expect(sessionDurationSeconds(session({ endedAt: null }))).toBeNull();
  });

  it("summarizes only real data", () => {
    const sessions = [session(), session({ confidenceBefore: 3, confidenceAfter: 5 }), session({ status: "in_progress" })];
    const missions: Mission[] = [
      { id: "m1", sessionId: "s1", scenarioId: "ordering-coffee", text: "", status: "tried", reflection: "", createdAt: "", updatedAt: "" },
      { id: "m2", sessionId: "s2", scenarioId: "ordering-coffee", text: "", status: "pending", reflection: "", createdAt: "", updatedAt: "" },
    ];
    const s = summarize(sessions, missions, []);
    expect(s.sessionsCompleted).toBe(2);
    expect(s.missionsTried).toBe(1);
    expect(s.avgConfidenceChange).toBe(1.5);
    expect(summarize([], [], []).avgConfidenceChange).toBeNull();
  });

  it("builds a confidence series starting from the onboarding baseline", () => {
    const series = confidenceSeries(profile, [session()]);
    expect(series.map((p) => p.kind)).toEqual(["baseline", "before", "after"]);
  });

  it("counts activity per day and streaks", () => {
    const today = new Date(2026, 10, 14, 12);
    const local = (d: number) => new Date(2026, 10, d, 10).toISOString();
    const sessions = [session({ startedAt: local(14) }), session({ startedAt: local(13) }), session({ startedAt: local(11) })];
    const days = activityByDay(sessions, 7, today);
    expect(days).toHaveLength(7);
    expect(days.at(-1)!.count).toBe(1);
    expect(practiceStreak(sessions, today)).toBe(2);
  });

  it("marks only categories with playable scenarios as available", () => {
    const rows = sessionsByCategory([session()]);
    expect(rows.find((r) => r.category === "everyday")).toMatchObject({ count: 1, available: true });
    expect(rows.find((r) => r.category === "professional")!.available).toBe(false);
  });

  it("never marks an advanced speech metric as validated yet", () => {
    expect(SPEECH_METRICS.every((m) => m.status !== "validated")).toBe(true);
  });
});

describe("recommendations (rule-based)", () => {
  it("starts new users at their own level with a reason", () => {
    const r = recommendFirstScenario(2, ["small_talk"]);
    expect(r).toMatchObject({ level: 2, rule: "first-session" });
    expect(r.reason.length).toBeGreaterThan(10);
  });

  it("suggests the next level after two comfortable sessions", () => {
    const r = recommend(profile, [session({ confidenceAfter: 4 }), session({ confidenceAfter: 5 })]);
    expect(r.today).toMatchObject({ level: 2, rule: "level-up" });
  });

  it("suggests repeating after a confidence dip", () => {
    const r = recommend(profile, [session({ confidenceBefore: 4, confidenceAfter: 2 })]);
    expect(r.today).toMatchObject({ level: 1, rule: "repeat-after-dip" });
  });

  it("surfaces an upcoming scenario for the user's goals without making it playable", () => {
    const r = recommend({ ...profile, goals: ["networking"] }, []);
    expect(r.upcoming?.status).toBe("coming_soon");
    expect(r.today.scenario.status).toBe("available");
  });
});

describe("consent", () => {
  it("drops transcripts only after feedback exists when storage is off", () => {
    const off = { ...profile, consent: { ...profile.consent, storeTranscripts: false } };
    const s = session();
    expect(applyConsent(s, off).turns).toHaveLength(1); // still needed to generate feedback
    const withFeedback = { ...s, feedback: { summary: "x" } as PracticeSession["feedback"] };
    expect(applyConsent(withFeedback, off).turns).toHaveLength(0);
    expect(applyConsent(withFeedback, profile).turns).toHaveLength(1);
  });
});

describe("rate limit", () => {
  it("allows up to the limit within the window, then blocks", () => {
    resetRateLimits();
    const t = 1_000_000;
    for (let i = 0; i < 3; i++) expect(rateLimit("k", 3, 60_000, t + i).ok).toBe(true);
    expect(rateLimit("k", 3, 60_000, t + 10).ok).toBe(false);
    expect(rateLimit("k", 3, 60_000, t + 60_001).ok).toBe(true);
  });
});
