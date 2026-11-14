"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { useConversation } from "@/hooks/useConversation";
import { useProgress } from "@/components/providers/ProgressProvider";
import { Logo } from "@/components/layout/Logo";
import { Button } from "@/components/ui/Button";
import { DemoBadge } from "@/components/ui/primitives";
import type { AiMode } from "@/lib/ai/contract";
import { newId, nowIso } from "@/lib/database/store";
import { getComfortLevel, type ComfortLevel, type PlayableScenario } from "@/lib/scenarios/catalog";
import { ConversationStage } from "./ConversationStage";
import { PreBrief } from "./PreBrief";

/**
 * Practice flow for one scenario: pre-brief → conversation → save → /feedback/[sessionId].
 * The conversation starts from the "Start Conversation" click (a user gesture, so audio may play).
 */
export function PracticeExperience({ scenario, requestedLevel }: { scenario: PlayableScenario; requestedLevel: ComfortLevel | null }) {
  const { ready, profile } = useProgress();
  const [mode, setMode] = useState<AiMode | null>(null);
  const [level, setLevel] = useState<ComfortLevel | null>(requestedLevel);
  const [confidence, setConfidence] = useState<number | null>(null);
  const [started, setStarted] = useState(false);

  const profileLevel = profile?.comfortLevel ?? 1;
  const effectiveLevel = level ?? profileLevel;
  const convo = useConversation(scenario, effectiveLevel, mode);

  useEffect(() => {
    let cancelled = false;
    fetch("/api/status")
      .then((r) => r.json())
      .then((d: { mode: AiMode }) => !cancelled && setMode(d.mode))
      .catch(() => !cancelled && setMode("demo"));
    return () => {
      cancelled = true;
    };
  }, []);

  if (!ready) return <div className="min-h-svh bg-midnight" />;

  return (
    <div className="on-dark relative flex min-h-svh flex-col overflow-x-clip bg-midnight text-ivory">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(60%_50%_at_50%_20%,rgb(186_172_247/0.14),transparent_70%),radial-gradient(40%_40%_at_15%_90%,rgb(167_220_203/0.07),transparent_70%)]"
      />
      {started ? (
        <ActiveSession scenario={scenario} level={effectiveLevel} convo={convo} confidenceBefore={confidence} />
      ) : (
        <>
          <header className="relative z-10 mx-auto flex h-20 w-full max-w-6xl items-center justify-between px-4 sm:px-6">
            <Logo tone="light" href="/dashboard" />
            <a href="/scenarios" className="text-sm text-ivory/60 hover:text-ivory">
              ← All scenarios
            </a>
          </header>
          <main id="main" className="relative z-10 flex flex-1 items-start px-4 pb-16 pt-6 sm:px-6 lg:items-center">
            <PreBrief
              scenario={scenario}
              level={effectiveLevel}
              onLevelChange={setLevel}
              confidence={confidence}
              onConfidence={setConfidence}
              mode={mode}
              recommendedLevel={profileLevel}
              onStart={() => {
                // Start inside the click handler: browsers (Safari especially) only allow
                // speech to begin from a user gesture.
                setStarted(true);
                convo.start();
              }}
            />
          </main>
        </>
      )}
    </div>
  );
}

function ActiveSession({
  scenario,
  level,
  convo,
  confidenceBefore,
}: {
  scenario: PlayableScenario;
  level: ComfortLevel;
  convo: ReturnType<typeof useConversation>;
  confidenceBefore: number | null;
}) {
  const router = useRouter();
  const { saveSession, saveMission } = useProgress();
  const [saving, setSaving] = useState(false);
  const dialogRef = useRef<HTMLDialogElement>(null);
  const userTurns = convo.turns.filter((t) => t.speaker === "user").length;

  async function endAndSave() {
    if (saving) return;
    const snap = convo.finish();
    const hasUserTurns = snap.turns.some((t) => t.speaker === "user");
    if (!hasUserTurns) {
      router.push("/dashboard");
      return;
    }
    setSaving(true);
    const id = newId();
    try {
      await saveSession({
        id,
        scenarioId: scenario.id,
        comfortLevel: level,
        mode: snap.mode,
        status: snap.complete ? "completed" : "ended_early",
        startedAt: snap.startedAt,
        endedAt: snap.endedAt,
        confidenceBefore,
        confidenceAfter: null,
        turns: snap.turns,
        userTurnCount: snap.turns.filter((t) => t.speaker === "user").length,
        events: snap.events,
        feedback: null,
        reflection: null,
      });
      await saveMission({
        id: newId(),
        sessionId: id,
        scenarioId: scenario.id,
        text: scenario.levels[level].mission,
        status: "pending",
        reflection: "",
        createdAt: nowIso(),
        updatedAt: nowIso(),
      });
    } catch {
      // The provider surfaces storage errors; still continue — the feedback page can work from memory-less state.
    }
    router.push(`/feedback/${id}`);
  }

  return (
    <>
      <header className="relative z-10 border-b border-white/10">
        <div className="mx-auto flex h-16 w-full max-w-6xl items-center justify-between gap-4 px-4 sm:px-6">
          <div className="hidden sm:block">
            <Logo tone="light" href="/dashboard" />
          </div>
          <div className="flex min-w-0 flex-col items-start sm:items-center">
            <span className="truncate font-medium">{scenario.title}</span>
            <span className="text-xs text-ivory/55">
              Level {level} · {getComfortLevel(level).name}
            </span>
          </div>
          <div className="flex items-center gap-3">
            {convo.mode === "demo" && <DemoBadge className="hidden md:inline-flex" label="Demo Mode" />}
            <Button
              variant="outline-dark"
              size="sm"
              onClick={() => (convo.complete ? endAndSave() : dialogRef.current?.showModal())}
              disabled={saving}
            >
              End session
            </Button>
          </div>
        </div>
      </header>
      {convo.mode === "demo" && (
        <div className="relative z-10 mx-auto mt-3 md:hidden">
          <DemoBadge />
        </div>
      )}

      <main id="main" className="relative z-10 flex flex-1 flex-col px-4 pb-8 pt-6 sm:px-6">
        <ConversationStage scenario={scenario} level={level} convo={convo} onContinue={endAndSave} />
      </main>

      <dialog
        ref={dialogRef}
        className="m-auto w-[min(92vw,440px)] rounded-3xl bg-paper p-0 text-ink shadow-lift backdrop:bg-midnight/70 backdrop:backdrop-blur-sm"
      >
        <div className="flex flex-col gap-4 p-7">
          <h2 className="font-display text-3xl">End this conversation?</h2>
          <p className="text-slate">
            {userTurns > 0
              ? "That's okay — you'll still get feedback on what you've said so far."
              : "You haven't replied yet, so there's nothing to save. You can come back any time."}
          </p>
          <div className="mt-2 flex flex-wrap justify-end gap-2">
            <Button variant="ghost" onClick={() => dialogRef.current?.close()}>
              Keep going
            </Button>
            <Button
              onClick={() => {
                dialogRef.current?.close();
                void endAndSave();
              }}
            >
              {userTurns > 0 ? "End & see feedback" : "Leave"}
            </Button>
          </div>
        </div>
      </dialog>
    </>
  );
}
