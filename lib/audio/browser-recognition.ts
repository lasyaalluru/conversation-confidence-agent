"use client";

/**
 * Push-to-talk speech-to-text using the BROWSER's built-in speech recognition
 * (Web Speech API: Chrome, Edge, Safari incl. iPhone). Needs no API key, so voice works in
 * Demo Mode and on free deployments.
 *
 * Privacy: the browser vendor processes the audio (Chrome/Edge → Google/Microsoft servers,
 * Safari → Apple, often on-device). We never receive or store the audio — only the text.
 * Firefox doesn't support it; the app falls back to typing there.
 */

// Minimal typings — the Web Speech API isn't in TypeScript's DOM lib.
interface RecognitionAlternative {
  transcript: string;
}
interface RecognitionResult {
  isFinal: boolean;
  0: RecognitionAlternative;
}
interface RecognitionEvent {
  resultIndex: number;
  results: { length: number; [i: number]: RecognitionResult };
}
interface RecognitionErrorEvent {
  error: string;
}
interface Recognition {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  maxAlternatives: number;
  onresult: ((e: RecognitionEvent) => void) | null;
  onerror: ((e: RecognitionErrorEvent) => void) | null;
  onend: (() => void) | null;
  start(): void;
  stop(): void;
  abort(): void;
}
type RecognitionCtor = new () => Recognition;

function getCtor(): RecognitionCtor | null {
  if (typeof window === "undefined") return null;
  const w = window as unknown as { SpeechRecognition?: RecognitionCtor; webkitSpeechRecognition?: RecognitionCtor };
  return w.SpeechRecognition ?? w.webkitSpeechRecognition ?? null;
}

export function isBrowserRecognitionSupported(): boolean {
  return getCtor() !== null;
}

export class BrowserRecognitionError extends Error {
  constructor(public kind: "denied" | "no_microphone" | "network" | "unsupported" | "aborted") {
    super(kind);
  }
}

export function browserRecognitionErrorMessage(kind: BrowserRecognitionError["kind"]): string {
  switch (kind) {
    case "denied":
      return "Microphone access is blocked. Allow it in your browser's site settings, or type your reply below.";
    case "no_microphone":
      return "We couldn't find a microphone. Plug one in, or type your reply below.";
    case "network":
      return "Your browser's speech service couldn't be reached. Check your connection, or type your reply.";
    default:
      return "Voice input isn't available in this browser (try Chrome, Edge or Safari). You can type instead.";
  }
}

/** One recognizer per turn: start() on tap, stop() on second tap → final text. */
export class BrowserPushToTalk {
  private rec: Recognition | null = null;
  private finalText = "";
  private interim = "";
  private ended: Promise<void> | null = null;
  private error: BrowserRecognitionError | null = null;
  private onInterim: (text: string) => void;

  constructor(onInterim: (text: string) => void = () => {}) {
    this.onInterim = onInterim;
  }

  get isListening() {
    return this.rec !== null;
  }

  /** Resolves once listening has begun; rejects for permission/unsupported errors. */
  start(): Promise<void> {
    const Ctor = getCtor();
    if (!Ctor) return Promise.reject(new BrowserRecognitionError("unsupported"));
    if (this.rec) return Promise.resolve();

    const rec = new Ctor();
    rec.lang = "en-US";
    rec.continuous = true; // keep listening through pauses until the learner taps again
    rec.interimResults = true;
    rec.maxAlternatives = 1;
    this.finalText = "";
    this.interim = "";
    this.error = null;
    this.rec = rec;

    let resolveEnd!: () => void;
    this.ended = new Promise((r) => (resolveEnd = r));

    return new Promise<void>((resolveStart, rejectStart) => {
      let started = false;
      rec.onresult = (e) => {
        started = true;
        let interim = "";
        for (let i = e.resultIndex; i < e.results.length; i++) {
          const r = e.results[i];
          if (r.isFinal) this.finalText += `${r[0].transcript} `;
          else interim += r[0].transcript;
        }
        this.interim = interim;
        this.onInterim(`${this.finalText}${interim}`.trim());
      };
      rec.onerror = (e) => {
        const kind =
          e.error === "not-allowed" || e.error === "service-not-allowed"
            ? "denied"
            : e.error === "audio-capture"
              ? "no_microphone"
              : e.error === "network"
                ? "network"
                : e.error === "no-speech" || e.error === "aborted"
                  ? "aborted"
                  : "unsupported";
        this.error = new BrowserRecognitionError(kind);
        if (!started && kind !== "aborted") {
          this.rec = null;
          rejectStart(this.error);
        }
      };
      rec.onend = () => {
        this.rec = null;
        resolveEnd();
      };
      try {
        rec.start();
        // Most browsers have no reliable "started" event across vendors; give permission prompts a moment.
        setTimeout(() => {
          if (this.error && this.error.kind !== "aborted") rejectStart(this.error);
          else resolveStart();
        }, 250);
      } catch {
        this.rec = null;
        rejectStart(new BrowserRecognitionError("unsupported"));
      }
    });
  }

  /** Stop listening and return everything recognized (may be empty). */
  async stop(): Promise<string> {
    const rec = this.rec;
    if (rec) {
      try {
        rec.stop();
      } catch {}
      // Safety net: some browsers occasionally never fire `end`.
      await Promise.race([this.ended, new Promise((r) => setTimeout(r, 2500))]);
    }
    this.rec = null;
    const text = `${this.finalText}${this.interim}`.replace(/\s+/g, " ").trim();
    if (!text && this.error && this.error.kind !== "aborted") throw this.error;
    return text;
  }

  cancel() {
    try {
      this.rec?.abort();
    } catch {}
    this.rec = null;
  }
}
