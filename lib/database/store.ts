import type { Mission, PracticeSession, Profile, ProgressSnapshot, SavedPhrase } from "@/types/domain";

/**
 * Persistence interface. The UI only talks to this — never to localStorage or Supabase directly.
 *   - LocalStore     → guest mode (this browser only)
 *   - SupabaseStore  → signed-in users (synced across devices, protected by RLS)
 */
export interface ProgressStore {
  readonly kind: "local" | "supabase";
  load(): Promise<ProgressSnapshot>;
  saveProfile(profile: Profile): Promise<void>;
  saveSession(session: PracticeSession): Promise<void>;
  deleteSession(id: string): Promise<void>;
  saveMission(mission: Mission): Promise<void>;
  savePhrase(phrase: SavedPhrase): Promise<void>;
  deletePhrase(id: string): Promise<void>;
  /** Delete everything this store holds for the current user. */
  deleteAll(): Promise<void>;
}

export const DEFAULT_CONSENT = { storeTranscripts: true, pilotReflections: true } as const;

export function newId(): string {
  return crypto.randomUUID();
}

export function nowIso(): string {
  return new Date().toISOString();
}

/** Apply the user's consent preferences before a session is persisted. */
export function applyConsent(session: PracticeSession, profile: Profile | null): PracticeSession {
  if (profile?.consent.storeTranscripts === false && session.status !== "in_progress") {
    return { ...session, turns: [] };
  }
  return session;
}
