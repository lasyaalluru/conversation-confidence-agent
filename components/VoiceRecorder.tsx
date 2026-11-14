"use client";

import { useRef, useState } from "react";
import { useTranslations } from "next-intl";

/**
 * Push-to-talk recorder: tap to start, tap "Done speaking" to stop.
 * Calls onRecorded() with the audio Blob and a filename whose extension matches the format
 * (Chrome/Firefox record webm, Safari records mp4 — the transcription API needs the right extension).
 *
 * Needs a secure context (https:// or localhost) and the user's permission.
 */
const MIME_CANDIDATES = [
  { mime: "audio/webm;codecs=opus", ext: "webm" },
  { mime: "audio/webm", ext: "webm" },
  { mime: "audio/mp4", ext: "mp4" },
  { mime: "audio/ogg;codecs=opus", ext: "ogg" },
];

type RecorderError = "denied" | "unsupported" | null;

export default function VoiceRecorder({
  onRecorded,
  disabled,
}: {
  onRecorded: (audio: Blob, filename: string) => void;
  disabled?: boolean;
}) {
  const t = useTranslations("practice");
  const [recording, setRecording] = useState(false);
  const [error, setError] = useState<RecorderError>(null);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);

  async function start() {
    if (typeof window === "undefined" || !navigator.mediaDevices?.getUserMedia || typeof MediaRecorder === "undefined") {
      setError("unsupported");
      return;
    }
    let stream: MediaStream;
    try {
      stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    } catch {
      setError("denied");
      return;
    }
    setError(null);

    const format = MIME_CANDIDATES.find((c) => MediaRecorder.isTypeSupported(c.mime));
    const recorder = new MediaRecorder(stream, format ? { mimeType: format.mime } : undefined);
    chunksRef.current = [];

    recorder.ondataavailable = (e) => {
      if (e.data.size > 0) chunksRef.current.push(e.data);
    };
    recorder.onstop = () => {
      stream.getTracks().forEach((track) => track.stop()); // release the mic
      const blob = new Blob(chunksRef.current, { type: recorder.mimeType });
      const ext = MIME_CANDIDATES.find((c) => recorder.mimeType.startsWith(c.mime.split(";")[0]))?.ext ?? "webm";
      if (blob.size > 0) onRecorded(blob, `speech.${ext}`);
    };

    recorderRef.current = recorder;
    recorder.start();
    setRecording(true);
  }

  function stop() {
    recorderRef.current?.stop();
    recorderRef.current = null;
    setRecording(false);
  }

  return (
    <div className="flex flex-col items-center gap-2">
      <button
        type="button"
        onClick={recording ? stop : start}
        disabled={disabled && !recording}
        className={`h-16 min-w-44 rounded-full px-6 font-medium transition-colors disabled:opacity-40 ${
          recording ? "bg-red-600 text-white animate-pulse" : "bg-accent text-accent-foreground hover:opacity-90"
        }`}
      >
        {recording ? `■ ${t("doneSpeaking")}` : `🎙 ${t("tapToRecord")}`}
      </button>
      {error && (
        <p className="text-sm text-warn text-center max-w-sm">{error === "denied" ? t("micDenied") : t("micUnsupported")}</p>
      )}
    </div>
  );
}
