import { NextResponse } from "next/server";
import { generateFeedback } from "@/lib/ai/agent";
import { FeedbackRequest } from "@/lib/ai/contract";
import { getPlayableScenario } from "@/lib/scenarios/catalog";
import { TooLargeError, aiFailure, apiError, checkRateLimit, readJson } from "@/lib/server/http";

// POST /api/feedback — structured post-conversation feedback (separate evaluator).
// Body: FeedbackRequest → FeedbackResponse
export async function POST(request: Request) {
  const limited = checkRateLimit(request, "feedback", 10);
  if (limited) return limited;

  let body: unknown;
  try {
    body = await readJson(request, 96 * 1024);
  } catch (e) {
    return e instanceof TooLargeError
      ? apiError("too_large", "Conversation is too long.")
      : apiError("invalid_request", "Invalid JSON body.");
  }

  const parsed = FeedbackRequest.safeParse(body);
  if (!parsed.success) return apiError("invalid_request", "Invalid feedback request.");
  const { scenarioId, comfortLevel, history } = parsed.data;

  const scenario = getPlayableScenario(scenarioId);
  if (!scenario) return apiError("invalid_request", "That scenario isn't available yet.");
  if (!history.some((m) => m.speaker === "user")) return apiError("invalid_request", "There's nothing to give feedback on yet.");

  try {
    return NextResponse.json(await generateFeedback({ scenario, level: comfortLevel, history }));
  } catch (err) {
    return aiFailure(err, "feedback");
  }
}
