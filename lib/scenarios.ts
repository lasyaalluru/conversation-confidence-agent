import type { Language, Scenario } from "@/types";

/**
 * All practice scenarios live here.
 *
 * To add a scenario:
 *   1. Add an entry below with content for each practice language you support.
 *   2. Add its title/description/category to messages/en.json and messages/zh-CN.json
 *      under "scenarios.<i18nKey>".
 *   3. Set `available: true` when it's ready.
 *
 * Mandarin content should be written (or at least reviewed) by a fluent speaker —
 * it should reflect real Mandarin café norms, not a word-for-word translation.
 */
export const SCENARIOS: Scenario[] = [
  {
    id: "ordering-coffee",
    difficulty: "beginner",
    i18nKey: "orderingCoffee",
    available: true,
    content: {
      en: {
        aiRole: "Friendly barista at a busy campus café",
        setting: "A small café near a university. It's a weekday morning.",
        openingLine: "Hey there! How's your morning going?",
        objectives: [
          "Respond naturally to a greeting",
          "Return a friendly question",
          "Place a clear, polite order",
          "Handle an unexpected question or problem",
          "Close the interaction politely",
        ],
        complication:
          "The item they order (or the milk they want) is sold out — offer an alternative. Alternatively ask an unexpected question like 'Is that for here or to go?' or 'Can I get a name for the order?'",
        culturalNotes: [
          "Small talk with baristas is common and friendly in the US.",
          "Saying 'please' and 'thanks' is expected.",
          "'Can I get…' and 'I'll have…' are both natural ways to order.",
        ],
        mission:
          "Next time you order coffee, greet the barista and return one friendly question (like 'How's your day going?'). Come back and mark whether you tried it!",
      },
      "zh-CN": {
        aiRole: "咖啡店店员（友好、效率高）",
        setting: "一家在大学附近的咖啡店，工作日早上，人比较多。",
        openingLine: "你好！想喝点什么？",
        objectives: [
          "自然地回应店员的问候",
          "清楚、礼貌地点单（饮品、大小杯、冷热）",
          "回答店员的追问（例如：堂食还是带走？）",
          "应对一个小意外（例如：某种饮品卖完了）",
          "礼貌地结束对话",
        ],
        complication:
          "顾客点的饮品或配料（例如燕麦奶）卖完了，请推荐替代选择；或者问“堂食还是带走？”、“要加糖吗？”",
        culturalNotes: [
          "在中国的咖啡店，店员通常比较直接、高效，闲聊比美国少。",
          "常用表达：“我要一杯…”、“给我来一杯…”、“大杯/中杯”、“热的/冰的”。",
          "付款时常见问题：“扫码还是刷卡？”",
        ],
        mission:
          "下次去咖啡店时，试着用中文完整点一杯饮品，包括大小杯和冷热。回来后记得标记你是否尝试了！",
      },
    },
  },
  {
    id: "classmate-small-talk",
    difficulty: "intermediate",
    i18nKey: "classmateSmallTalk",
    available: false,
    content: {},
  },
  {
    id: "group-discussion",
    difficulty: "intermediate",
    i18nKey: "groupDiscussion",
    available: false,
    content: {},
  },
];

export function getScenario(id: string): Scenario | undefined {
  return SCENARIOS.find((s) => s.id === id);
}

export function getScenarioContent(id: string, language: Language) {
  return getScenario(id)?.content[language];
}

export const LANGUAGES: Language[] = ["en", "zh-CN"];

export function isLanguage(value: unknown): value is Language {
  return value === "en" || value === "zh-CN";
}

/** BCP-47 tag used for browser speech synthesis. */
export const SPEECH_LANG: Record<Language, string> = {
  en: "en-US",
  "zh-CN": "zh-CN",
};
