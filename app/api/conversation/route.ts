import { NextResponse } from "next/server";
import { generateTurn } from "@/lib/ai/agent";
import { ConversationRequest } from "@/lib/ai/contract";
import { getPlayableScenario } from "@/lib/scenarios/catalog";
import { TooLargeError, aiFailure, apiError, checkRateLimit, readJson } from "@/lib/server/http";

// POST /api/conversation — next AI turn for a scenario.
// Body: ConversationRequest → ConversationResponse (see lib/ai/contract.ts)
export async function POST(request: Request) {
  const limited = checkRateLimit(request, "conversation", 30);
  if (limited) return limited;

  let body: unknown;
  try {
    body = await readJson(request);
  } catch (e) {
    return e instanceof TooLargeError
      ? apiError("too_large", "Conversation is too long.")
      : apiError("invalid_request", "Invalid JSON body.");
  }

  const parsed = ConversationRequest.safeParse(body);
  if (!parsed.success) return apiError("invalid_request", "Invalid conversation request.");
  const { scenarioId, comfortLevel, stage, history } = parsed.data;

  const scenario = getPlayableScenario(scenarioId);
  if (!scenario) return apiError("invalid_request", "That scenario isn't available yet.");
  if (!scenario.stages.some((s) => s.id === stage)) return apiError("invalid_request", "Unknown scenario stage.");

  try {
    const turn = await generateTurn({ scenario, level: comfortLevel, stage, history });
    return NextResponse.json(turn);
  } catch (err) {
    return aiFailure(err, "conversation");
  }
}
