import { NextResponse } from "next/server";
import { generateFeedback } from "@/lib/agent";
import { isLanguage } from "@/lib/scenarios";
import type { FeedbackRequest } from "@/types";

// POST /api/feedback
// Body: FeedbackRequest → Feedback (structured JSON, see types/index.ts)
export async function POST(request: Request) {
  let body: FeedbackRequest;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  if (
    !body.scenarioId ||
    !isLanguage(body.practiceLanguage) ||
    !isLanguage(body.uiLanguage) ||
    !Array.isArray(body.history)
  ) {
    return NextResponse.json(
      { error: "scenarioId, practiceLanguage, uiLanguage and history are required" },
      { status: 400 },
    );
  }

  try {
    const feedback = await generateFeedback({ ...body, history: body.history.slice(-40) });
    return NextResponse.json(feedback);
  } catch (err) {
    console.error("[feedback]", err);
    return NextResponse.json({ error: "Couldn't generate feedback. Please try again." }, { status: 502 });
  }
}
