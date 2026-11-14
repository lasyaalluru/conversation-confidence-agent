import "server-only";
import type { ZodType } from "zod";
import type { ComfortLevel, PlayableScenario } from "@/lib/scenarios/catalog";
import { MalformedAiOutput } from "@/lib/server/http";
import {
  FEEDBACK_JSON_SCHEMA,
  FEEDBACK_VERSION,
  FeedbackResult,
  TURN_JSON_SCHEMA,
  TurnResult,
  type ConversationResponse,
  type FeedbackResponse,
  type HistoryMessage,
} from "./contract";
import { demoFeedback } from "./demo/feedback";
import { demoTurn } from "./demo/barista";
import { getOpenAI, MODELS } from "./openai";
import {
  applyCompletionRules,
  buildConversationInput,
  buildConversationInstructions,
  buildFeedbackInput,
  buildFeedbackInstructions,
} from "./prompts";

/**
 * AI orchestration. One conversational agent + a separate evaluator — no multi-agent framework.
 * Live mode uses OpenAI structured outputs and re-validates every response with zod.
 * Demo mode (no API key) uses the isolated deterministic implementations in ./demo.
 */

async function structured<T>(params: {
  model: string;
  instructions: string;
  input: string;
  name: string;
  schema: object;
  validator: ZodType<T>;
}): Promise<T> {
  const openai = getOpenAI();
  if (!openai) throw new Error("OpenAI is not configured");
  // One retry on malformed output (network retries are handled by the SDK).
  for (let attempt = 0; attempt < 2; attempt++) {
    const response = await openai.responses.create({
      model: params.model,
      instructions: params.instructions,
      input: params.input,
      text: { format: { type: "json_schema", name: params.name, schema: params.schema as Record<string, unknown>, strict: true } },
    });
    const raw = response.output_text;
    if (!raw?.trim()) continue;
    try {
      const parsed = params.validator.safeParse(JSON.parse(raw));
      if (parsed.success) return parsed.data;
      console.warn(`[agent] ${params.name} failed validation`, parsed.error.issues.slice(0, 3));
    } catch {
      console.warn(`[agent] ${params.name} returned non-JSON output`);
    }
  }
  throw new MalformedAiOutput(`${params.name}: no valid output after retry`);
}

export async function generateTurn(params: {
  scenario: PlayableScenario;
  level: ComfortLevel;
  stage: string;
  history: HistoryMessage[];
}): Promise<ConversationResponse> {
  const { scenario, level, stage, history } = params;
  const userTurns = history.filter((m) => m.speaker === "user").length;

  if (!getOpenAI()) {
    const turn = demoTurn(scenario, level, stage, history);
    return { ...applyCompletionRules(turn, scenario, stage, userTurns), mode: "demo" };
  }

  const turn = await structured({
    model: MODELS.conversation,
    instructions: buildConversationInstructions(scenario, level),
    input: buildConversationInput(history, stage, scenario),
    name: "conversation_turn",
    schema: TURN_JSON_SCHEMA(
      scenario.stages.map((s) => s.id),
      scenario.objectives.map((o) => o.id),
    ),
    validator: TurnResult,
  });
  return { ...applyCompletionRules(turn, scenario, stage, userTurns), mode: "live" };
}

export async function generateFeedback(params: {
  scenario: PlayableScenario;
  level: ComfortLevel;
  history: HistoryMessage[];
}): Promise<FeedbackResponse> {
  const { scenario, level, history } = params;
  if (!getOpenAI()) {
    return { ...demoFeedback(scenario, level, history), mode: "demo", version: FEEDBACK_VERSION };
  }
  const result = await structured({
    model: MODELS.feedback,
    instructions: buildFeedbackInstructions(scenario, level),
    input: buildFeedbackInput(history, scenario),
    name: "conversation_feedback",
    schema: FEEDBACK_JSON_SCHEMA,
    validator: FeedbackResult,
  });
  return { ...result, mode: "live", version: FEEDBACK_VERSION };
}
