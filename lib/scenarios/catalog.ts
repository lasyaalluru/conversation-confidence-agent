import { orderingCoffee } from "./ordering-coffee";
import { isPlayable, type Category, type CategoryId, type PlayableScenario, type Scenario } from "./types";

export * from "./types";
export * from "./comfort-levels";

/** The confidence ladder: low-stakes everyday moments → professional settings. */
export const CATEGORIES: Category[] = [
  { id: "everyday", title: "Everyday Confidence", tagline: "Quick, low-stakes moments that happen every day.", ladderStep: 1 },
  { id: "social", title: "Social Confidence", tagline: "Small talk, getting to know people, sharing about yourself.", ladderStep: 2 },
  { id: "group", title: "Group Confidence", tagline: "Joining conversations that are already happening.", ladderStep: 3 },
  { id: "academic", title: "Academic Confidence", tagline: "Speaking up, sharing opinions and disagreeing respectfully.", ladderStep: 4 },
  { id: "professional", title: "Professional Confidence", tagline: "Meetings, interviews and persuasive conversations.", ladderStep: 5 },
];

const preview = (
  id: string,
  title: string,
  category: CategoryId,
  summary: string,
  goals: Scenario["goals"],
): Scenario => ({ id, title, category, summary, goals, status: "coming_soon" });

/**
 * All scenarios. To make a preview playable, replace its `preview(...)` entry with a full
 * PlayableScenario (see ordering-coffee.ts) in its own file.
 */
export const SCENARIOS: Scenario[] = [
  orderingCoffee,
  preview("grocery-checkout", "Grocery-store checkout", "everyday", "Bags, rewards cards and quick cashier small talk.", ["everyday"]),
  preview("asking-directions", "Asking for directions", "everyday", "Stop someone politely and follow their answer.", ["everyday"]),
  preview("casual-greetings", "Casual greetings", "everyday", "“What's up?” and other greetings that aren't really questions.", ["everyday", "small_talk"]),
  preview("customer-service", "Customer-service calls", "everyday", "Explain a problem clearly and ask for what you need.", ["everyday"]),

  preview("classmate-chat", "Talking to classmates", "social", "Start a chat before class and keep it going.", ["small_talk", "friends", "classroom"]),
  preview("where-are-you-from", "“So, where are you from?”", "social", "Answer in a way that invites a real conversation.", ["small_talk", "friends"]),
  preview("hobbies", "Talking about hobbies", "social", "Share what you love and ask good follow-ups.", ["small_talk", "friends"]),
  preview("weekend-plans", "Weekend plans", "social", "The Monday and Friday small-talk classic.", ["small_talk", "friends"]),
  preview("start-end-small-talk", "Starting and ending small talk", "social", "Open naturally and exit gracefully.", ["small_talk"]),

  preview("join-conversation", "Joining an ongoing conversation", "group", "Find the moment and add your voice.", ["group_discussion", "friends"]),
  preview("networking-event", "Networking events", "group", "Introduce yourself and make a memorable connection.", ["networking", "professional"]),
  preview("meeting-new-people", "Meeting new people", "group", "Introductions in a group, remembering names.", ["friends", "small_talk"]),
  preview("social-gathering", "Social gatherings", "group", "Parties and get-togethers, from arrival to goodbye.", ["friends", "small_talk"]),

  preview("speak-up-class", "Speaking up in class", "academic", "Raise a point without waiting for the perfect moment.", ["classroom"]),
  preview("explain-opinion", "Explaining your opinion", "academic", "State a view, give a reason, add an example.", ["classroom", "group_discussion"]),
  preview("asking-questions", "Asking questions", "academic", "Ask professors and peers clear, confident questions.", ["classroom"]),
  preview("challenge-ideas", "Challenging ideas politely", "academic", "Push back on an idea while staying respectful.", ["classroom", "group_discussion"]),
  preview("group-project", "Disagreeing in group projects", "academic", "Navigate disagreement and keep the team moving.", ["group_discussion", "classroom"]),

  preview("workplace-small-talk", "Workplace small talk", "professional", "Coffee-machine chats and Monday check-ins.", ["professional", "small_talk"]),
  preview("meetings", "Meetings", "professional", "Contribute, clarify and follow up.", ["professional", "group_discussion"]),
  preview("presentations", "Presentations", "professional", "Open strong and handle questions.", ["interviews_presentations", "professional"]),
  preview("interviews", "Interviews", "professional", "“Tell me about yourself” and beyond.", ["interviews_presentations", "professional"]),
  preview("talk-to-manager", "Talking with your manager", "professional", "Ask for feedback, raise concerns, share wins.", ["professional"]),
  preview("persuasion", "Persuasion and discussion", "professional", "Make a case and bring others along.", ["professional", "interviews_presentations"]),
];

export function getScenario(id: string): Scenario | undefined {
  return SCENARIOS.find((s) => s.id === id);
}

export function getPlayableScenario(id: string): PlayableScenario | undefined {
  const s = getScenario(id);
  return isPlayable(s) ? s : undefined;
}

export function getCategory(id: CategoryId): Category {
  return CATEGORIES.find((c) => c.id === id)!;
}

export function scenariosByCategory(id: CategoryId): Scenario[] {
  return SCENARIOS.filter((s) => s.category === id);
}

export const PLAYABLE_SCENARIOS = SCENARIOS.filter(isPlayable);
