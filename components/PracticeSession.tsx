"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import ConfidenceRating from "@/components/ConfidenceRating";
import FeedbackCard from "@/components/FeedbackCard";
import VoiceRecorder from "@/components/VoiceRecorder";
import { saveSession } from "@/lib/progress";
import { speak, stopSpeaking } from "@/lib/speech";
import type {
  ChatMessage,
  ConversationTurnResponse,
  Feedback,
  Language,
  ScenarioContent,
  ScenarioStage,
  TranscribeResponse,
} from "@/types";

/**
 * The whole practice flow for one scenario:
 *   intro (objectives + confidence before)
 *   → conversation (AI speaks → user records/types → transcribe → AI replies → …)
 *   → feedback (AI evaluation + confidence after + real-world mission → save)
 */
type Phase = "intro" | "conversation" | "feedback" | "saved";
type Busy = null | "thinking" | "transcribing" | "speaking";

async function postJson<T>(url: string, body: unknown): Promise<T> {
  const res = await fetch(url, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
  if (!res.ok) throw new Error((await res.json().catch(() => null))?.error ?? res.statusText);
  return res.json();
}

export default function PracticeSession({
  scenarioId,
  practiceLanguage,
  content,
  title,
}: {
  scenarioId: string;
  practiceLanguage: Language;
  content: ScenarioContent;
  title: string;
}) {
  const t = useTranslations();
  const uiLanguage = useLocale() as Language;

  const [phase, setPhase] = useState<Phase>("intro");
  const [sessionId, setSessionId] = useState("");
  const [startedAt, setStartedAt] = useState("");
  const [confidenceBefore, setConfidenceBefore] = useState<number | null>(null);
  const [confidenceAfter, setConfidenceAfter] = useState<number | null>(null);

  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [stage, setStage] = useState<ScenarioStage>("greeting");
  const [complete, setComplete] = useState(false);
  const [busy, setBusy] = useState<Busy>(null);
  const [error, setError] = useState<{ retry: () => void } | null>(null);
  const [mock, setMock] = useState(false);
  const [draft, setDraft] = useState("");

  const [feedback, setFeedback] = useState<Feedback | null>(null);
  const [feedbackError, setFeedbackError] = useState(false);

  const bottomRef = useRef<HTMLDivElement>(null);
  useEffect(() => bottomRef.current?.scrollIntoView({ behavior: "smooth" }), [messages, busy]);
  useEffect(() => () => stopSpeaking(), []);

  async function say(text: string) {
    setBusy("speaking");
    await speak(text, practiceLanguage);
    setBusy(null);
  }

  // ----- conversation -----

  function begin() {
    setSessionId(crypto.randomUUID());
    setStartedAt(new Date().toISOString());
    setMessages([{ role: "ai", text: content.openingLine }]);
    setPhase("conversation");
    void say(content.openingLine); // called from a click, so browsers allow audio
  }

  async function requestTurn(history: ChatMessage[]) {
    setError(null);
    setBusy("thinking");
    try {
      const turn = await postJson<ConversationTurnResponse>("/api/conversation-turn", {
        scenarioId,
        practiceLanguage,
        stage,
        history,
      });
      if (turn.mock) setMock(true);
      setMessages([...history, { role: "ai", text: turn.reply }]);
      setStage(turn.stage);
      setComplete(turn.isComplete);
      await say(turn.reply);
    } catch {
      setBusy(null);
      setError({ retry: () => requestTurn(history) });
    }
  }

  function sendUserText(text: string) {
    const trimmed = text.trim();
    if (!trimmed) return;
    const history: ChatMessage[] = [...messages, { role: "user", text: trimmed }];
    setMessages(history);
    setDraft("");
    void requestTurn(history);
  }

  async function handleRecorded(audio: Blob, filename: string) {
    stopSpeaking();
    setError(null);
    setBusy("transcribing");
    try {
      const form = new FormData();
      form.append("audio", audio, filename);
      form.append("language", practiceLanguage);
      const res = await fetch("/api/transcribe", { method: "POST", body: form });
      if (!res.ok) throw new Error();
      const data: TranscribeResponse = await res.json();
      if (data.mock) setMock(true);
      setBusy(null);
      sendUserText(data.text);
    } catch {
      setBusy(null);
      setError({ retry: () => handleRecorded(audio, filename) });
    }
  }

  // ----- feedback -----

  async function finish() {
    stopSpeaking();
    setPhase("feedback");
    setFeedbackError(false);
    try {
      const fb = await postJson<Feedback>("/api/feedback", { scenarioId, practiceLanguage, uiLanguage, history: messages });
      setFeedback(fb);
    } catch {
      setFeedbackError(true);
    }
  }

  function save() {
    saveSession({
      id: sessionId,
      scenarioId,
      practiceLanguage,
      startedAt,
      confidenceBefore,
      confidenceAfter,
      turns: messages.filter((m) => m.role === "user").length,
      feedback,
      mission: content.mission,
      missionStatus: "pending",
    });
    setPhase("saved");
  }

  const userTurns = messages.filter((m) => m.role === "user").length;

  // ----- render -----

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-1">
        <Link href={`/?lang=${practiceLanguage}`} className="text-sm text-muted hover:text-foreground">
          ← {t("common.home")}
        </Link>
        <h1 className="text-2xl font-semibold tracking-tight">{title}</h1>
        <p className="text-sm text-muted">
          {t("common.practiceLanguage")}: {t(`common.languages.${practiceLanguage}`)}
        </p>
      </div>

      {mock && (
        <p className="rounded-xl bg-warn-soft text-warn text-sm px-4 py-2">{t("common.mockMode")}</p>
      )}

      {phase === "intro" && (
        <section className="flex flex-col gap-6 rounded-2xl border border-line bg-surface p-6">
          <div>
            <h2 className="font-semibold mb-2">{t("practice.objectives")}</h2>
            <ul className="list-disc pl-5 text-sm leading-relaxed text-muted">
              {content.objectives.map((o) => (
                <li key={o}>{o}</li>
              ))}
            </ul>
          </div>
          <ConfidenceRating label={t("practice.confidenceBefore")} value={confidenceBefore} onChange={setConfidenceBefore} />
          <button
            type="button"
            onClick={begin}
            disabled={confidenceBefore === null}
            className="self-start rounded-full bg-accent text-accent-foreground px-6 py-3 font-medium disabled:opacity-40"
          >
            {t("practice.begin")}
          </button>
          <p className="text-xs text-muted">{t("practice.privacy")}</p>
        </section>
      )}

      {phase === "conversation" && (
        <section className="flex flex-col gap-4">
          <ol className="flex flex-col gap-3">
            {messages.map((m, i) => (
              <li key={i} className={`flex flex-col max-w-[85%] ${m.role === "user" ? "self-end items-end" : "self-start"}`}>
                <span className="text-xs text-muted mb-1">{m.role === "user" ? t("practice.you") : t("practice.partner")}</span>
                <div
                  className={`rounded-2xl px-4 py-2.5 leading-relaxed ${
                    m.role === "user" ? "bg-accent text-accent-foreground" : "bg-surface border border-line"
                  }`}
                >
                  {m.text}
                </div>
                {m.role === "ai" && (
                  <button type="button" onClick={() => say(m.text)} className="text-xs text-muted hover:text-foreground mt-1">
                    🔊 {t("practice.replay")}
                  </button>
                )}
              </li>
            ))}
          </ol>

          {busy && busy !== "speaking" && (
            <p className="text-sm text-muted">{busy === "thinking" ? t("practice.thinking") : t("practice.transcribing")}</p>
          )}
          {error && (
            <div className="flex items-center gap-3 text-sm text-warn">
              <span>{t("practice.error")}</span>
              <button type="button" onClick={error.retry} className="underline">
                {t("practice.retry")}
              </button>
            </div>
          )}
          <div ref={bottomRef} />

          {complete ? (
            <div className="flex flex-col items-center gap-3 py-4">
              <p className="font-medium">{t("practice.conversationComplete")}</p>
              <button type="button" onClick={finish} className="rounded-full bg-accent text-accent-foreground px-6 py-3 font-medium">
                {t("practice.endSession")}
              </button>
            </div>
          ) : (
            <div className="flex flex-col gap-4 border-t border-line pt-4">
              <VoiceRecorder onRecorded={handleRecorded} disabled={busy === "thinking" || busy === "transcribing"} />
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  sendUserText(draft);
                }}
                className="flex gap-2"
              >
                <input
                  value={draft}
                  onChange={(e) => setDraft(e.target.value)}
                  placeholder={t("practice.typeInstead")}
                  lang={practiceLanguage}
                  className="flex-1 rounded-full border border-line bg-surface px-4 py-2 text-sm"
                />
                <button
                  type="submit"
                  disabled={!draft.trim() || busy === "thinking" || busy === "transcribing"}
                  className="rounded-full border border-line px-4 py-2 text-sm disabled:opacity-40"
                >
                  {t("practice.send")}
                </button>
              </form>
              {userTurns > 0 && (
                <button type="button" onClick={finish} className="self-center text-sm text-muted underline">
                  {t("practice.endSession")}
                </button>
              )}
            </div>
          )}
        </section>
      )}

      {(phase === "feedback" || phase === "saved") && (
        <section className="flex flex-col gap-6">
          <h2 className="text-xl font-semibold">{t("feedback.title")}</h2>

          {!feedback && !feedbackError && <p className="text-muted">{t("feedback.loading")}</p>}
          {feedbackError && (
            <div className="flex items-center gap-3 text-sm text-warn">
              <span>{t("practice.error")}</span>
              <button type="button" onClick={finish} className="underline">
                {t("practice.retry")}
              </button>
            </div>
          )}

          {feedback && (
            <>
              <p className="leading-relaxed">{feedback.summary}</p>
              <div className="grid gap-3">
                {feedback.items.map((item, i) => (
                  <FeedbackCard key={i} item={item} />
                ))}
              </div>
              {feedback.usefulPhrases.length > 0 && (
                <div>
                  <h3 className="font-semibold mb-2">{t("feedback.usefulPhrases")}</h3>
                  <ul className="flex flex-wrap gap-2">
                    {feedback.usefulPhrases.map((p) => (
                      <li key={p} className="rounded-full bg-accent-soft text-accent text-sm px-3 py-1">
                        {p}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </>
          )}

          <div className="rounded-2xl border border-accent bg-accent-soft p-5">
            <h3 className="font-semibold text-accent mb-1">🎯 {t("feedback.mission")}</h3>
            <p className="leading-relaxed">{content.mission}</p>
          </div>

          {phase === "feedback" ? (
            <div className="flex flex-col gap-4 rounded-2xl border border-line bg-surface p-6">
              <ConfidenceRating label={t("practice.confidenceAfter")} value={confidenceAfter} onChange={setConfidenceAfter} />
              <button
                type="button"
                onClick={save}
                disabled={confidenceAfter === null}
                className="self-start rounded-full bg-accent text-accent-foreground px-6 py-3 font-medium disabled:opacity-40"
              >
                {t("feedback.save")}
              </button>
            </div>
          ) : (
            <div className="flex flex-wrap gap-3">
              <Link href="/progress" className="rounded-full bg-accent text-accent-foreground px-6 py-3 font-medium">
                {t("feedback.saved")}
              </Link>
              <button
                type="button"
                onClick={() => window.location.reload()}
                className="rounded-full border border-line px-6 py-3 font-medium"
              >
                {t("feedback.practiceAgain")}
              </button>
            </div>
          )}
        </section>
      )}
    </div>
  );
}
