import "server-only";
import OpenAI from "openai";
import type { AiMode } from "./contract";

/**
 * Server-only OpenAI client. `server-only` makes the build fail if a client component imports this,
 * so the API key can never reach the browser.
 */
let client: OpenAI | null | undefined;

export function getOpenAI(): OpenAI | null {
  if (client !== undefined) return client;
  const apiKey = process.env.OPENAI_API_KEY;
  client = apiKey ? new OpenAI({ apiKey, timeout: 25_000, maxRetries: 1 }) : null;
  return client;
}

/** "live" when an AI key (OpenAI or Cohere) is configured, otherwise the clearly-labeled demo mode. */
export function aiMode(): AiMode {
  return process.env.OPENAI_API_KEY || process.env.COHERE_API_KEY ? "live" : "demo";
}

export const MODELS = {
  conversation: process.env.OPENAI_CONVERSATION_MODEL || "gpt-5.4-mini",
  feedback: process.env.OPENAI_FEEDBACK_MODEL || "gpt-5.4-mini",
  transcribe: process.env.OPENAI_TRANSCRIBE_MODEL || "gpt-transcribe",
};
