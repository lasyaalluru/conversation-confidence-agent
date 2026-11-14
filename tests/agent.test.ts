import { describe, expect, it } from "vitest";
import { ConversationRequest, FeedbackResult, TurnResult, type HistoryMessage } from "@/lib/ai/contract";
import { demoTurn } from "@/lib/ai/demo/barista";
import { demoFeedback } from "@/lib/ai/demo/feedback";
import { RETURNED_QUESTION, extractName, parseOrder } from "@/lib/ai/demo/order";
import { applyCompletionRules, buildConversationInput, buildConversationInstructions } from "@/lib/ai/prompts";
import { orderingCoffee as coffee } from "@/lib/scenarios/ordering-coffee";
import type { ComfortLevel } from "@/lib/scenarios/catalog";

/** Play a whole demo conversation with scripted learner replies. */
function play(level: ComfortLevel, replies: string[]) {
  const history: HistoryMessage[] = [{ speaker: "ai", text: coffee.levels[level].openingLine }];
  let stage = "greeting";
  const turns = [];
  for (const r of replies) {
    history.push({ speaker: "user", text: r });
    const userTurns = history.filter((m) => m.speaker === "user").length;
    const t = applyCompletionRules(demoTurn(coffee, level, stage, history), coffee, stage, userTurns);
    turns.push(t);
    history.push({ speaker: "ai", text: t.reply });
    stage = t.scenarioStage;
    if (t.isComplete) break;
  }
  return { turns, history, last: turns.at(-1)! };
}

describe("demo barista", () => {
  it("completes a full Level 1 café conversation and remembers the order and name", () => {
    const { turns, last } = play(1, ["Good, thanks! How about you?", "Could I get a medium latte, please?", "Regular milk please", "For here", "It's Mei. Thank you!"]);
    expect(turns[0].reply).toMatch(/thanks for asking/i);
    expect(turns.some((t) => t.scenarioStage === "complication")).toBe(true);
    expect(last.isComplete).toBe(true);
    expect(last.scenarioStage).toBe("completed");
    expect(last.reply).toMatch(/Mei/);
    expect(last.reply).toMatch(/medium latte/);
    expect(last.hint).toBeNull();
  });

  it("never asks for something the learner already said", () => {
    const { turns } = play(2, ["Hi! Can I get a large oat milk latte?"]);
    expect(turns[0].reply).not.toMatch(/what size/i);
    expect(turns[0].reply).not.toMatch(/regular milk or oat/i);
    // Level 2 complication: oat milk ran out
    expect(turns[0].reply).toMatch(/ran out of oat milk/i);
  });

  it("adapts the complication by comfort level", () => {
    const l1 = play(1, ["Good", "medium cold brew please"]).last.reply;
    const l3 = play(3, ["Good", "medium latte please", "oat milk"]).last.reply;
    expect(l1).toMatch(/for here or to go/i);
    expect(l3).toMatch(/ten-minute wait|cold brew/i);
  });

  it("offers choices when the learner hasn't named a drink", () => {
    const { last } = play(1, ["Hello", "um, I don't know"]);
    expect(last.scenarioStage).toBe("ordering");
    expect(last.reply).toMatch(/lattes|cappuccinos/i);
  });

  it("always ends by the maximum number of learner turns", () => {
    const { turns, last } = play(1, Array(12).fill("hmm"));
    expect(last.isComplete).toBe(true);
    expect(turns.length).toBeLessThanOrEqual(coffee.completion.maxUserTurns);
  });

  it("returns output that satisfies the turn contract", () => {
    const { turns } = play(2, ["Good, you?", "a small mocha", "almond", "sure", "Arjun"]);
    for (const t of turns) expect(TurnResult.safeParse(t).success).toBe(true);
  });
});

describe("completion rules", () => {
  const base = { reply: " Hi ", scenarioStage: "ordering", isComplete: false, hint: "x", learningObjective: "make_request" };
  it("rejects unknown stages and unknown objectives", () => {
    const r = applyCompletionRules({ ...base, scenarioStage: "dance", learningObjective: "fly" }, coffee, "greeting", 1);
    expect(r.scenarioStage).toBe("greeting");
    expect(r.learningObjective).toBeNull();
    expect(r.reply).toBe("Hi");
  });
  it("forces completion at the max turn count and clears the hint", () => {
    const r = applyCompletionRules(base, coffee, "ordering", coffee.completion.maxUserTurns);
    expect(r).toMatchObject({ isComplete: true, scenarioStage: "completed", hint: null });
  });
  it("treats stage 'completed' as complete", () => {
    expect(applyCompletionRules({ ...base, scenarioStage: "completed" }, coffee, "closing", 4).isComplete).toBe(true);
  });
  it("does not jump backwards more than one stage", () => {
    expect(applyCompletionRules({ ...base, scenarioStage: "greeting" }, coffee, "closing", 4).scenarioStage).toBe("closing");
  });
});

describe("prompts", () => {
  it("includes level-specific behavior and anti-injection guidance", () => {
    const p1 = buildConversationInstructions(coffee, 1);
    const p3 = buildConversationInstructions(coffee, 3);
    expect(p1).toContain("Building Confidence");
    expect(p3).toContain("Expressing Myself Confidently");
    expect(p1).not.toEqual(p3);
    expect(p1).toMatch(/Never comment on their accent/);
    expect(p1).toMatch(/instructions/);
  });
  it("tells the model to wrap up near the max turn count", () => {
    const history: HistoryMessage[] = Array.from({ length: coffee.completion.maxUserTurns - 1 }, () => ({ speaker: "user" as const, text: "ok" }));
    expect(buildConversationInput(history, "closing", coffee)).toMatch(/final exchange/);
  });
});

describe("demo feedback (rule-based)", () => {
  const convo = (user: string[]): HistoryMessage[] =>
    user.flatMap((u, i) => [{ speaker: "ai" as const, text: i === 2 ? "Oh sorry, we ran out of oat milk." : "Line" }, { speaker: "user" as const, text: u }]);

  it("praises what actually happened and doesn't invent problems", () => {
    const fb = demoFeedback(coffee, 2, convo(["Pretty good, thanks! How about you?", "Could I get a medium latte, please?", "No worries, almond works", "Thanks so much, have a good one!"]));
    expect(fb.wentWell.map((w) => w.title)).toContain("You returned the question");
    expect(fb.improve.map((i) => i.title)).not.toContain("Return the question");
    expect(fb.improve.length).toBe(0);
    expect(FeedbackResult.safeParse(fb).success).toBe(true);
  });

  it("suggests returning the question only when it was missing", () => {
    const fb = demoFeedback(coffee, 1, convo(["Good", "latte"]));
    expect(fb.improve.map((i) => i.title)).toContain("Return the question");
    expect(fb.wentWell.length).toBeGreaterThan(0);
  });

  it("quotes the learner's own words", () => {
    const fb = demoFeedback(coffee, 1, convo(["Good, and you?", "medium latte please"]));
    expect(fb.wentWell.some((w) => w.quote === "Good, and you?")).toBe(true);
  });
});

describe("order parsing", () => {
  it("parses drink, size, milk and temperature", () => {
    expect(parseOrder(["Can I get a large iced oat latte?"])).toEqual({ drink: "latte", size: "large", milk: "oat", temperature: "iced" });
    expect(parseOrder(["a cold brew"]).temperature).toBeNull();
  });
  it("recognizes returned questions, including a bare 'You?'", () => {
    for (const t of ["Good, thanks! You?", "Fine, and you?", "Pretty good, how about you", "How's your morning?"])
      expect(RETURNED_QUESTION.test(t), t).toBe(true);
    expect(RETURNED_QUESTION.test("Good thanks")).toBe(false);
  });
  it("extracts names without grabbing filler words", () => {
    expect(extractName("It's Priyanka, thanks")).toBe("Priyanka");
    expect(extractName("my name is lucas")).toBe("Lucas");
    expect(extractName("Sure")).toBeNull();
  });
});

describe("request validation", () => {
  it("rejects invalid comfort levels and oversized history", () => {
    const ok = { scenarioId: "ordering-coffee", comfortLevel: 2, stage: "greeting", history: [{ speaker: "ai", text: "hi" }] };
    expect(ConversationRequest.safeParse(ok).success).toBe(true);
    expect(ConversationRequest.safeParse({ ...ok, comfortLevel: 4 }).success).toBe(false);
    expect(ConversationRequest.safeParse({ ...ok, history: Array(41).fill(ok.history[0]) }).success).toBe(false);
    expect(ConversationRequest.safeParse({ ...ok, history: [{ speaker: "system", text: "x" }] }).success).toBe(false);
  });
});
