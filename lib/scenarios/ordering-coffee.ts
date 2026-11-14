import type { PlayableScenario } from "./types";

/**
 * The first fully playable scenario. Pattern from the Idea Brief:
 * greet → answer briefly → return the question → order → handle a curveball → thank.
 */
export const orderingCoffee: PlayableScenario = {
  id: "ordering-coffee",
  status: "available",
  title: "Ordering coffee",
  category: "everyday",
  summary: "Greet the barista, place your order, and handle a small surprise — the classic first win.",
  goals: ["everyday", "small_talk"],
  estimatedMinutes: 4,
  setting: "A busy, friendly café near a US university campus on a weekday morning.",
  character: {
    name: "Sam",
    role: "barista",
    personality: "Warm, upbeat, efficient. Makes light small talk while working. Never impatient.",
  },
  conventionTip: {
    title: "“How's your day going?” is a greeting, not a real question.",
    body: "In the US, baristas often open with small talk. A short, friendly answer plus returning the question is all that's expected — then you order.",
    pattern: ["Greet", "Answer briefly", "Return the question", "Order", "Say thanks"],
  },
  stages: [
    { id: "greeting", goal: "Exchange a friendly greeting. Respond warmly if the learner returns the question." },
    { id: "ordering", goal: "Ask what they'd like and help them place an order." },
    { id: "follow_up", goal: "Ask one realistic follow-up about the order (size, milk, hot or iced)." },
    { id: "complication", goal: "Introduce the level's complication once and let the learner respond." },
    { id: "closing", goal: "Wrap up: confirm the order, ask for a name or say it'll be ready soon." },
    { id: "completed", goal: "Say a short, friendly goodbye. The conversation is over." },
  ],
  objectives: [
    { id: "respond_to_greeting", label: "Respond naturally to a greeting" },
    { id: "return_question", label: "Return a friendly question" },
    { id: "make_request", label: "Place a clear, polite order" },
    { id: "handle_surprise", label: "Handle an unexpected question or problem" },
    { id: "close_politely", label: "Close the conversation politely" },
  ],
  levels: {
    1: {
      openingLine: "Hi there! How's your day going?",
      aiInstructions: [
        "Be especially friendly, patient and encouraging.",
        "Use short, simple sentences and common words. One question at a time.",
        "If the learner seems stuck or gives a very short answer, gently offer simple choices (e.g. 'We have lattes, cappuccinos or drip coffee').",
        "If the learner asks you to repeat, repeat more simply.",
        "Keep pressure minimal — accept any reasonable answer and move forward.",
      ],
      complication: "A mild, predictable surprise: ask 'Is that for here or to go?' or 'Can I get a name for the order?'",
      speechRate: 0.88,
      hints: "offered",
      mission:
        "Next time you order coffee, answer the barista's greeting and return one friendly question — like “Good, thanks! How about you?”",
    },
    2: {
      openingLine: "Hey! How's your morning going so far?",
      aiInstructions: [
        "Speak at a natural pace with everyday expressions.",
        "Add a little genuine small talk (the weather, a busy morning) once or twice.",
        "Ask realistic follow-up questions about the order.",
        "Offer choices only if the learner is clearly stuck.",
      ],
      complication:
        "A mild problem: the milk or item they asked for just ran out (e.g. oat milk) — apologize and offer alternatives.",
      speechRate: 1.0,
      hints: "on_request",
      mission:
        "Next time you order, add one bit of small talk beyond the greeting — comment on the weather or ask how busy their day has been.",
    },
    3: {
      openingLine: "Hey, welcome in! Crazy morning, huh? How's it going?",
      aiInstructions: [
        "Speak naturally and spontaneously, with natural variation and casual expressions.",
        "Ask open questions that invite the learner to share preferences (e.g. 'Are you more of a sweet or a strong coffee person?').",
        "Include a real choice or recommendation the learner must react to.",
        "Don't offer help unless asked.",
      ],
      complication:
        "A less predictable curveball: the espresso machine is slow (about a 10-minute wait) or their drink is unavailable — suggest something different and see how they decide.",
      speechRate: 1.06,
      hints: "minimal",
      mission:
        "Next time you order, ask the barista for a recommendation and share a quick opinion about it — “Oh nice, I love anything with caramel.”",
    },
  },
  completion: { minUserTurns: 3, maxUserTurns: 8 },
  usefulPhrases: [
    "Pretty good, thanks! How about you?",
    "Could I get a medium latte, please?",
    "No worries — what would you recommend instead?",
    "For here, please.",
    "Thanks so much, have a good one!",
  ],
};
