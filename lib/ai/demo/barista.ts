import type { ComfortLevel, PlayableScenario } from "@/lib/scenarios/catalog";
import type { HistoryMessage, TurnResult } from "../contract";
import { MILK_DRINKS, RETURNED_QUESTION, describeOrder, extractName, parseOrder } from "./order";

/**
 * DEMO MODE barista — deterministic, scripted, and clearly labeled in the UI as not live AI.
 * It follows the same stage machine and response contract as the live agent, parses the
 * learner's order so it can remember it, and adapts wording by comfort level.
 */

const ASK_ORDER: Record<ComfortLevel, string> = {
  1: "What would you like to drink today?",
  2: "What can I get started for you?",
  3: "So what are we having today — something to wake you up?",
};

const HINTS = {
  greeting: { 1: "Good, thanks! How about you?", 2: "Pretty good, thanks! How's your morning going?", 3: "Honestly, pretty good — busy morning on your end?" },
  ordering: { 1: "Could I get a medium latte, please?", 2: "Can I get a medium oat milk latte, please?", 3: "Hmm, what would you recommend?" },
  size: { 1: "A medium, please.", 2: "Medium, please.", 3: "Let's go with a large — it's that kind of day." },
  milk: { 1: "Regular milk, please.", 2: "Oat milk, please.", 3: "Oat milk if you have it, thanks." },
  complication: { 1: "For here, please.", 2: "Oh, no worries — almond milk works!", 3: "I'll try the cold brew — thanks for the tip!" },
  closing: { 1: "It's Mei. Thank you!", 2: "It's Arjun — thanks so much!", 3: "It's Lucas. Thanks, have a good one!" },
} as const;

function complicationLine(level: ComfortLevel, order: ReturnType<typeof parseOrder>): string {
  if (level === 1) return "Perfect. Is that for here or to go?";
  if (level === 2) {
    if (order.milk === "oat")
      return "Oh, I'm so sorry — we just ran out of oat milk. Would almond milk or regular milk work instead?";
    return `Oh, sorry — we just ran out of ${order.size === "large" ? "large" : order.size ?? "medium"} cups. Is it okay if I make it a different size, same price?`;
  }
  const espressoBased = order.drink ? !["cold brew", "tea", "coffee", "hot chocolate"].includes(order.drink) : true;
  return espressoBased
    ? "Quick heads-up — our espresso machine is acting up, so that's about a ten-minute wait. Want to wait, or try our cold brew instead? It's honestly my favorite."
    : `Ah, we're actually out of the ${order.drink} until lunch. Want to try our maple latte instead, or something else?`;
}

function complicationAck(level: ComfortLevel, lastUser: string): string {
  const t = lastUser.toLowerCase();
  if (level === 1) return /to go|take ?away|takeout/.test(t) ? "To go, got it." : "For here, perfect.";
  if (/\b(no|nah|not really|never ?mind)\b/.test(t) && !/no worries|no problem/.test(t)) return "Totally understand.";
  if (/almond|regular|whole|soy|sure|okay|ok|fine|works|yes|yeah|great|cold brew|wait|maple|that's okay|no worries|no problem/.test(t))
    return level === 3 ? "Good call — you won't regret it." : "Great, I'll take care of that.";
  return "Sounds good.";
}

export function demoTurn(scenario: PlayableScenario, level: ComfortLevel, stage: string, history: HistoryMessage[]): TurnResult {
  const userTexts = history.filter((m) => m.speaker === "user").map((m) => m.text);
  const lastUser = userTexts.at(-1) ?? "";
  const userTurns = userTexts.length;
  const order = parseOrder(userTexts);
  const turn = (reply: string, scenarioStage: string, hint: string | null, learningObjective: string | null, isComplete = false): TurnResult => ({
    reply,
    scenarioStage,
    isComplete,
    hint,
    learningObjective,
  });

  // Final close (also used as a safety net when the conversation runs long).
  const close = () => {
    const name = stage === "closing" ? extractName(lastUser) : null;
    return turn(
      `${name ? `Thanks, ${name}!` : "Thank you so much!"} Your ${describeOrder(order)} will be ready at the end of the counter. Have a great day!`,
      "completed",
      null,
      null,
      true,
    );
  };
  if (userTurns >= scenario.completion.maxUserTurns) return close();

  // What's still missing from the order?
  const followUp = (): TurnResult => {
    if (!order.drink) return turn(ASK_ORDER[level], "ordering", HINTS.ordering[level], "make_request");
    if (!order.size && order.drink !== "espresso")
      return turn(`${order.drink === "coffee" ? "Coffee" : `A ${order.drink}`}, great choice. What size would you like — small, medium or large?`, "follow_up", HINTS.size[level], "make_request");
    if (order.drink && MILK_DRINKS.has(order.drink) && !order.milk)
      return turn(`${order.size ? `${order.size[0].toUpperCase()}${order.size.slice(1)} ${order.drink}` : `A ${order.drink}`}, got it. Would you like regular milk or oat milk?`, "follow_up", HINTS.milk[level], "make_request");
    return turn(complicationLine(level, order), "complication", HINTS.complication[level], "handle_surprise");
  };

  switch (stage) {
    case "greeting": {
      const opener = RETURNED_QUESTION.test(lastUser) ? "I'm doing great, thanks for asking!" : "Glad to hear it!";
      if (order.drink) return { ...followUp(), reply: `${opener} ${followUp().reply}` };
      return turn(`${opener} ${ASK_ORDER[level]}`, "ordering", HINTS.ordering[level], "make_request");
    }
    case "ordering": {
      if (order.drink) return followUp();
      if (/recommend|suggest|popular|favorite|best/.test(lastUser.toLowerCase()))
        return turn("Our oat milk latte is really popular right now. Want to try that?", "ordering", "Sure, I'll try that!", "make_request");
      if (/\b(yes|sure|okay|ok|yeah|sounds good)\b/i.test(lastUser) && userTurns >= 2) {
        order.drink = "latte";
        order.milk = order.milk ?? "oat";
        return followUp();
      }
      return turn(
        level === 1
          ? "No problem! We have lattes, cappuccinos, drip coffee or tea. What sounds good?"
          : "No rush! We've got espresso drinks, cold brew, tea — anything sound good?",
        "ordering",
        HINTS.ordering[level],
        "make_request",
      );
    }
    case "follow_up":
      return followUp();
    case "complication":
      return turn(`${complicationAck(level, lastUser)} Can I get a name for the order?`, "closing", HINTS.closing[level], "close_politely");
    case "closing":
    default:
      return close();
  }
}
