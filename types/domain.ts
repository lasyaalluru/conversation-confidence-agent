// Domain types for everything we persist (locally for guests, in Supabase for accounts).
import type { AiMode, FeedbackResponse } from "@/lib/ai/contract";
import type { ComfortLevel, GoalId } from "@/lib/scenarios/types";

export interface ConsentPreferences {
  /** Keep conversation transcripts after feedback is generated. Raw audio is never stored. */
  storeTranscripts: boolean;
  /** Optional pilot reflections (shared only via manual export). */
  pilotReflections: boolean;
}

export interface Profile {
  comfortLevel: ComfortLevel;
  goals: GoalId[];
  /** Self-reported 1–5 at onboarding. Not an objective measure. */
  baselineConfidence: number | null;
  onboardedAt: string | null;
  consent: ConsentPreferences;
  createdAt: string;
}

export interface ConversationTurn {
  speaker: "ai" | "user";
  text: string;
  at: string;
  sequence: number;
  inputMode?: "voice" | "text";
  stage?: string;
}

/** Raw timing events. Recorded for future analytics; only some are displayed. */
export type SessionEventType =
  | "session_start"
  | "ai_speech_start"
  | "ai_speech_end"
  | "record_start"
  | "record_stop"
  | "text_submit"
  | "hint_requested"
  | "repeat_requested"
  | "session_end";

export interface SessionEvent {
  type: SessionEventType;
  at: string;
  /** e.g. recording duration in ms for record_stop */
  value?: number;
}

export interface PilotReflection {
  feedbackClear: "yes" | "somewhat" | "no" | null;
  wantAnother: "yes" | "maybe" | "no" | null;
  vsGenericChat: string;
}

export interface PracticeSession {
  id: string;
  scenarioId: string;
  comfortLevel: ComfortLevel;
  mode: AiMode;
  status: "in_progress" | "completed" | "ended_early";
  startedAt: string;
  endedAt: string | null;
  confidenceBefore: number | null;
  confidenceAfter: number | null;
  turns: ConversationTurn[];
  /** Number of learner turns — kept even when transcripts are not stored. */
  userTurnCount: number;
  events: SessionEvent[];
  feedback: FeedbackResponse | null;
  reflection: PilotReflection | null;
}

export type MissionStatus = "pending" | "tried" | "not_yet" | "try_again";

export interface Mission {
  id: string;
  sessionId: string;
  scenarioId: string;
  text: string;
  status: MissionStatus;
  reflection: string;
  createdAt: string;
  updatedAt: string;
}

export interface SavedPhrase {
  id: string;
  phrase: string;
  context: string;
  scenarioId: string | null;
  savedAt: string;
}

export interface ProgressSnapshot {
  profile: Profile | null;
  sessions: PracticeSession[];
  missions: Mission[];
  phrases: SavedPhrase[];
}
