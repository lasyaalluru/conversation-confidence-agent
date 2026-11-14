import type { ProgressSnapshot } from "@/types/domain";
import type { ProgressStore } from "./store";

/**
 * Guest-mode storage in localStorage. Data never leaves this browser.
 * Every access is wrapped in try/catch: storage can be blocked (private mode) or full.
 */
const KEY = "convoconfidence:v1";

const EMPTY: ProgressSnapshot = { profile: null, sessions: [], missions: [], phrases: [] };

function read(): ProgressSnapshot {
  try {
    const raw = window.localStorage.getItem(KEY);
    if (!raw) return { ...EMPTY };
    const parsed = JSON.parse(raw) as Partial<ProgressSnapshot>;
    return {
      profile: parsed.profile ?? null,
      sessions: parsed.sessions ?? [],
      missions: parsed.missions ?? [],
      phrases: parsed.phrases ?? [],
    };
  } catch {
    return { ...EMPTY };
  }
}

function write(snapshot: ProgressSnapshot) {
  try {
    window.localStorage.setItem(KEY, JSON.stringify(snapshot));
  } catch {
    // Storage unavailable — the app keeps working for this visit; progress just won't persist.
  }
}

function upsert<T extends { id: string }>(list: T[], item: T): T[] {
  const i = list.findIndex((x) => x.id === item.id);
  if (i === -1) return [item, ...list];
  const next = [...list];
  next[i] = item;
  return next;
}

export class LocalStore implements ProgressStore {
  readonly kind = "local" as const;

  async load() {
    return read();
  }

  async saveProfile(profile: ProgressSnapshot["profile"] & object) {
    write({ ...read(), profile });
  }

  async saveSession(session: ProgressSnapshot["sessions"][number]) {
    const s = read();
    write({ ...s, sessions: upsert(s.sessions, session) });
  }

  async deleteSession(id: string) {
    const s = read();
    write({
      ...s,
      sessions: s.sessions.filter((x) => x.id !== id),
      missions: s.missions.filter((m) => m.sessionId !== id),
    });
  }

  async saveMission(mission: ProgressSnapshot["missions"][number]) {
    const s = read();
    write({ ...s, missions: upsert(s.missions, mission) });
  }

  async savePhrase(phrase: ProgressSnapshot["phrases"][number]) {
    const s = read();
    if (s.phrases.some((p) => p.phrase.toLowerCase() === phrase.phrase.toLowerCase() && p.id !== phrase.id)) return;
    write({ ...s, phrases: upsert(s.phrases, phrase) });
  }

  async deletePhrase(id: string) {
    const s = read();
    write({ ...s, phrases: s.phrases.filter((p) => p.id !== id) });
  }

  async deleteAll() {
    try {
      window.localStorage.removeItem(KEY);
    } catch {}
  }
}
