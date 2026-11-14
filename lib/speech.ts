// Browser text-to-speech using the Web Speech API (free, no API key).
// Voice quality depends on the user's browser/OS. Later upgrade: OpenAI TTS or Realtime API.

import { SPEECH_LANG } from "@/lib/scenarios";
import type { Language } from "@/types";

export function canSpeak(): boolean {
  return typeof window !== "undefined" && "speechSynthesis" in window;
}

function pickVoice(lang: string): SpeechSynthesisVoice | undefined {
  const voices = window.speechSynthesis.getVoices();
  const prefix = lang.split("-")[0];
  return (
    voices.find((v) => v.lang === lang && v.localService) ??
    voices.find((v) => v.lang === lang) ??
    voices.find((v) => v.lang.startsWith(prefix))
  );
}

/** Speaks `text` and resolves when finished (or immediately if TTS is unavailable). */
export function speak(text: string, language: Language): Promise<void> {
  return new Promise((resolve) => {
    if (!canSpeak() || !text) return resolve();
    window.speechSynthesis.cancel();

    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = SPEECH_LANG[language];
    const voice = pickVoice(utterance.lang);
    if (voice) utterance.voice = voice;
    utterance.rate = 0.95;
    utterance.onend = () => resolve();
    utterance.onerror = () => resolve();
    window.speechSynthesis.speak(utterance);
  });
}

export function stopSpeaking() {
  if (canSpeak()) window.speechSynthesis.cancel();
}
