import { NextResponse } from "next/server";
import { getOpenAI, MODELS } from "@/lib/openai";
import { isLanguage } from "@/lib/scenarios";

// POST /api/transcribe
// multipart/form-data: { audio: File, language: "en" | "zh-CN" } → { text }
//
// Privacy: audio is forwarded to the transcription service and NOT stored.

const MAX_BYTES = 10 * 1024 * 1024; // 10 MB ≈ several minutes of speech

export async function POST(request: Request) {
  const form = await request.formData().catch(() => null);
  const audio = form?.get("audio");
  const language = form?.get("language");

  if (!(audio instanceof File) || audio.size === 0) {
    return NextResponse.json({ error: "No audio received" }, { status: 400 });
  }
  if (audio.size > MAX_BYTES) {
    return NextResponse.json({ error: "Recording is too long" }, { status: 413 });
  }

  const openai = getOpenAI();
  if (!openai) {
    return NextResponse.json({
      text: language === "zh-CN" ? "你好，我要一杯中杯拿铁，谢谢。" : "Hi! Can I get a medium latte, please?",
      mock: true,
    });
  }

  try {
    const result = await openai.audio.transcriptions.create({
      file: audio,
      model: MODELS.transcribe,
      // ISO-639-1 hint improves accuracy; omit to let the model auto-detect (useful for code-switching).
      ...(isLanguage(language) ? { language: language === "zh-CN" ? "zh" : "en" } : {}),
    });
    return NextResponse.json({ text: result.text });
  } catch (err) {
    console.error("[transcribe]", err);
    return NextResponse.json({ error: "Couldn't transcribe audio. Please try again." }, { status: 502 });
  }
}
