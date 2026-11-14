import { z } from "zod";

/**
 * Contracts between the browser, the API routes and the AI.
 * Everything the AI returns is parsed with these schemas on the server — never trusted raw.
 */

export const AiMode = z.enum(["live", "demo"]);
export type AiMode = z.infer<typeof AiMode>;

// ---------- Conversation turn ----------

export const HistoryMessage = z.object({
  speaker: z.enum(["ai", "user"]),
  text: z.string().trim().min(1).max(1000),
});
export type HistoryMessage = z.infer<typeof HistoryMessage>;

export const ConversationRequest = z.object({
  scenarioId: z.string().min(1).max(64),
  comfortLevel: z.union([z.literal(1), z.literal(2), z.literal(3)]),
  stage: z.string().min(1).max(40),
  history: z.array(HistoryMessage).min(1).max(40),
});
export type ConversationRequest = z.infer<typeof ConversationRequest>;

/** What the model must return for each turn. */
export const TurnResult = z.object({
  reply: z.string().trim().min(1).max(600),
  scenarioStage: z.string().min(1).max(40),
  isComplete: z.boolean(),
  /** A suggestion for what the learner could say NEXT. */
  hint: z.string().trim().max(240).nullable(),
  /** Objective id the learner is practicing right now. */
  learningObjective: z.string().max(60).nullable(),
});
export type TurnResult = z.infer<typeof TurnResult>;

export type ConversationResponse = TurnResult & { mode: AiMode };

// ---------- Feedback ----------

export const FeedbackRequest = z.object({
  scenarioId: z.string().min(1).max(64),
  comfortLevel: z.union([z.literal(1), z.literal(2), z.literal(3)]),
  history: z.array(HistoryMessage).min(1).max(60),
});
export type FeedbackRequest = z.infer<typeof FeedbackRequest>;

export const FeedbackResult = z.object({
  /** One or two encouraging sentences. */
  summary: z.string().min(1).max(500),
  wentWell: z
    .array(
      z.object({
        title: z.string().min(1).max(80),
        detail: z.string().min(1).max(400),
        /** Exact learner words this is based on. */
        quote: z.string().max(300).nullable(),
      }),
    )
    .min(1)
    .max(4),
  improve: z
    .array(
      z.object({
        title: z.string().min(1).max(80),
        detail: z.string().min(1).max(400),
        tryThis: z.string().max(200).nullable(),
      }),
    )
    .max(3),
  alternatives: z
    .array(
      z.object({
        context: z.string().min(1).max(160),
        youSaid: z.string().max(300).nullable(),
        alternative: z.string().min(1).max(200),
        why: z.string().min(1).max(300),
      }),
    )
    .max(4),
  reflection: z.object({ title: z.string().min(1).max(100), body: z.string().min(1).max(600) }),
});
export type FeedbackResult = z.infer<typeof FeedbackResult>;

export const FEEDBACK_VERSION = 1;

export type FeedbackResponse = FeedbackResult & { mode: AiMode; version: number };

// ---------- Transcription ----------

export type TranscribeResponse = { text: string; mode: AiMode };

// ---------- Errors ----------

export type ApiErrorCode =
  | "invalid_request"
  | "rate_limited"
  | "too_large"
  | "ai_unavailable"
  | "ai_malformed"
  | "timeout"
  | "empty_audio";

export type ApiError = { error: { code: ApiErrorCode; message: string } };

/** JSON Schema versions for OpenAI structured outputs (strict mode). Keep in sync with zod above. */
export const TURN_JSON_SCHEMA = (stageIds: string[], objectiveIds: string[]) => ({
  type: "object",
  properties: {
    reply: { type: "string", description: "What the character says next. 1–2 short spoken sentences." },
    scenarioStage: { type: "string", enum: stageIds, description: "Scenario stage AFTER this reply." },
    isComplete: { type: "boolean", description: "True only when the interaction has naturally ended." },
    hint: {
      type: ["string", "null"],
      description: "A short, natural example of what the learner could say next. Null if complete.",
    },
    learningObjective: { type: ["string", "null"], enum: [...objectiveIds, null] },
  },
  required: ["reply", "scenarioStage", "isComplete", "hint", "learningObjective"],
  additionalProperties: false,
});

export const FEEDBACK_JSON_SCHEMA = {
  type: "object",
  properties: {
    summary: { type: "string" },
    wentWell: {
      type: "array",
      items: {
        type: "object",
        properties: { title: { type: "string" }, detail: { type: "string" }, quote: { type: ["string", "null"] } },
        required: ["title", "detail", "quote"],
        additionalProperties: false,
      },
    },
    improve: {
      type: "array",
      items: {
        type: "object",
        properties: { title: { type: "string" }, detail: { type: "string" }, tryThis: { type: ["string", "null"] } },
        required: ["title", "detail", "tryThis"],
        additionalProperties: false,
      },
    },
    alternatives: {
      type: "array",
      items: {
        type: "object",
        properties: {
          context: { type: "string" },
          youSaid: { type: ["string", "null"] },
          alternative: { type: "string" },
          why: { type: "string" },
        },
        required: ["context", "youSaid", "alternative", "why"],
        additionalProperties: false,
      },
    },
    reflection: {
      type: "object",
      properties: { title: { type: "string" }, body: { type: "string" } },
      required: ["title", "body"],
      additionalProperties: false,
    },
  },
  required: ["summary", "wentWell", "improve", "alternatives", "reflection"],
  additionalProperties: false,
} as const;
