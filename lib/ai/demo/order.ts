/**
 * Tiny, deterministic parser for café orders — used only by DEMO MODE so the scripted barista
 * can respond to what the learner actually said (and remember it). Not used in live mode.
 */
export interface ParsedOrder {
  drink: string | null;
  size: string | null;
  milk: string | null;
  temperature: "iced" | "hot" | null;
}

const DRINKS: [RegExp, string][] = [
  [/\bcold ?brew\b/, "cold brew"],
  [/\bflat white\b/, "flat white"],
  [/\bmatcha\b/, "matcha latte"],
  [/\bchai\b/, "chai latte"],
  [/\bcappuccinos?\b/, "cappuccino"],
  [/\bmochas?\b/, "mocha"],
  [/\bmacchiatos?\b/, "macchiato"],
  [/\bamericanos?\b/, "americano"],
  [/\bespressos?\b/, "espresso"],
  [/\blattes?\b/, "latte"],
  [/\b(hot )?chocolate\b/, "hot chocolate"],
  [/\btea\b/, "tea"],
  [/\b(drip )?coffee\b/, "coffee"],
];

const SIZES: [RegExp, string][] = [
  [/\b(small|tall|short)\b/, "small"],
  [/\b(medium|grande|regular size)\b/, "medium"],
  [/\b(large|venti|big)\b/, "large"],
];

const MILKS: [RegExp, string][] = [
  [/\boat\b/, "oat"],
  [/\balmond\b/, "almond"],
  [/\bsoy\b/, "soy"],
  [/\b(skim|nonfat|non-fat)\b/, "skim"],
  [/\b(whole|regular|normal|dairy)( milk)?\b/, "regular"],
];

export const MILK_DRINKS = new Set(["latte", "cappuccino", "flat white", "mocha", "macchiato", "chai latte", "matcha latte"]);

export function parseOrder(texts: string[]): ParsedOrder {
  const order: ParsedOrder = { drink: null, size: null, milk: null, temperature: null };
  for (const raw of texts) {
    const t = raw.toLowerCase();
    for (const [re, v] of DRINKS) if (re.test(t)) { order.drink = v; break; }
    for (const [re, v] of SIZES) if (re.test(t)) { order.size = v; break; }
    for (const [re, v] of MILKS) if (re.test(t)) { order.milk = v; break; }
    if (/\b(iced|cold|ice)\b/.test(t) && !/cold ?brew/.test(t)) order.temperature = "iced";
    else if (/\bhot\b/.test(t) && !/hot chocolate/.test(t)) order.temperature = "hot";
  }
  return order;
}

export function describeOrder(o: ParsedOrder): string {
  const milk = o.milk && o.milk !== "regular" ? `${o.milk} milk` : "";
  return [o.size, o.temperature === "iced" ? "iced" : "", milk, o.drink ?? "drink"].filter(Boolean).join(" ");
}

const NOT_NAMES = new Set([
  "yes", "yeah", "sure", "okay", "ok", "thanks", "thank", "please", "no", "here", "go", "to", "for", "fine", "good", "great",
  "that", "it", "is", "the", "a", "and", "you", "hi", "hello", "perfect", "cool", "awesome", "sounds", "just",
]);

export function extractName(text: string): string | null {
  const m = text.match(/(?:my name is|my name's|name's|it's|its|it is|i'm|im|i am|call me|this is|for)\s+([a-z][a-z'-]{1,20})/i);
  const cap = (w: string) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase();
  if (m && !NOT_NAMES.has(m[1].toLowerCase())) return cap(m[1]);
  const words = text.replace(/[^a-z\s'-]/gi, " ").trim().split(/\s+/).filter(Boolean);
  if (words.length >= 1 && words.length <= 2 && !NOT_NAMES.has(words[0].toLowerCase())) return cap(words[0]);
  return null;
}

export const RETURNED_QUESTION = /\b(how about you|what about you|and you|how are you|how're you|how's yours|how is yours|how's your|how is your|you\?|yourself)\b/i;
export const POLITE = /\b(please|thank|thanks|appreciate|cheers)\b/i;
export const CLOSING = /\b(thank|thanks|bye|have a (good|great|nice)|you too|appreciate|see you|cheers)\b/i;
