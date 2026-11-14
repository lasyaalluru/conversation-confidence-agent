"use client";

/**
 * Push-to-talk recorder (browser MediaRecorder + Web Audio level meter).
 *
 *  - Only starts from an explicit user action. The microphone is released after every turn,
 *    so the browser's "mic in use" indicator turns off between turns.
 *  - Chrome/Firefox record webm/opus, Safari records mp4/aac — the filename extension must
 *    match for the transcription API.
 *  - getLevel() returns the REAL input amplitude (0–1) for the voice visualization.
 */

const FORMATS = [
  { mime: "audio/webm;codecs=opus", ext: "webm" },
  { mime: "audio/webm", ext: "webm" },
  { mime: "audio/mp4", ext: "mp4" },
  { mime: "audio/ogg;codecs=opus", ext: "ogg" },
];

export type RecorderErrorKind = "denied" | "no_microphone" | "unsupported" | "insecure" | "busy";

export class RecorderError extends Error {
  constructor(public kind: RecorderErrorKind) {
    super(kind);
  }
}

export interface Recording {
  blob: Blob;
  filename: string;
  durationMs: number;
}

export function isRecordingSupported(): boolean {
  return typeof window !== "undefined" && !!navigator.mediaDevices?.getUserMedia && typeof MediaRecorder !== "undefined";
}

export class PushToTalkRecorder {
  private stream: MediaStream | null = null;
  private recorder: MediaRecorder | null = null;
  private chunks: Blob[] = [];
  private audioCtx: AudioContext | null = null;
  private analyser: AnalyserNode | null = null;
  private buffer: Uint8Array<ArrayBuffer> | null = null;
  private startedAt = 0;

  get isRecording() {
    return this.recorder?.state === "recording";
  }

  async start(): Promise<void> {
    if (!window.isSecureContext) throw new RecorderError("insecure");
    if (!isRecordingSupported()) throw new RecorderError("unsupported");
    if (this.isRecording) return;

    try {
      this.stream = await navigator.mediaDevices.getUserMedia({
        audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true },
      });
    } catch (e) {
      const name = (e as DOMException)?.name;
      if (name === "NotAllowedError" || name === "SecurityError") throw new RecorderError("denied");
      if (name === "NotFoundError" || name === "OverconstrainedError") throw new RecorderError("no_microphone");
      if (name === "NotReadableError") throw new RecorderError("busy");
      throw new RecorderError("unsupported");
    }

    const format = FORMATS.find((f) => MediaRecorder.isTypeSupported(f.mime));
    this.recorder = new MediaRecorder(this.stream, format ? { mimeType: format.mime } : undefined);
    this.chunks = [];
    this.recorder.ondataavailable = (e) => {
      if (e.data.size > 0) this.chunks.push(e.data);
    };

    try {
      const Ctx = window.AudioContext ?? (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      this.audioCtx = new Ctx();
      const source = this.audioCtx.createMediaStreamSource(this.stream);
      this.analyser = this.audioCtx.createAnalyser();
      this.analyser.fftSize = 512;
      this.buffer = new Uint8Array(new ArrayBuffer(this.analyser.fftSize));
      source.connect(this.analyser);
    } catch {
      // Level meter is optional — the visualization falls back to a status-based animation.
      this.analyser = null;
    }

    this.recorder.start(250);
    this.startedAt = performance.now();
  }

  /** RMS input level, 0–1. Returns null when no real measurement is available. */
  getLevel(): number | null {
    if (!this.analyser || !this.buffer || !this.isRecording) return null;
    this.analyser.getByteTimeDomainData(this.buffer);
    let sum = 0;
    for (let i = 0; i < this.buffer.length; i++) {
      const v = (this.buffer[i] - 128) / 128;
      sum += v * v;
    }
    return Math.min(1, Math.sqrt(sum / this.buffer.length) * 4);
  }

  stop(): Promise<Recording> {
    return new Promise((resolve, reject) => {
      const rec = this.recorder;
      if (!rec || rec.state === "inactive") {
        this.release();
        reject(new Error("not recording"));
        return;
      }
      rec.onstop = () => {
        const type = rec.mimeType || "audio/webm";
        const ext = FORMATS.find((f) => type.startsWith(f.mime.split(";")[0]))?.ext ?? "webm";
        const durationMs = performance.now() - this.startedAt;
        const blob = new Blob(this.chunks, { type: type.split(";")[0] });
        this.release();
        resolve({ blob, filename: `turn.${ext}`, durationMs });
      };
      rec.stop();
    });
  }

  /** Stop everything without producing a recording (e.g. leaving the page). */
  cancel() {
    if (this.recorder && this.recorder.state !== "inactive") {
      this.recorder.onstop = null;
      this.recorder.stop();
    }
    this.release();
  }

  private release() {
    this.stream?.getTracks().forEach((t) => t.stop());
    this.stream = null;
    this.recorder = null;
    void this.audioCtx?.close().catch(() => {});
    this.audioCtx = null;
    this.analyser = null;
  }
}

export function recorderErrorMessage(kind: RecorderErrorKind): string {
  switch (kind) {
    case "denied":
      return "Microphone access is blocked. Allow it in your browser's site settings, or type your reply below.";
    case "no_microphone":
      return "We couldn't find a microphone. Plug one in, or type your reply below.";
    case "busy":
      return "Your microphone is being used by another app. Close it and try again, or type your reply.";
    case "insecure":
      return "The microphone only works on a secure (https) page. You can type your reply instead.";
    default:
      return "This browser can't record audio. You can type your reply instead.";
  }
}
