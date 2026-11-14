import "server-only";
import { getOpenAI, MODELS } from "@/lib/openai";
import { getScenarioContent } from "@/lib/scenarios";
import type {
  ChatMessage,
  ConversationTurnResponse,
  Feedback,
  Language,
  ScenarioContent,
  ScenarioStage,
} from "@/types";

/**
 * The conversation agent.
 *
 *  - buildRolePlayInstructions(): the system prompt for the AI character
 *  - generateTurn():   next AI line + updated scenario stage
 *  - generateFeedback(): separate evaluation step after the conversation
 *
 * Both functions fall back to scripted "mock" output when no OPENAI_API_KEY is set,
 * so the whole UI flow can be built and tested without spending API credits.
 */

const STAGES: ScenarioStage[] = [
  "greeting",
  "ordering",
  "unexpected_question",
  "closing",
  "completed",
];

/** Hard cap so a session always ends, even if the model forgets to. */
const MAX_USER_TURNS = 7;

const LANGUAGE_NAME: Record<Language, string> = {
  en: "English",
  "zh-CN": "Mandarin Chinese (Simplified, mainland China norms)",
};

export function buildRolePlayInstructions(
  content: ScenarioContent,
  practiceLanguage: Language,
  stage: ScenarioStage,
): string {
  return `You are an AI conversation practice partner helping someone build confidence speaking ${LANGUAGE_NAME[practiceLanguage]}.

Role: ${content.aiRole}
Setting: ${content.setting}
Practice language: ${LANGUAGE_NAME[practiceLanguage]}. ALWAYS reply only in this language, even if the learner uses another language. If they switch languages, gently continue in the practice language (you may briefly clarify).

Learning objectives for the learner:
${content.objectives.map((o) => `- ${o}`).join("\n")}

Complication to introduce once, during the "unexpected_question" stage:
${content.complication}

Cultural/conversational norms to follow:
${content.culturalNotes.map((n) => `- ${n}`).join("\n")}

Scenario stages, in order: ${STAGES.join(" → ")}.
Current stage: ${stage}.

Rules:
- Stay in character throughout. Never mention that this is practice or that you are an AI.
- Respond in 1–2 short, natural sentences, like a real person would speak aloud.
- Do NOT correct grammar or pronunciation during the conversation — feedback comes later.
- Be patient and warm. If the learner's message is unclear or very short, respond naturally or ask a simple clarifying question.
- Advance the stage when its goal is met. The whole conversation should take about 4–6 exchanges.
- When the interaction has naturally ended (order done, goodbye said), set stage to "completed" and give a short friendly closing line.`;
}

const TURN_SCHEMA = {
  type: "object",
  properties: {
    reply: { type: "string", description: "What the character says next, in the practice language." },
    stage: { type: "string", enum: STAGES, description: "Scenario stage AFTER this reply." },
  },
  required: ["reply", "stage"],
  additionalProperties: false,
} as const;

function toTranscript(history: ChatMessage[]): string {
  return history.map((m) => `${m.role === "ai" ? "CHARACTER" : "LEARNER"}: ${m.text}`).join("\n");
}

export async function generateTurn(params: {
  scenarioId: string;
  practiceLanguage: Language;
  stage: ScenarioStage;
  history: ChatMessage[];
}): Promise<ConversationTurnResponse> {
  const { scenarioId, practiceLanguage, stage, history } = params;
  const content = getScenarioContent(scenarioId, practiceLanguage);
  if (!content) throw new Error(`Scenario "${scenarioId}" has no ${practiceLanguage} content`);

  const userTurns = history.filter((m) => m.role === "user").length;
  const openai = getOpenAI();

  if (!openai) return mockTurn(practiceLanguage, stage, userTurns);

  const response = await openai.responses.create({
    model: MODELS.conversation,
    instructions: buildRolePlayInstructions(content, practiceLanguage, stage),
    input: `Conversation so far:\n${toTranscript(history)}\n\nWrite the CHARACTER's next line.`,
    text: { format: { type: "json_schema", name: "conversation_turn", schema: TURN_SCHEMA, strict: true } },
  });

  const parsed = JSON.parse(response.output_text) as { reply: string; stage: ScenarioStage };
  // Safety net: force the conversation to end if it runs too long.
  const finalStage = userTurns >= MAX_USER_TURNS ? "completed" : parsed.stage;
  return { reply: parsed.reply, stage: finalStage, isComplete: finalStage === "completed" };
}

const FEEDBACK_SCHEMA = {
  type: "object",
  properties: {
    summary: { type: "string" },
    items: {
      type: "array",
      items: {
        type: "object",
        properties: {
          skill: { type: "string" },
          rating: { type: "string", enum: ["strong", "developing", "try_next_time"] },
          comment: { type: "string" },
          suggestedPhrase: { type: ["string", "null"] },
        },
        required: ["skill", "rating", "comment", "suggestedPhrase"],
        additionalProperties: false,
      },
    },
    usefulPhrases: { type: "array", items: { type: "string" } },
  },
  required: ["summary", "items", "usefulPhrases"],
  additionalProperties: false,
} as const;

export async function generateFeedback(params: {
  scenarioId: string;
  practiceLanguage: Language;
  uiLanguage: Language;
  history: ChatMessage[];
}): Promise<Feedback> {
  const { scenarioId, practiceLanguage, uiLanguage, history } = params;
  const content = getScenarioContent(scenarioId, practiceLanguage);
  if (!content) throw new Error(`Scenario "${scenarioId}" has no ${practiceLanguage} content`);

  const openai = getOpenAI();
  if (!openai) return mockFeedback(uiLanguage);

  const response = await openai.responses.create({
    model: MODELS.feedback,
    instructions: `You are a supportive conversation coach. Evaluate a learner's role-play conversation in ${LANGUAGE_NAME[practiceLanguage]}.

Focus on CONVERSATIONAL skills, not accent or perfect grammar:
- Responding naturally
- Returning questions / showing interest
- Politeness
- Handling surprises
- Closing the conversation

Learning objectives:
${content.objectives.map((o) => `- ${o}`).join("\n")}

Rules:
- Write "summary" and each "comment" in ${LANGUAGE_NAME[uiLanguage]} (the learner's interface language).
- "suggestedPhrase" and "usefulPhrases" must be in ${LANGUAGE_NAME[practiceLanguage]} (the practice language).
- Give 3–5 items. Start with something they did well. Be specific and quote what they said.
- Never judge accent. The transcript came from speech-to-text, so ignore likely transcription errors.
- Be encouraging: the goal is confidence.`,
    input: toTranscript(history),
    text: { format: { type: "json_schema", name: "feedback", schema: FEEDBACK_SCHEMA, strict: true } },
  });

  return JSON.parse(response.output_text) as Feedback;
}

// ---------------- Mock mode (no API key) ----------------

const MOCK_LINES: Record<Language, Partial<Record<ScenarioStage, string>>> = {
  en: {
    ordering: "Glad to hear it! What can I get started for you today?",
    unexpected_question: "Oh, I'm so sorry — we just ran out of oat milk. Would almond or regular milk work instead?",
    closing: "Perfect. Is that for here or to go?",
    completed: "Awesome, that'll be ready in just a minute. Have a great day!",
  },
  "zh-CN": {
    ordering: "好的！今天想喝点什么？",
    unexpected_question: "不好意思，燕麦奶刚卖完了。换成牛奶或者杏仁奶可以吗？",
    closing: "没问题。堂食还是带走？",
    completed: "好的，请稍等一下，马上就好。祝你今天愉快！",
  },
};

function mockTurn(language: Language, stage: ScenarioStage, userTurns: number): ConversationTurnResponse {
  const idx = Math.min(STAGES.indexOf(stage) + 1, STAGES.length - 1);
  const next = userTurns >= MAX_USER_TURNS ? "completed" : STAGES[idx];
  return {
    reply: MOCK_LINES[language][next] ?? "",
    stage: next,
    isComplete: next === "completed",
    mock: true,
  };
}

function mockFeedback(uiLanguage: Language): Feedback {
  if (uiLanguage === "zh-CN") {
    return {
      mock: true,
      summary: "（示例反馈——设置 OPENAI_API_KEY 后会生成真实反馈）你顺利完成了点单，语气友好！",
      items: [
        { skill: "自然回应", rating: "strong", comment: "你自然地回应了店员的问候。", suggestedPhrase: null },
        { skill: "反问对方", rating: "developing", comment: "可以试着反问店员过得怎么样。", suggestedPhrase: "How about you?" },
        { skill: "应对意外", rating: "try_next_time", comment: "饮品卖完时，可以礼貌地询问推荐。", suggestedPhrase: "What would you recommend instead?" },
      ],
      usefulPhrases: ["Can I get a medium latte, please?", "How's your day going?"],
    };
  }
  return {
    mock: true,
    summary: "(Sample feedback — set OPENAI_API_KEY for real AI feedback.) You completed the order and sounded friendly!",
    items: [
      { skill: "Responding naturally", rating: "strong", comment: "You answered the greeting naturally.", suggestedPhrase: null },
      { skill: "Returning questions", rating: "developing", comment: "Try asking the barista how they're doing, too.", suggestedPhrase: "Pretty good, thanks! How about yours?" },
      { skill: "Handling surprises", rating: "try_next_time", comment: "When something is sold out, you can ask for a recommendation.", suggestedPhrase: "No worries — what would you recommend instead?" },
    ],
    usefulPhrases: ["Can I get a medium latte, please?", "Is that for here or to go?"],
  };
}
