// Progress storage — currently the browser's localStorage (guest mode, no login).
//
// TODO (Member 3): replace these functions with Supabase calls once auth is set up.
// Keep the same function signatures so the UI doesn't need to change.
// See supabase/schema.sql for the matching tables.

import type { PracticeSession } from "@/types";

const KEY = "confidence-coach:sessions:v1";

export function loadSessions(): PracticeSession[] {
  try {
    const raw = window.localStorage.getItem(KEY);
    return raw ? (JSON.parse(raw) as PracticeSession[]) : [];
  } catch {
    return [];
  }
}

function write(sessions: PracticeSession[]) {
  try {
    window.localStorage.setItem(KEY, JSON.stringify(sessions));
  } catch {
    // Storage full or blocked (private mode) — progress just won't persist.
  }
}

export function saveSession(session: PracticeSession) {
  const others = loadSessions().filter((s) => s.id !== session.id);
  write([session, ...others]);
}

export function updateMissionStatus(id: string, status: PracticeSession["missionStatus"]) {
  write(loadSessions().map((s) => (s.id === id ? { ...s, missionStatus: status } : s)));
}

export function clearSessions() {
  try {
    window.localStorage.removeItem(KEY);
  } catch {}
}
