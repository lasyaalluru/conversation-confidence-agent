import type { SupabaseClient } from "@supabase/supabase-js";
import { FEEDBACK_VERSION, type FeedbackResponse } from "@/lib/ai/contract";
import type { ComfortLevel, GoalId } from "@/lib/scenarios/types";
import type { Mission, PracticeSession, Profile, ProgressSnapshot, SavedPhrase } from "@/types/domain";
import { DEFAULT_CONSENT, type ProgressStore } from "./store";

/**
 * Signed-in storage backed by Supabase Postgres (tables in supabase/migrations/0001_init.sql).
 * Row Level Security restricts every query to the signed-in user's own rows.
 *
 * NOTE: written against the schema in this repo but not yet run against a live project —
 * verify with two test accounts before the pilot (see docs/ROADMAP.md).
 */
export class SupabaseStore implements ProgressStore {
  readonly kind = "supabase" as const;

  constructor(
    private db: SupabaseClient,
    private userId: string,
  ) {}

  private check<T>(result: { data: T; error: { message: string } | null }): T {
    if (result.error) throw new Error(result.error.message);
    return result.data;
  }

  async load(): Promise<ProgressSnapshot> {
    const [profileRes, sessionsRes, missionsRes, phrasesRes] = await Promise.all([
      this.db.from("profiles").select("*").eq("user_id", this.userId).maybeSingle(),
      this.db
        .from("practice_sessions")
        .select("*, conversation_turns(*), feedback(*)")
        .eq("user_id", this.userId)
        .order("started_at", { ascending: false }),
      this.db.from("missions").select("*").eq("user_id", this.userId).order("created_at", { ascending: false }),
      this.db.from("saved_phrases").select("*").eq("user_id", this.userId).order("saved_at", { ascending: false }),
    ]);

    const p = this.check(profileRes);
    const profile: Profile | null = p
      ? {
          comfortLevel: p.comfort_level as ComfortLevel,
          goals: (p.goals ?? []) as GoalId[],
          baselineConfidence: p.baseline_confidence,
          onboardedAt: p.onboarding_completed_at,
          consent: { ...DEFAULT_CONSENT, ...(p.consent ?? {}) },
          createdAt: p.created_at,
        }
      : null;

    const sessions: PracticeSession[] = (this.check(sessionsRes) ?? []).map((r) => {
      const fb = Array.isArray(r.feedback) ? r.feedback[0] : r.feedback;
      const turns = [...(r.conversation_turns ?? [])].sort((a, b) => a.sequence - b.sequence);
      return {
        id: r.id,
        scenarioId: r.scenario_id,
        comfortLevel: r.comfort_level,
        mode: r.mode,
        status: r.status,
        startedAt: r.started_at,
        endedAt: r.ended_at,
        confidenceBefore: r.confidence_before,
        confidenceAfter: r.confidence_after,
        userTurnCount: r.user_turn_count,
        events: r.events ?? [],
        reflection: r.reflection ?? null,
        turns: turns.map((t) => ({
          speaker: t.speaker,
          text: t.transcript,
          at: t.spoken_at,
          sequence: t.sequence,
          inputMode: t.input_mode ?? undefined,
          stage: t.stage ?? undefined,
        })),
        feedback: fb
          ? ({
              summary: fb.summary,
              wentWell: fb.strengths,
              improve: fb.improvements,
              alternatives: fb.alternative_phrases,
              reflection: fb.reflection,
              mode: fb.mode,
              version: fb.feedback_version,
            } satisfies FeedbackResponse)
          : null,
      };
    });

    const missions: Mission[] = (this.check(missionsRes) ?? []).map((m) => ({
      id: m.id,
      sessionId: m.session_id,
      scenarioId: m.scenario_id,
      text: m.mission_text,
      status: m.completion_status,
      reflection: m.reflection ?? "",
      createdAt: m.created_at,
      updatedAt: m.updated_at,
    }));

    const phrases: SavedPhrase[] = (this.check(phrasesRes) ?? []).map((x) => ({
      id: x.id,
      phrase: x.phrase,
      context: x.context ?? "",
      scenarioId: x.scenario_id,
      savedAt: x.saved_at,
    }));

    return { profile, sessions, missions, phrases };
  }

  async saveProfile(profile: Profile) {
    this.check(
      await this.db.from("profiles").upsert({
        user_id: this.userId,
        comfort_level: profile.comfortLevel,
        goals: profile.goals,
        baseline_confidence: profile.baselineConfidence,
        onboarding_completed_at: profile.onboardedAt,
        consent: profile.consent,
      }),
    );
  }

  async saveSession(s: PracticeSession) {
    this.check(
      await this.db.from("practice_sessions").upsert({
        id: s.id,
        user_id: this.userId,
        scenario_id: s.scenarioId,
        comfort_level: s.comfortLevel,
        mode: s.mode,
        status: s.status,
        started_at: s.startedAt,
        ended_at: s.endedAt,
        confidence_before: s.confidenceBefore,
        confidence_after: s.confidenceAfter,
        user_turn_count: s.userTurnCount,
        events: s.events,
        reflection: s.reflection,
      }),
    );

    // Replace turns (simple and safe for short conversations).
    this.check(await this.db.from("conversation_turns").delete().eq("session_id", s.id));
    if (s.turns.length) {
      this.check(
        await this.db.from("conversation_turns").insert(
          s.turns.map((t) => ({
            session_id: s.id,
            speaker: t.speaker,
            transcript: t.text,
            spoken_at: t.at,
            sequence: t.sequence,
            input_mode: t.inputMode ?? null,
            stage: t.stage ?? null,
          })),
        ),
      );
    }

    if (s.feedback) {
      this.check(
        await this.db.from("feedback").upsert(
          {
            session_id: s.id,
            summary: s.feedback.summary,
            strengths: s.feedback.wentWell,
            improvements: s.feedback.improve,
            alternative_phrases: s.feedback.alternatives,
            reflection: s.feedback.reflection,
            mode: s.feedback.mode,
            feedback_version: s.feedback.version ?? FEEDBACK_VERSION,
          },
          { onConflict: "session_id" },
        ),
      );
    }
  }

  async deleteSession(id: string) {
    this.check(await this.db.from("practice_sessions").delete().eq("id", id));
  }

  async saveMission(m: Mission) {
    this.check(
      await this.db.from("missions").upsert({
        id: m.id,
        user_id: this.userId,
        session_id: m.sessionId,
        scenario_id: m.scenarioId,
        mission_text: m.text,
        completion_status: m.status,
        reflection: m.reflection,
        created_at: m.createdAt,
        updated_at: m.updatedAt,
      }),
    );
  }

  async savePhrase(p: SavedPhrase) {
    this.check(
      await this.db.from("saved_phrases").upsert(
        {
          id: p.id,
          user_id: this.userId,
          phrase: p.phrase,
          context: p.context,
          scenario_id: p.scenarioId,
          saved_at: p.savedAt,
        },
        { onConflict: "user_id,phrase", ignoreDuplicates: true },
      ),
    );
  }

  async deletePhrase(id: string) {
    this.check(await this.db.from("saved_phrases").delete().eq("id", id));
  }

  async deleteAll() {
    // Sessions cascade to turns, feedback and missions.
    this.check(await this.db.from("practice_sessions").delete().eq("user_id", this.userId));
    this.check(await this.db.from("missions").delete().eq("user_id", this.userId));
    this.check(await this.db.from("saved_phrases").delete().eq("user_id", this.userId));
    this.check(await this.db.from("profiles").delete().eq("user_id", this.userId));
  }
}
