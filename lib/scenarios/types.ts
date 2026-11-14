// Scenario data model. Scenarios are plain data — the agent, UI and recommendations all
// read from this shape, so adding a scenario never requires rewriting components.

/** Self-selected speaking COMFORT level — not a grammar/CEFR proficiency level. */
export type ComfortLevel = 1 | 2 | 3;

export type CategoryId = "everyday" | "social" | "group" | "academic" | "professional";

export type GoalId =
  | "everyday"
  | "small_talk"
  | "friends"
  | "classroom"
  | "group_discussion"
  | "professional"
  | "networking"
  | "interviews_presentations";

export interface Category {
  id: CategoryId;
  title: string;
  /** One line that frames the category for learners. */
  tagline: string;
  /** Position on the confidence ladder (1 = lowest stakes). */
  ladderStep: number;
}

export interface StageDefinition {
  id: string;
  /** What should happen in this stage — given to the AI. */
  goal: string;
}

export interface Objective {
  id: string;
  label: string;
}

export interface LevelConfig {
  /** First line the AI character speaks. */
  openingLine: string;
  /** Level-specific behavior rules for the AI. */
  aiInstructions: string[];
  /** The kind of curveball to introduce at this level. */
  complication: string;
  /** Browser speech-synthesis rate (1 = normal). */
  speechRate: number;
  /** How hints are offered in the UI. */
  hints: "offered" | "on_request" | "minimal";
  /** Mission shown after the session. */
  mission: string;
}

interface ScenarioBase {
  id: string;
  title: string;
  category: CategoryId;
  summary: string;
  /** Goals this scenario helps with (used by recommendations). */
  goals: GoalId[];
}

export interface PlayableScenario extends ScenarioBase {
  status: "available";
  estimatedMinutes: number;
  setting: string;
  character: { name: string; role: string; personality: string };
  /** A short note on the unwritten American convention for this situation. */
  conventionTip: { title: string; body: string; pattern: string[] };
  /** Ordered stages; the last one must be "completed". */
  stages: StageDefinition[];
  objectives: Objective[];
  levels: Record<ComfortLevel, LevelConfig>;
  completion: {
    /** Never end before this many learner turns (unless the learner ends it). */
    minUserTurns: number;
    /** Force a graceful close after this many learner turns. */
    maxUserTurns: number;
  };
  /** Phrases worth practicing in this scenario. */
  usefulPhrases: string[];
}

export interface PreviewScenario extends ScenarioBase {
  status: "coming_soon";
}

export type Scenario = PlayableScenario | PreviewScenario;

export function isPlayable(s: Scenario | undefined): s is PlayableScenario {
  return s?.status === "available";
}
