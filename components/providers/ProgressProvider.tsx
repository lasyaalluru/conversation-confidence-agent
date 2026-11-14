"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import { LocalStore } from "@/lib/database/local-store";
import { applyConsent, type ProgressStore } from "@/lib/database/store";
import { getSupabaseBrowser, isSupabaseConfigured } from "@/lib/database/supabase-client";
import { SupabaseStore } from "@/lib/database/supabase-store";
import type { Mission, PracticeSession, Profile, ProgressSnapshot, SavedPhrase } from "@/types/domain";

interface ProgressContextValue extends ProgressSnapshot {
  /** false until data has been read from the browser / Supabase. Render nothing data-dependent before this. */
  ready: boolean;
  storeKind: ProgressStore["kind"];
  accountEmail: string | null;
  supabaseConfigured: boolean;
  error: string | null;
  saveProfile(profile: Profile): Promise<void>;
  saveSession(session: PracticeSession): Promise<void>;
  deleteSession(id: string): Promise<void>;
  saveMission(mission: Mission): Promise<void>;
  savePhrase(phrase: SavedPhrase): Promise<void>;
  deletePhrase(id: string): Promise<void>;
  deleteAll(): Promise<void>;
  /** Copy guest (this-browser) progress into the signed-in account. */
  importLocalIntoAccount(): Promise<number>;
  signOut(): Promise<void>;
}

const ProgressContext = createContext<ProgressContextValue | null>(null);

const EMPTY: ProgressSnapshot = { profile: null, sessions: [], missions: [], phrases: [] };

function upsert<T extends { id: string }>(list: T[], item: T): T[] {
  const i = list.findIndex((x) => x.id === item.id);
  if (i === -1) return [item, ...list];
  const next = [...list];
  next[i] = item;
  return next;
}

export function ProgressProvider({ children }: { children: React.ReactNode }) {
  const [snapshot, setSnapshot] = useState<ProgressSnapshot>(EMPTY);
  const [ready, setReady] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [accountEmail, setAccountEmail] = useState<string | null>(null);
  const storeRef = useRef<ProgressStore | null>(null);
  const [storeKind, setStoreKind] = useState<ProgressStore["kind"]>("local");
  const snapshotRef = useRef(snapshot);
  snapshotRef.current = snapshot;

  const loadFrom = useCallback(async (store: ProgressStore) => {
    storeRef.current = store;
    setStoreKind(store.kind);
    try {
      setSnapshot(await store.load());
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Couldn't load your progress");
    } finally {
      setReady(true);
    }
  }, []);

  useEffect(() => {
    const supabase = getSupabaseBrowser();
    if (!supabase) {
      void loadFrom(new LocalStore());
      return;
    }
    let cancelled = false;
    void supabase.auth.getUser().then(({ data }) => {
      if (cancelled) return;
      const user = data.user;
      setAccountEmail(user?.email ?? null);
      void loadFrom(user ? new SupabaseStore(supabase, user.id) : new LocalStore());
    });
    const { data: sub } = supabase.auth.onAuthStateChange((event, session) => {
      if (event !== "SIGNED_IN" && event !== "SIGNED_OUT") return;
      const user = session?.user ?? null;
      setAccountEmail(user?.email ?? null);
      void loadFrom(user ? new SupabaseStore(supabase, user.id) : new LocalStore());
    });
    return () => {
      cancelled = true;
      sub.subscription.unsubscribe();
    };
  }, [loadFrom]);

  /** Optimistically update local state, then persist. Surface (don't swallow) persistence errors. */
  const persist = useCallback(async (update: (s: ProgressSnapshot) => ProgressSnapshot, op: (store: ProgressStore) => Promise<void>) => {
    setSnapshot(update);
    const store = storeRef.current;
    if (!store) return;
    try {
      await op(store);
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Couldn't save your progress");
      throw e;
    }
  }, []);

  const value = useMemo<ProgressContextValue>(
    () => ({
      ...snapshot,
      ready,
      storeKind,
      accountEmail,
      supabaseConfigured: isSupabaseConfigured(),
      error,
      saveProfile: (profile) => persist((s) => ({ ...s, profile }), (st) => st.saveProfile(profile)),
      saveSession: (session) => {
        const stored = applyConsent(session, snapshotRef.current.profile);
        return persist((s) => ({ ...s, sessions: upsert(s.sessions, stored) }), (st) => st.saveSession(stored));
      },
      deleteSession: (id) =>
        persist(
          (s) => ({ ...s, sessions: s.sessions.filter((x) => x.id !== id), missions: s.missions.filter((m) => m.sessionId !== id) }),
          (st) => st.deleteSession(id),
        ),
      saveMission: (mission) => persist((s) => ({ ...s, missions: upsert(s.missions, mission) }), (st) => st.saveMission(mission)),
      savePhrase: (phrase) =>
        persist(
          (s) =>
            s.phrases.some((p) => p.phrase.toLowerCase() === phrase.phrase.toLowerCase())
              ? s
              : { ...s, phrases: [phrase, ...s.phrases] },
          (st) => st.savePhrase(phrase),
        ),
      deletePhrase: (id) => persist((s) => ({ ...s, phrases: s.phrases.filter((p) => p.id !== id) }), (st) => st.deletePhrase(id)),
      deleteAll: () => persist(() => EMPTY, (st) => st.deleteAll()),
      importLocalIntoAccount: async () => {
        const store = storeRef.current;
        if (!store || store.kind !== "supabase") return 0;
        const local = await new LocalStore().load();
        if (local.profile && !snapshotRef.current.profile) await store.saveProfile(local.profile);
        for (const s of local.sessions) await store.saveSession(s);
        for (const m of local.missions) await store.saveMission(m);
        for (const p of local.phrases) await store.savePhrase(p);
        await loadFrom(store);
        return local.sessions.length;
      },
      signOut: async () => {
        await getSupabaseBrowser()?.auth.signOut();
      },
    }),
    [snapshot, ready, storeKind, accountEmail, error, persist, loadFrom],
  );

  return <ProgressContext.Provider value={value}>{children}</ProgressContext.Provider>;
}

export function useProgress(): ProgressContextValue {
  const ctx = useContext(ProgressContext);
  if (!ctx) throw new Error("useProgress must be used inside <ProgressProvider>");
  return ctx;
}
