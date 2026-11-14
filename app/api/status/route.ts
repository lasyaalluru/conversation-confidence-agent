import { NextResponse } from "next/server";
import { aiMode } from "@/lib/ai/openai";

// GET /api/status — lets the UI label Demo Mode BEFORE a conversation starts.
// Exposes only whether AI is configured, never any key material.
export function GET() {
  // Server transcription needs OpenAI. With Cohere (or no key) the browser's speech recognition is used.
  return NextResponse.json({ mode: aiMode(), transcription: Boolean(process.env.OPENAI_API_KEY) });
}
