import "server-only";
import OpenAI from "openai";

/**
 * Server-only OpenAI client. NEVER import this from a "use client" component —
 * the `server-only` import above will make the build fail if you try.
 *
 * Returns null when OPENAI_API_KEY isn't set, so the app can run in "mock mode"
 * (scripted replies) for teammates who don't have a key yet.
 */
let client: OpenAI | null | undefined;

export function getOpenAI(): OpenAI | null {
  if (client !== undefined) return client;
  const apiKey = process.env.OPENAI_API_KEY;
  client = apiKey ? new OpenAI({ apiKey }) : null;
  return client;
}

export const MODELS = {
  /** Role-play conversation model. Small + fast is better for back-and-forth. */
  conversation: process.env.OPENAI_CONVERSATION_MODEL || "gpt-5.4-mini",
  /** Post-session feedback model. Can be larger since it runs once per session. */
  feedback: process.env.OPENAI_FEEDBACK_MODEL || "gpt-5.4-mini",
  /** Speech-to-text model. */
  transcribe: process.env.OPENAI_TRANSCRIBE_MODEL || "gpt-transcribe",
};
