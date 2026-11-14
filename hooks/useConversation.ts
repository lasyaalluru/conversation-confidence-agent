"use client";

import { useCallback, useEffect, useRef, useState, useSyncExternalStore } from "react";
import type { AiMode, ApiError, ConversationResponse, TranscribeResponse } from "@/lib/ai/contract";
import {
  BrowserPushToTalk,
  BrowserRecognitionError,
  browserRecognitionErrorMessage,
  isBrowserRecognitionSupported,
} from "@/lib/audio/browser-recognition";
import { PushToTalkRecorder, RecorderError, recorderErrorMessage, type Recording } from "@/lib/audio/recorder";
import { speak, stopSpeaking } from "@/lib/audio/speech";
import type { ComfortLevel, PlayableScenario } from "@/lib/scenarios/catalog";
import type { ConversationTurn, SessionEvent, SessionEventType } from "@/types/domain";

/**
 * How the learner's voice becomes text:
 *  - "server"  → MediaRecorder + /api/transcribe (OpenAI; needs OPENAI_API_KEY)
 *  - "browser" → the browser's built-in speech recognition (Chrome/Edge/Safari; no key needed)
 *  - "none"    → typing only (e.g. Firefox without a key)
 */
export type VoiceEngine = "server" | "browser" | "none";

const noSubscribe = () => () => {};

export type VoiceStatus = "idle" | "speaking" | "listening" | "transcribing" | "thinking" | "error";

export interface ConversationSnapshot {
  turns: ConversationTurn[];
  events: SessionEvent[];
  startedAt: string;
  endedAt: string;
  complete: boolean;
  mode: AiMode;
}

const MIN_RECORDING_MS = 450;

async function errorMessage(res: Response, fallback: string): Promise<string> {
  const body = (await res.json().catch(() => null)) as ApiError | null;
  return body?.error?.message ?? fallback;
}

/**
 * Conversation state machine for one practice session.
 * Guarantees: recording never overlaps AI playback, the mic is only opened by a user action,
 * and errors never lose the conversation so far (every failure offers a retry).
 */
export function useConversation(
  scenario: PlayableScenario,
  level: ComfortLevel,
  initialMode: AiMode | null,
  serverTranscription: boolean | null,
) {
  const browserSupported = useSyncExternalStore(noSubscribe, isBrowserRecognitionSupported, () => false);
  const voiceEngine: VoiceEngine = serverTranscription ? "server" : browserSupported ? "browser" : "none";
  const cfg = scenario.levels[level];
  const [turns, setTurns] = useState<ConversationTurn[]>([]);
  const [status, setStatus] = useState<VoiceStatus>("idle");
  const [stage, setStage] = useState(scenario.stages[0].id);
  const [hint, setHint] = useState<string | null>(null);
  const [hintVisible, setHintVisible] = useState(false);
  const [complete, setComplete] = useState(false);
  const [mode, setMode] = useState<AiMode | null>(null);
  const [error, setError] = useState<{ message: string; retry?: () => void } | null>(null);
  const [micError, setMicError] = useState<string | null>(null);
  /** Live words while the browser recognizer is listening. */
  const [interim, setInterim] = useState("");

  const turnsRef = useRef<ConversationTurn[]>([]);
  const stageRef = useRef(stage);
  const eventsRef = useRef<SessionEvent[]>([]);
  const startedAtRef = useRef<string>("");
  const recorderRef = useRef<PushToTalkRecorder | null>(null);
  const browserRef = useRef<BrowserPushToTalk | null>(null);
  const recordStartRef = useRef(0);
  const busyRef = useRef(false);
  /** performance.now() of the latest spoken word boundary — drives the orb's speaking rhythm. */
  const lastBoundaryRef = useRef(0);
  const mountedRef = useRef(true);
  // Retry callbacks call the latest version of these functions through refs.
  const requestTurnRef = useRef<(history: ConversationTurn[]) => Promise<void>>(async () => {});
  const transcribeRef = useRef<(rec: Recording) => Promise<void>>(async () => {});

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
      recorderRef.current?.cancel();
      browserRef.current?.cancel();
      stopSpeaking();
    };
  }, []);

  const log = useCallback((type: SessionEventType, value?: number) => {
    eventsRef.current.push({ type, at: new Date().toISOString(), ...(value !== undefined ? { value: Math.round(value) } : {}) });
  }, []);

  const setTurnsBoth = (next: ConversationTurn[]) => {
    turnsRef.current = next;
    setTurns(next);
  };

  const addTurn = (speaker: ConversationTurn["speaker"], text: string, inputMode?: ConversationTurn["inputMode"]) => {
    const next = [
      ...turnsRef.current,
      { speaker, text, at: new Date().toISOString(), sequence: turnsRef.current.length, inputMode, stage: stageRef.current },
    ];
    setTurnsBoth(next);
    return next;
  };

  const speakLine = useCallback(
    async (text: string, rateFactor = 1) => {
      setStatus("speaking");
      log("ai_speech_start");
      await speak(text, cfg.speechRate * rateFactor, {
        onBoundary: () => {
          lastBoundaryRef.current = performance.now();
        },
      });
      log("ai_speech_end");
      if (mountedRef.current) setStatus((s) => (s === "speaking" ? "idle" : s));
    },
    [cfg.speechRate, log],
  );

  const start = useCallback(() => {
    startedAtRef.current = new Date().toISOString();
    log("session_start");
    addTurn("ai", cfg.openingLine);
    setHint(scenario.usefulPhrases[0] ?? null);
    void speakLine(cfg.openingLine);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cfg.openingLine, scenario.usefulPhrases, speakLine, log]);

  const requestTurn = useCallback(
    async (history: ConversationTurn[]) => {
      busyRef.current = true;
      setError(null);
      setStatus("thinking");
      try {
        const res = await fetch("/api/conversation", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            scenarioId: scenario.id,
            comfortLevel: level,
            stage: stageRef.current,
            history: history.map((t) => ({ speaker: t.speaker, text: t.text })),
          }),
        });
        if (!res.ok) throw new Error(await errorMessage(res, "Your partner couldn't respond."));
        const turn = (await res.json()) as ConversationResponse;
        if (!mountedRef.current) return;
        stageRef.current = turn.scenarioStage;
        setStage(turn.scenarioStage);
        addTurn("ai", turn.reply);
        setHint(turn.hint);
        setHintVisible(false);
        setMode(turn.mode);
        setComplete(turn.isComplete);
        busyRef.current = false;
        await speakLine(turn.reply);
      } catch (e) {
        busyRef.current = false;
        if (!mountedRef.current) return;
        setStatus("error");
        setError({
          message: e instanceof Error && e.message !== "Failed to fetch" ? e.message : "Connection problem — check your internet.",
          retry: () => void requestTurnRef.current(history),
        });
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [scenario.id, level, speakLine],
  );

  const submitText = useCallback(
    (text: string, inputMode: "voice" | "text" = "text") => {
      const trimmed = text.trim();
      if (!trimmed || busyRef.current || complete) return false;
      stopSpeaking();
      if (inputMode === "text") log("text_submit");
      void requestTurn(addTurn("user", trimmed, inputMode));
      return true;
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [complete, requestTurn, log],
  );

  const transcribe = useCallback(
    async (rec: Recording) => {
      busyRef.current = true;
      setError(null);
      setStatus("transcribing");
      try {
        const form = new FormData();
        form.append("audio", rec.blob, rec.filename);
        const res = await fetch("/api/transcribe", { method: "POST", body: form });
        if (!res.ok) throw new Error(await errorMessage(res, "We couldn't transcribe that."));
        const data = (await res.json()) as TranscribeResponse;
        busyRef.current = false;
        if (!mountedRef.current) return;
        submitText(data.text, "voice");
      } catch (e) {
        busyRef.current = false;
        if (!mountedRef.current) return;
        setStatus("error");
        setError({
          message: e instanceof Error ? e.message : "We couldn't transcribe that.",
          retry: () => void transcribeRef.current(rec), // the recording only lives in memory for this retry
        });
      }
    },
    [submitText],
  );

  useEffect(() => {
    requestTurnRef.current = requestTurn;
    transcribeRef.current = transcribe;
  }, [requestTurn, transcribe]);

  const startRecording = useCallback(async () => {
    if (busyRef.current || complete) return;
    stopSpeaking(); // never record over the AI's voice
    setMicError(null);
    setError(null);
    if (voiceEngine === "browser") {
      browserRef.current = new BrowserPushToTalk((text) => setInterim(text));
      setInterim("");
      try {
        setStatus("listening");
        await browserRef.current.start();
        recordStartRef.current = performance.now();
        log("record_start");
      } catch (e) {
        browserRef.current = null;
        setStatus("idle");
        setMicError(browserRecognitionErrorMessage(e instanceof BrowserRecognitionError ? e.kind : "unsupported"));
      }
      return;
    }
    recorderRef.current ??= new PushToTalkRecorder();
    try {
      await recorderRef.current.start();
      log("record_start");
      setStatus("listening");
    } catch (e) {
      setStatus("idle");
      setMicError(e instanceof RecorderError ? recorderErrorMessage(e.kind) : recorderErrorMessage("unsupported"));
    }
  }, [complete, log, voiceEngine]);

  const stopRecording = useCallback(async () => {
    const browser = browserRef.current;
    if (browser) {
      browserRef.current = null;
      setStatus("transcribing");
      try {
        const text = await browser.stop();
        log("record_stop", performance.now() - recordStartRef.current);
        setInterim("");
        if (!text) {
          setStatus("idle");
          setError({ message: "We didn't catch that. Tap the mic, speak, then tap again when you're done — or type your reply." });
          return;
        }
        setStatus("idle");
        submitText(text, "voice");
      } catch (e) {
        setInterim("");
        setStatus("idle");
        setMicError(browserRecognitionErrorMessage(e instanceof BrowserRecognitionError ? e.kind : "unsupported"));
      }
      return;
    }
    const recorder = recorderRef.current;
    if (!recorder?.isRecording) return;
    try {
      const rec = await recorder.stop();
      log("record_stop", rec.durationMs);
      if (rec.durationMs < MIN_RECORDING_MS || rec.blob.size < 800) {
        setStatus("idle");
        setError({ message: "That was very short. Tap the mic, say your reply, then tap again when you're done." });
        return;
      }
      await transcribe(rec);
    } catch {
      setStatus("idle");
    }
  }, [log, transcribe, submitText]);

  const showHint = useCallback(() => {
    log("hint_requested");
    setHintVisible(true);
  }, [log]);

  const repeat = useCallback(() => {
    const lastAi = [...turnsRef.current].reverse().find((t) => t.speaker === "ai");
    if (!lastAi || status === "listening" || busyRef.current) return;
    log("repeat_requested");
    void speakLine(lastAi.text, 0.85);
  }, [status, speakLine, log]);

  const finish = useCallback((): ConversationSnapshot => {
    recorderRef.current?.cancel();
    browserRef.current?.cancel();
    stopSpeaking();
    log("session_end");
    return {
      turns: turnsRef.current,
      events: eventsRef.current,
      startedAt: startedAtRef.current,
      endedAt: new Date().toISOString(),
      complete,
      mode: mode ?? initialMode ?? "demo",
    };
  }, [complete, mode, initialMode, log]);

  const getLevel = useCallback(() => recorderRef.current?.getLevel() ?? null, []);

  return {
    turns,
    status,
    stage,
    hint,
    hintVisible,
    complete,
    /** Confirmed by the server on each turn; before the first turn, falls back to /api/status. */
    mode: mode ?? initialMode,
    error,
    micError,
    voiceEngine,
    interim,
    start,
    submitText,
    startRecording,
    stopRecording,
    showHint,
    repeat,
    finish,
    getLevel,
    lastBoundaryRef,
    dismissError: () => {
      setError(null);
      setStatus((s) => (s === "error" ? "idle" : s));
    },
  };
}
