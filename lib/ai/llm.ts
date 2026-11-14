import "server-only";
import { getOpenAI, MODELS } from "./openai";
import { cohereCompleteJson } from "./providers/cohere";

/**
 * Provider-agnostic "give me JSON matching this schema" call.
 *
 *  - OPENAI_API_KEY  → OpenAI Responses API (also enables server-side voice transcription)
 *  - COHERE_API_KEY  → Cohere Chat v2 (free trial keys work; voice uses the browser's recognition)
 *  - neither         → Demo Mode (handled by the caller)
 *
 * If both keys are set, AI_PROVIDER=openai|cohere picks one (default: openai).
 * The caller ALWAYS re-validates the returned JSON with zod.
 */
export type Provider = "openai" | "cohere";

export function activeProvider(): Provider | null {
  const hasOpenAI = Boolean(process.env.OPENAI_API_KEY);
  const hasCohere = Boolean(process.env.COHERE_API_KEY);
  const preferred = process.env.AI_PROVIDER;
  if (preferred === "cohere" && hasCohere) return "cohere";
  if (preferred === "openai" && hasOpenAI) return "openai";
  if (hasOpenAI) return "openai";
  if (hasCohere) return "cohere";
  return null;
}

export function providerModel(kind: "conversation" | "feedback"): string {
  if (activeProvider() === "cohere") return process.env.COHERE_MODEL || "command-a-03-2025";
  return MODELS[kind];
}

export async function completeJson(params: {
  model: string;
  instructions: string;
  input: string;
  name: string;
  schema: object;
}): Promise<string> {
  const provider = activeProvider();
  if (provider === "cohere") {
    return cohereCompleteJson({ ...params, apiKey: process.env.COHERE_API_KEY! });
  }
  const openai = getOpenAI();
  if (!openai) throw new Error("No AI provider is configured");
  const response = await openai.responses.create({
    model: params.model,
    instructions: params.instructions,
    input: params.input,
    text: { format: { type: "json_schema", name: params.name, schema: params.schema as Record<string, unknown>, strict: true } },
  });
  return response.output_text ?? "";
}
