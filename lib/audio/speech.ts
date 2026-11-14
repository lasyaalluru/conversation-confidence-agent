"use client";

/**
 * AI voice output using the browser's Speech Synthesis API (free, no key).
 * Quality depends on the device's installed voices. Later upgrade path: a TTS API.
 *
 * `onBoundary` fires at real word boundaries (where supported), which drives the
 * "speaking" rhythm of the voice visualization — so it reflects actual speech timing,
 * not a decorative loop.
 */

export function canSpeak(): boolean {
  return typeof window !== "undefined" && "speechSynthesis" in window && typeof SpeechSynthesisUtterance !== "undefined";
}

const PREFERRED = /(natural|neural|premium|enhanced|google us english|samantha|aria|jenny|ava|allison)/i;

function waitForVoices(timeoutMs = 1200): Promise<SpeechSynthesisVoice[]> {
  const synth = window.speechSynthesis;
  const now = synth.getVoices();
  if (now.length) return Promise.resolve(now);
  return new Promise((resolve) => {
    const done = () => {
      synth.removeEventListener("voiceschanged", done);
      resolve(synth.getVoices());
    };
    synth.addEventListener("voiceschanged", done);
    setTimeout(done, timeoutMs);
  });
}

let cachedVoice: SpeechSynthesisVoice | null | undefined;

async function pickVoice(): Promise<SpeechSynthesisVoice | null> {
  if (cachedVoice !== undefined) return cachedVoice;
  const voices = (await waitForVoices()).filter((v) => v.lang?.toLowerCase().startsWith("en"));
  const us = voices.filter((v) => v.lang === "en-US" || v.lang === "en_US");
  cachedVoice =
    us.find((v) => PREFERRED.test(v.name)) ?? us.find((v) => v.localService) ?? us[0] ?? voices[0] ?? null;
  return cachedVoice;
}

export interface SpeakHandlers {
  onStart?: () => void;
  onBoundary?: () => void;
}

/** Speak `text`; resolves when finished, cancelled or failed (never rejects). */
export async function speak(text: string, rate: number, handlers: SpeakHandlers = {}): Promise<void> {
  if (!canSpeak() || !text.trim()) return;
  const synth = window.speechSynthesis;
  synth.cancel();
  const voice = await pickVoice();
  return new Promise((resolve) => {
    const u = new SpeechSynthesisUtterance(text);
    u.lang = "en-US";
    if (voice) u.voice = voice;
    u.rate = rate;
    u.pitch = 1;
    let settled = false;
    const finish = () => {
      if (settled) return;
      settled = true;
      clearTimeout(guard);
      resolve();
    };
    // Safety net: some browsers occasionally never fire `end`.
    const guard = setTimeout(finish, 2500 + text.length * 110);
    u.onstart = () => handlers.onStart?.();
    u.onboundary = () => handlers.onBoundary?.();
    u.onend = finish;
    u.onerror = finish;
    synth.speak(u);
  });
}

export function stopSpeaking() {
  if (canSpeak()) window.speechSynthesis.cancel();
}
