import { NextResponse } from "next/server";
import { aiMode } from "@/lib/ai/openai";

// GET /api/status — lets the UI label Demo Mode BEFORE a conversation starts.
// Exposes only whether AI is configured, never any key material.
export function GET() {
  const mode = aiMode();
  return NextResponse.json({ mode, transcription: mode === "live" });
}
