import { NextResponse } from "next/server";
import { generateTurn } from "@/lib/agent";
import { isLanguage } from "@/lib/scenarios";
import type { ConversationTurnRequest } from "@/types";

// POST /api/conversation-turn
// Body: ConversationTurnRequest → ConversationTurnResponse
export async function POST(request: Request) {
  let body: ConversationTurnRequest;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  if (!body.scenarioId || !isLanguage(body.practiceLanguage) || !Array.isArray(body.history)) {
    return NextResponse.json({ error: "scenarioId, practiceLanguage and history are required" }, { status: 400 });
  }

  try {
    const turn = await generateTurn({
      scenarioId: body.scenarioId,
      practiceLanguage: body.practiceLanguage,
      stage: body.stage ?? "greeting",
      history: body.history.slice(-30),
    });
    return NextResponse.json(turn);
  } catch (err) {
    console.error("[conversation-turn]", err);
    return NextResponse.json({ error: "The AI partner couldn't respond. Please try again." }, { status: 502 });
  }
}
