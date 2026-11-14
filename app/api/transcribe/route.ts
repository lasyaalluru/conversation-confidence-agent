import { NextResponse } from "next/server";
import type { TranscribeResponse } from "@/lib/ai/contract";
import { MODELS, getOpenAI } from "@/lib/ai/openai";
import { aiFailure, apiError, checkRateLimit } from "@/lib/server/http";

// POST /api/transcribe — multipart/form-data { audio: File } → { text, mode }
//
// Privacy: the audio is forwarded to the speech-to-text provider and then discarded.
// It is never written to disk or a database.

const MAX_BYTES = 8 * 1024 * 1024; // ~several minutes of compressed speech
const ALLOWED = /^audio\/(webm|mp4|mpeg|mpga|m4a|ogg|wav|x-m4a|aac)/;

export async function POST(request: Request) {
  const limited = checkRateLimit(request, "transcribe", 20);
  if (limited) return limited;

  if (Number(request.headers.get("content-length") ?? 0) > MAX_BYTES + 64 * 1024) {
    return apiError("too_large", "That recording is too long. Try a shorter answer.");
  }

  const form = await request.formData().catch(() => null);
  const audio = form?.get("audio");
  if (!(audio instanceof File)) return apiError("invalid_request", "No audio received.");
  if (audio.size < 800) return apiError("empty_audio", "That recording was too short — hold the mic a little longer.");
  if (audio.size > MAX_BYTES) return apiError("too_large", "That recording is too long. Try a shorter answer.");
  if (audio.type && !ALLOWED.test(audio.type)) return apiError("invalid_request", "Unsupported audio format.");

  const openai = getOpenAI();
  if (!openai) {
    // Server transcription needs OpenAI. Clients use the browser's speech recognition otherwise
    // (see /api/status → transcription:false), so this is only reached by stale clients.
    return apiError("ai_unavailable", "Server transcription isn't enabled. Please use your browser's voice input or type your reply.");
  }

  try {
    const result = await openai.audio.transcriptions.create({
      file: audio,
      model: MODELS.transcribe,
      language: "en",
      // A light hint improves recognition of café vocabulary across accents.
      prompt: "A customer talking with a barista in a café. Latte, cappuccino, oat milk, cold brew, for here or to go.",
    });
    const text = result.text.trim();
    if (!text) return apiError("empty_audio", "We didn't catch anything. Try again a bit closer to the mic, or type your reply.");
    return NextResponse.json<TranscribeResponse>({ text, mode: "live" });
  } catch (err) {
    return aiFailure(err, "transcribe");
  }
}
