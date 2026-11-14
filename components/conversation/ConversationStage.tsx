"use client";

import { useEffect, useRef, useState } from "react";
import type { useConversation, VoiceStatus } from "@/hooks/useConversation";
import { Button } from "@/components/ui/Button";
import type { ComfortLevel, PlayableScenario } from "@/lib/scenarios/catalog";
import { VoiceOrb } from "./VoiceOrb";

type Conversation = ReturnType<typeof useConversation>;

function statusLabel(status: VoiceStatus, name: string, demoTyping: boolean): string {
  switch (status) {
    case "speaking":
      return `${name} is speaking…`;
    case "listening":
      return "Listening… tap again when you're done";
    case "transcribing":
      return "Processing what you said…";
    case "thinking":
      return `${name} is thinking…`;
    case "error":
      return "Something went wrong";
    default:
      return demoTyping ? "Your turn — type your reply" : "Your turn — tap the mic and speak";
  }
}

export function ConversationStage({
  scenario,
  level,
  convo,
  onContinue,
}: {
  scenario: PlayableScenario;
  level: ComfortLevel;
  convo: Conversation;
  onContinue: () => void;
}) {
  const { status, turns, hint, hintVisible, complete, error, micError, mode } = convo;
  const [draft, setDraft] = useState("");
  const [showTranscript, setShowTranscript] = useState(true);
  const transcriptRef = useRef<HTMLOListElement>(null);
  const name = scenario.character.name;
  const demo = mode === "demo";
  const lastAi = [...turns].reverse().find((t) => t.speaker === "ai");
  const busy = status === "thinking" || status === "transcribing";
  const listening = status === "listening";
  const hintsOffered = scenario.levels[level].hints === "offered";

  // Scroll the transcript panel itself — never the page (that would hide the controls on phones).
  useEffect(() => {
    const el = transcriptRef.current;
    if (el) el.scrollTo({ top: el.scrollHeight, behavior: "smooth" });
  }, [turns.length]);

  return (
    <div className="mx-auto grid w-full max-w-6xl flex-1 gap-6 lg:grid-cols-[minmax(0,1fr)_380px]">
      {/* Main: orb, status, current line, controls */}
      <section className="flex flex-col items-center" aria-label="Conversation">
        <div className="relative w-[min(72vw,320px)]">
          <VoiceOrb status={status} getLevel={convo.getLevel} lastBoundaryRef={convo.lastBoundaryRef} />
        </div>

        <p role="status" aria-live="polite" className="mt-2 text-sm text-ivory/60">
          {complete && status !== "speaking" ? "Conversation complete" : statusLabel(status, name, demo)}
        </p>

        <blockquote className="mt-5 min-h-[4.5rem] max-w-xl text-center font-display text-[clamp(1.5rem,3.2vw,2.15rem)] leading-snug text-ivory">
          {lastAi ? <>&ldquo;{lastAi.text}&rdquo;</> : null}
        </blockquote>

        {(error || micError) && (
          <div role="alert" className="mt-5 flex max-w-xl flex-wrap items-center justify-center gap-3 rounded-2xl border border-[#e8a598]/30 bg-[#e8a598]/10 px-4 py-3 text-center text-sm text-[#f3c9bf]">
            <span>{error?.message ?? micError}</span>
            {error?.retry && (
              <button type="button" onClick={error.retry} className="font-medium text-ivory underline underline-offset-4">
                Try again
              </button>
            )}
            {error && !error.retry && (
              <button type="button" onClick={convo.dismissError} className="font-medium text-ivory underline underline-offset-4">
                OK
              </button>
            )}
          </div>
        )}

        {hintVisible && hint && !complete && (
          <div className="mt-5 max-w-xl rounded-2xl border border-lavender/25 bg-lavender/10 px-5 py-3 text-center">
            <p className="text-xs uppercase tracking-[0.18em] text-lavender">You could say</p>
            <p className="mt-1 text-ivory">&ldquo;{hint}&rdquo;</p>
          </div>
        )}

        {complete ? (
          <div className="mt-10 flex flex-col items-center gap-4 text-center">
            <p className="font-display text-3xl text-ivory">Nicely done.</p>
            <p className="max-w-sm text-ivory/65">That&apos;s a complete conversation. Let&apos;s look at what went well.</p>
            <Button variant="glow" size="lg" onClick={onContinue} autoFocus>
              Continue to feedback →
            </Button>
          </div>
        ) : (
          <div className="mt-auto flex w-full max-w-xl flex-col items-center gap-5 pt-8">
            <div className="flex items-center justify-center gap-4 sm:gap-6">
              <Button
                variant="outline-dark"
                onClick={convo.showHint}
                disabled={!hint || hintVisible || listening}
                className={hintsOffered && hint && !hintVisible ? "border-lavender/60 text-lavender" : ""}
                aria-label="Show a hint for what to say"
              >
                Hint
              </Button>

              <button
                type="button"
                onClick={listening ? convo.stopRecording : convo.startRecording}
                disabled={busy || demo}
                aria-pressed={listening}
                aria-label={listening ? "Stop recording and send" : "Start recording your reply"}
                className={`relative flex h-20 w-20 items-center justify-center rounded-full transition-all disabled:opacity-35 ${
                  listening
                    ? "bg-sage text-midnight shadow-[0_0_0_8px_rgb(167_220_203/0.18),0_0_40px_rgb(167_220_203/0.5)]"
                    : "bg-ivory text-midnight shadow-[0_0_40px_-6px_rgb(186_172_247/0.7)] hover:scale-105"
                }`}
              >
                {listening ? (
                  <span className="h-6 w-6 rounded-[6px] bg-midnight" aria-hidden />
                ) : (
                  <svg viewBox="0 0 24 24" className="h-8 w-8" aria-hidden>
                    <path
                      d="M12 3a3 3 0 0 1 3 3v6a3 3 0 0 1-6 0V6a3 3 0 0 1 3-3Zm-6.5 9a6.5 6.5 0 0 0 13 0M12 18.5V21"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="1.7"
                      strokeLinecap="round"
                    />
                  </svg>
                )}
              </button>

              <Button
                variant="outline-dark"
                onClick={convo.repeat}
                disabled={!lastAi || listening || busy}
                aria-label={`Ask ${name} to repeat, a little slower`}
              >
                Repeat
              </Button>
            </div>
            {demo && <p className="text-xs text-ivory/45">Mic is off in Demo Mode — voice transcription needs an AI key.</p>}

            <form
              className="flex w-full gap-2"
              onSubmit={(e) => {
                e.preventDefault();
                if (convo.submitText(draft)) setDraft("");
              }}
            >
              <label htmlFor="reply" className="sr-only">
                Type your reply
              </label>
              <input
                id="reply"
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                placeholder={demo ? "Type your reply…" : "Or type your reply…"}
                autoComplete="off"
                maxLength={500}
                disabled={listening}
                className="h-12 flex-1 rounded-full border border-white/15 bg-white/[0.06] px-5 text-ivory placeholder:text-ivory/40 focus:border-lavender/60 focus:outline-none"
              />
              <Button type="submit" variant="outline-dark" disabled={!draft.trim() || busy || listening} className="h-12">
                Send
              </Button>
            </form>
          </div>
        )}
      </section>

      {/* Transcript */}
      <aside className="flex flex-col rounded-[2rem] border border-white/10 bg-white/[0.03] p-5 backdrop-blur lg:max-h-[calc(100svh-9rem)]">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-medium text-ivory/80">Transcript</h2>
          <button
            type="button"
            onClick={() => setShowTranscript((v) => !v)}
            aria-expanded={showTranscript}
            aria-controls="transcript"
            className="text-xs text-ivory/55 underline-offset-4 hover:text-ivory hover:underline"
          >
            {showTranscript ? "Hide" : "View transcript"}
          </button>
        </div>
        {showTranscript && (
          <ol id="transcript" ref={transcriptRef} className="mt-4 flex max-h-[45svh] flex-col gap-3 overflow-y-auto pr-1 text-[15px] lg:max-h-none">
            {turns.map((t) => (
              <li key={t.sequence} className={`flex flex-col ${t.speaker === "user" ? "items-end" : "items-start"}`}>
                <span className="mb-1 text-[11px] uppercase tracking-wider text-ivory/40">
                  {t.speaker === "user" ? `You${t.inputMode === "text" ? " · typed" : ""}` : name}
                </span>
                <span
                  className={`max-w-[90%] rounded-2xl px-4 py-2 leading-relaxed ${
                    t.speaker === "user" ? "bg-lavender/20 text-ivory" : "bg-white/[0.06] text-ivory/90"
                  }`}
                >
                  {t.text}
                </span>
              </li>
            ))}
          </ol>
        )}
      </aside>
    </div>
  );
}
