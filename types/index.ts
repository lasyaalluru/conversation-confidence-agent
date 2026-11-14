// Shared types used by the frontend, the API routes and the agent.
// If you change a shape here, check every place that imports it.

/** Languages the app supports — for both the interface and practice. */
export type Language = "en" | "zh-CN";

/** Where a role-play conversation currently is. The agent moves through these in order. */
export type ScenarioStage =
  | "greeting"
  | "ordering"
  | "unexpected_question"
  | "closing"
  | "completed";

export type Difficulty = "beginner" | "intermediate" | "advanced";

/** Scenario content for ONE practice language. */
export interface ScenarioContent {
  /** Character the AI plays, e.g. "Friendly barista". */
  aiRole: string;
  /** Short setting description given to the AI. */
  setting: string;
  /** The AI's first line — spoken as soon as practice starts. */
  openingLine: string;
  /** What the learner should practice. Used by the agent and the evaluator. */
  objectives: string[];
  /** The small complication the AI should introduce. */
  complication: string;
  /** Cultural/conversational norms for this language (not just a translation!). */
  culturalNotes: string[];
  /** Real-world mission shown after the session. */
  mission: string;
}

export interface Scenario {
  id: string;
  difficulty: Difficulty;
  /** i18n key prefix in messages/*.json → scenarios.<id>.title / .description / .category */
  i18nKey: string;
  /** false = shown as "Coming soon". */
  available: boolean;
  /** Practice-language-specific content. Missing language = not offered in that language yet. */
  content: Partial<Record<Language, ScenarioContent>>;
}

export interface ChatMessage {
  role: "ai" | "user";
  text: string;
}

// ---------- API contracts ----------

export interface ConversationTurnRequest {
  scenarioId: string;
  practiceLanguage: Language;
  stage: ScenarioStage;
  history: ChatMessage[];
}

export interface ConversationTurnResponse {
  reply: string;
  stage: ScenarioStage;
  isComplete: boolean;
  mock?: boolean;
}

export interface FeedbackRequest {
  scenarioId: string;
  practiceLanguage: Language;
  /** Feedback is written in the learner's interface language. */
  uiLanguage: Language;
  history: ChatMessage[];
}

export interface FeedbackItem {
  skill: string;
  rating: "strong" | "developing" | "try_next_time";
  comment: string;
  /** Optional better phrase the learner could use next time (in the practice language). */
  suggestedPhrase: string | null;
}

export interface Feedback {
  summary: string;
  items: FeedbackItem[];
  usefulPhrases: string[];
  mock?: boolean;
}

export interface TranscribeResponse {
  text: string;
  mock?: boolean;
}

// ---------- Progress (saved locally for now; Supabase later) ----------

export interface PracticeSession {
  id: string;
  scenarioId: string;
  practiceLanguage: Language;
  startedAt: string;
  confidenceBefore: number | null;
  confidenceAfter: number | null;
  turns: number;
  feedback: Feedback | null;
  mission: string;
  missionStatus: "pending" | "tried" | "skipped";
}
