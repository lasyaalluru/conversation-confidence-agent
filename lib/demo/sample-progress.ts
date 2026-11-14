import type { Mission, PracticeSession, Profile, SavedPhrase } from "@/types/domain";

/**
 * SAMPLE DATA — used only by the clearly-labeled "preview" on an empty dashboard.
 * Never mixed into, or saved alongside, a user's real progress.
 */
export function sampleProgress(now = new Date()): {
  profile: Profile;
  sessions: PracticeSession[];
  missions: Mission[];
  phrases: SavedPhrase[];
} {
  const day = (d: number, h = 9) => new Date(now.getFullYear(), now.getMonth(), now.getDate() - d, h, 12).toISOString();
  const ratings: [number, number, 1 | 2 | 3, number][] = [
    [2, 3, 1, 13],
    [2, 3, 1, 11],
    [3, 4, 1, 8],
    [3, 4, 1, 6],
    [3, 3, 2, 4],
    [3, 4, 2, 2],
    [4, 4, 2, 0],
  ];
  const sessions: PracticeSession[] = ratings.map(([before, after, level, d], i) => ({
    id: `sample-${i}`,
    scenarioId: "ordering-coffee",
    comfortLevel: level,
    mode: "demo",
    status: "completed",
    startedAt: day(d),
    endedAt: new Date(Date.parse(day(d)) + (200 + i * 15) * 1000).toISOString(),
    confidenceBefore: before,
    confidenceAfter: after,
    turns: [],
    userTurnCount: 5,
    events: [],
    feedback: null,
    reflection: null,
  }));
  return {
    profile: {
      comfortLevel: 2,
      goals: ["everyday", "small_talk"],
      baselineConfidence: 2,
      onboardedAt: day(14),
      consent: { storeTranscripts: true, pilotReflections: true },
      createdAt: day(14),
    },
    sessions,
    missions: sessions.slice(0, 5).map((s, i) => ({
      id: `sample-m-${i}`,
      sessionId: s.id,
      scenarioId: s.scenarioId,
      text: "Return one friendly question when you order coffee.",
      status: i < 3 ? "tried" : i === 3 ? "not_yet" : "pending",
      reflection: "",
      createdAt: s.startedAt,
      updatedAt: s.startedAt,
    })),
    phrases: ["Pretty good, thanks! How about you?", "Could I get a medium latte, please?", "No worries — what would you recommend instead?"].map(
      (phrase, i) => ({ id: `sample-p-${i}`, phrase, context: "Ordering coffee", scenarioId: "ordering-coffee", savedAt: day(10 - i * 3) }),
    ),
  };
}
