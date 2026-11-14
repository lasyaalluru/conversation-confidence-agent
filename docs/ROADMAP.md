# Roadmap & backlog

## What's already built (initial setup)

- [x] Next.js 16 + TypeScript + Tailwind project, ESLint, folder structure
- [x] Home page with practice-language toggle and scenario cards (coffee active, others "Coming soon")
- [x] English / Simplified Chinese interface via next-intl (cookie-based, header toggle)
- [x] Café scenario content in English **and** Mandarin (`lib/scenarios.ts`) — *needs native-speaker review*
- [x] Push-to-talk recording (`VoiceRecorder`) with mic-denied / unsupported fallbacks + text input
- [x] `/api/transcribe` (OpenAI `gpt-transcribe`)
- [x] `/api/conversation-turn` role-play agent with scenario stages + structured output
- [x] Browser text-to-speech for AI replies (`lib/speech.ts`) + replay button
- [x] `/api/feedback` separate evaluator → structured JSON → feedback cards
- [x] Confidence before/after (1–5), real-world mission, progress page (localStorage)
- [x] Demo mode (no API key needed) for all three API routes
- [x] Supabase schema with Row Level Security (`supabase/schema.sql`) — not connected yet

## Backlog — create one GitHub Issue per item

Each issue needs an **acceptance criterion** ("Done when…").

### Member 1 — Frontend + product
- [ ] **Polish home page** — hero copy, illustration, "how it works" section. *Done when: a first-time visitor understands the product in 10 seconds (test with 2 people).*
- [ ] **Wireframe → design pass for the practice screen** — recording state, AI "speaking" indicator, mobile layout. *Done when: it works well on a phone-width screen.*
- [ ] **Show objectives progress during conversation** (e.g. checkmarks as stages are reached, using `stage`). *Done when: user can see which part of the conversation they're in.*
- [ ] **Native-speaker review of `messages/zh-CN.json`**. *Done when: a fluent Mandarin speaker has signed off.*
- [ ] **Accessibility check** — keyboard navigation, focus states, screen-reader labels.

### Member 2 — AI + voice
- [ ] **Test recording on Chrome + Safari (desktop & iPhone)**. *Done when: user can grant permission, record, and get a transcript on both browsers.*
- [ ] **Tune the barista prompt** in `lib/agent.ts`. *Done when: 5 test conversations each include a complication and end naturally in 4–6 exchanges.*
- [ ] **Mandarin scenario review** with a fluent speaker — cultural norms, not just translation.
- [ ] **Handle code-switching** (user mixes Mandarin + English). *Done when: agent responds gracefully in the practice language.*
- [ ] **Handle silence / empty transcripts** (user records nothing). *Done when: app asks them to try again instead of sending an empty turn.*
- [ ] **Add the "Talking to a classmate" scenario** (content in `lib/scenarios.ts`, set `available: true`).
- [ ] *Later:* better TTS voices (OpenAI TTS) or Realtime API for natural turn-taking.

### Member 3 — Backend + data
- [ ] **Create Supabase project**, run `supabase/schema.sql`, test RLS with two accounts. *Done when: user A cannot read user B's sessions.*
- [ ] **Swap `lib/progress.ts` to Supabase** (keep the same function signatures). Guest mode can stay on localStorage.
- [ ] **Login** (email magic link) via Supabase Auth + `@supabase/ssr`. *Done when: sessions persist across devices.*
- [ ] **Saved phrases** — "save" button on useful phrases → `saved_phrases` table.
- [ ] **Deploy to Vercel** with env vars; add Supabase redirect URLs. *Done when: teammates can practice on the public URL (mic works over HTTPS).*
- [ ] **API cost controls** — set an OpenAI spending limit; add basic rate limiting to API routes before the pilot.
- [ ] **Data deletion** — "Delete my data" also deletes from Supabase.

### Everyone
- [ ] **Test matrix** (below) before the pilot
- [ ] **Pilot with 5 students** (week 5) — record: completion rate, confidence change, missions tried, "would you do another scenario?", "how is this different from generic AI chat?"

## Test checklist

| Test case | Expected behavior |
| --- | --- |
| User speaks with a non-US accent (e.g. Indian, Chinese) | Intent is transcribed correctly; feedback never penalizes accent |
| Practice language = Mandarin | Agent replies only in Mandarin |
| User hesitates for several seconds | No negative judgment |
| User answers unexpectedly | Agent stays in character and on-scenario |
| User mixes Mandarin and English | Handled or politely clarified |
| Microphone denied | Clear message + text input still works |
| AI service down / no network | "Try again" appears, conversation is not lost |

## Five-week plan

| Week | Focus | Deliverable |
| --- | --- | --- |
| 1 | Setup, wireframes, everyone runs app locally, first PR each | ✅ Skeleton done — each member opens 1 small PR |
| 2 | Real voice conversation (with API key), browser testing | English café dialogue works on Chrome + Safari |
| 3 | Mandarin review, feedback quality, Supabase | Both languages + saved sessions |
| 4 | Confidence tracking, missions, reliability, internal testing | Pilot-ready MVP |
| 5 | Deploy, pilot with 5 students, fix issues, demo | Public link + testing results |

## Later (after MVP)

Adaptive difficulty · more scenarios · interview/professional vocabulary · noisy café simulation · spaced repetition of saved phrases · multi-person discussion · speech-timing analytics (validate across accents first) · *(avoid leaderboards — they reward already-fluent speakers)*
