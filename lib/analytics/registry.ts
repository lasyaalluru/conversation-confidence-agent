/**
 * Registry of advanced speech metrics (FR-07 "advanced analytics architecture").
 *
 * Rule: a metric is only DISPLAYED as a number when `status === "validated"`.
 * Raw timing events needed for several of these are already recorded on every session
 * (see SessionEvent in types/domain.ts), so they can be computed retroactively once validated.
 */
export type MetricStatus = "validated" | "collecting" | "planned";

export interface SpeechMetric {
  id: string;
  name: string;
  description: string;
  source: "timing events" | "audio signal" | "transcript";
  status: MetricStatus;
  /** What must happen before we show it. */
  validationNeeded: string;
}

export const SPEECH_METRICS: SpeechMetric[] = [
  {
    id: "response_initiation",
    name: "Time to respond",
    description: "How long after the partner finishes before you start answering.",
    source: "timing events",
    status: "collecting",
    validationNeeded: "Today we record when you press the mic button, not when speech starts. Needs voice-onset detection.",
  },
  {
    id: "turn_duration",
    name: "Turn length",
    description: "How long each of your turns lasts.",
    source: "timing events",
    status: "collecting",
    validationNeeded: "Recording length includes silence before/after speaking. Needs trimming + validation.",
  },
  {
    id: "pause_length",
    name: "Pause length",
    description: "Silent gaps inside your turns.",
    source: "audio signal",
    status: "planned",
    validationNeeded: "Needs audio-level analysis validated across microphones and noisy rooms.",
  },
  {
    id: "speaking_rate",
    name: "Speaking rate",
    description: "Words per minute while speaking.",
    source: "transcript",
    status: "planned",
    validationNeeded: "Transcription accuracy varies by accent — must be checked against human transcripts.",
  },
  {
    id: "filler_words",
    name: "Filler words",
    description: "How often “um”, “uh”, “like” appear.",
    source: "transcript",
    status: "planned",
    validationNeeded: "Speech-to-text often removes fillers. Needs a verbatim model and accent-diverse checks.",
  },
  {
    id: "question_back",
    name: "Question-back rate",
    description: "How often you return a question to keep the conversation going.",
    source: "transcript",
    status: "planned",
    validationNeeded: "Needs agreement with human raters before it's shown as a number.",
  },
  {
    id: "phrase_variety",
    name: "Phrase variety",
    description: "How many different expressions you use unprompted.",
    source: "transcript",
    status: "planned",
    validationNeeded: "Needs a baseline across repeated scenarios.",
  },
];
