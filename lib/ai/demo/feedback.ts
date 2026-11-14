import type { ComfortLevel, PlayableScenario } from "@/lib/scenarios/catalog";
import type { FeedbackResult, HistoryMessage } from "../contract";
import { CLOSING, POLITE, RETURNED_QUESTION, parseOrder } from "./order";

/**
 * DEMO MODE feedback — simple, transparent rules applied to the learner's ACTUAL transcript.
 * It only praises or suggests things it can detect in what they said (no invented problems),
 * and the UI labels it "rule-based sample feedback", not AI coaching.
 */
export function demoFeedback(scenario: PlayableScenario, _level: ComfortLevel, history: HistoryMessage[]): FeedbackResult {
  const user = history.filter((m) => m.speaker === "user").map((m) => m.text);
  const firstReply = user[0] ?? "";
  const orderTurn = user.find((t) => parseOrder([t]).drink) ?? null;
  const surpriseIdx = history.findIndex((m) => m.speaker === "ai" && /ran out|out of|heads-up|for here or to go|wait/i.test(m.text));
  const surpriseReply = surpriseIdx >= 0 ? history.slice(surpriseIdx + 1).find((m) => m.speaker === "user")?.text ?? null : null;
  const politeTurn = user.find((t) => POLITE.test(t)) ?? null;
  const lastTurn = user.at(-1) ?? "";

  const checks = {
    responded: firstReply.trim().split(/\s+/).length >= 1 && firstReply.length > 0,
    returned: user.slice(0, 2).some((t) => RETURNED_QUESTION.test(t)),
    ordered: Boolean(orderTurn),
    polite: Boolean(politeTurn),
    handled: Boolean(surpriseReply),
    closed: CLOSING.test(lastTurn),
  };

  const wentWell: FeedbackResult["wentWell"] = [];
  const improve: FeedbackResult["improve"] = [];
  const alternatives: FeedbackResult["alternatives"] = [];

  if (checks.returned)
    wentWell.push({ title: "You returned the question", detail: "Asking back keeps small talk balanced and friendly — exactly what the barista expects.", quote: user.slice(0, 2).find((t) => RETURNED_QUESTION.test(t)) ?? null });
  else if (checks.responded)
    wentWell.push({ title: "You answered the greeting", detail: "You responded to the opening small talk instead of skipping straight to the order.", quote: firstReply });

  if (checks.ordered) wentWell.push({ title: "You placed your order clearly", detail: "The barista understood what you wanted.", quote: orderTurn });
  if (checks.polite && wentWell.length < 4) wentWell.push({ title: "You sounded friendly", detail: "Words like “please” and “thanks” make a quick interaction feel warm.", quote: politeTurn });
  if (checks.handled && wentWell.length < 4) wentWell.push({ title: "You handled the surprise", detail: "When something unexpected came up, you kept the conversation moving.", quote: surpriseReply });
  if (checks.closed && wentWell.length < 4) wentWell.push({ title: "You closed politely", detail: "Ending with thanks leaves a good impression.", quote: lastTurn });
  if (!wentWell.length) wentWell.push({ title: "You practiced out loud", detail: "Showing up and speaking is the hardest part — and you did it.", quote: firstReply || null });

  if (!checks.returned) {
    improve.push({ title: "Return the question", detail: "“How's your day going?” is a greeting. A short answer plus a question back is all that's expected.", tryThis: "Pretty good, thanks! How about you?" });
    alternatives.push({ context: "Answering the barista's greeting", youSaid: firstReply || null, alternative: "Pretty good, thanks! How about you?", why: "Short, warm, and returns the question — the usual pattern in US cafés." });
  }
  if (checks.ordered && orderTurn && !/\b(could|can|may) i\b|\bi'?d like\b|\bi'?ll (have|get|take)\b/i.test(orderTurn))
    alternatives.push({ context: "Placing your order", youSaid: orderTurn, alternative: "Could I get a medium latte, please?", why: "“Could I get…” is a relaxed, polite way to order in the US." });
  if (!checks.ordered)
    improve.push({ title: "Name the drink and size together", detail: "Saying the whole order in one sentence makes it quick and easy for the barista.", tryThis: "Can I get a medium latte, please?" });
  if (surpriseIdx >= 0 && !checks.handled)
    improve.push({ title: "Respond to the surprise", detail: "When something is unavailable, a quick, flexible answer keeps things easy.", tryThis: "No worries — what would you recommend instead?" });
  if (!checks.closed && improve.length < 3) {
    improve.push({ title: "Close with a thank-you", detail: "A short goodbye ends the interaction warmly.", tryThis: "Thanks so much — have a good one!" });
    alternatives.push({ context: "Ending the conversation", youSaid: lastTurn || null, alternative: "Thanks so much — have a good one!", why: "A friendly, common way to say goodbye to service staff." });
  }
  if (!alternatives.length)
    alternatives.push({ context: "Next time, to add a little small talk", youSaid: null, alternative: "It smells amazing in here!", why: "A light comment like this is an easy way to be friendly without pressure." });

  const strong = Object.values(checks).filter(Boolean).length;
  return {
    summary:
      strong >= 5
        ? "You moved through the whole café conversation smoothly — greeting, order, surprise and goodbye."
        : strong >= 3
          ? "You completed the order and kept the conversation going. A couple of small additions will make it feel even more natural."
          : "You got through your first café conversation — that's real progress. Here are a few small things to try next time.",
    wentWell: wentWell.slice(0, 4),
    improve: improve.slice(0, 3),
    alternatives: alternatives.slice(0, 4),
    reflection: { title: scenario.conventionTip.title, body: scenario.conventionTip.body },
  };
}
