# Confidence Coach — AI Conversation Confidence Agent

A bilingual (English + Mandarin) web app that helps people who already know a language become **confident speaking it** in real-life conversations. Learners role-play realistic scenarios with an AI voice partner, get personalized feedback, track their confidence, and take on real-world missions.

> **Status: MVP skeleton — the full flow works end-to-end.**
> Home → choose practice language → "Ordering coffee" → rate confidence → talk with the AI barista (voice or text) → feedback → confidence after → real-world mission → progress page.
> Without an OpenAI key it runs in **demo mode** with scripted replies, so anyone can work on the UI for free.

---

## Quick start (5 minutes)

**Prerequisites:** [Node.js](https://nodejs.org) 20.9+ (LTS recommended), Git, VS Code.

```bash
git clone https://github.com/lasyaalluru/conversation-confidence-agent.git
cd conversation-confidence-agent
npm install
cp .env.example .env.local     # optional: add OPENAI_API_KEY for real AI
npm run dev
```

Open **http://localhost:3000**. Use Chrome or Safari — the microphone only works on `localhost` or `https://`.

| Command | What it does |
| --- | --- |
| `npm run dev` | Start the dev server with hot reload |
| `npm run build` | Production build (run before opening a PR — catches type errors) |
| `npm run lint` | ESLint |

### Demo mode vs. real AI

| `OPENAI_API_KEY` in `.env.local` | Behavior |
| --- | --- |
| empty | Scripted barista replies, fake transcript, sample feedback. A yellow banner says "Demo mode". Free. |
| set | Real transcription (`gpt-transcribe`), real role-play + feedback (Responses API). Costs money — agree on a team budget first. |

---

## How it works

```
 ┌─────────────┐  audio   ┌──────────────────┐  text   ┌──────────────────────────┐
 │ VoiceRecorder│────────▶│ /api/transcribe  │────────▶│ /api/conversation-turn   │
 │ (browser mic)│         │ OpenAI STT       │         │ lib/agent.ts generateTurn│
 └─────────────┘          └──────────────────┘         │  • scenario instructions │
        ▲                                               │  • history + stage       │
        │ speaks reply (browser Speech Synthesis)       └────────────┬─────────────┘
        └──────────────────────────────── reply + next stage ◀───────┘

 After the conversation → /api/feedback (separate evaluator, structured JSON)
                        → FeedbackCards + mission → saved to progress (localStorage for now)
```

- **Push-to-talk**, not live streaming — simpler to build/debug. Upgrade to the Realtime API later.
- **Scenario stages:** `greeting → ordering → unexpected_question → closing → completed`. The AI returns the next stage with each reply (structured output), and the server forces an end after 7 user turns.
- **Two separate language settings:**
  - *Interface language* (header toggle) → stored in the `NEXT_LOCALE` cookie, translations in `messages/*.json`.
  - *Practice language* (home page toggle) → `?lang=en|zh-CN` in the URL, sent to the AI.
  - Feedback is written in the **interface** language; suggested phrases are in the **practice** language.

---

## Project structure

```
app/
  page.tsx                      Home: value prop, practice-language toggle, scenario cards
  practice/[scenarioId]/page.tsx  Loads scenario → <PracticeSession/>
  progress/page.tsx             Progress dashboard → <ProgressView/>
  api/
    transcribe/route.ts         POST audio → { text }
    conversation-turn/route.ts  POST history → { reply, stage, isComplete }
    feedback/route.ts           POST history → Feedback JSON
  layout.tsx                    Root layout + i18n provider + header
components/
  PracticeSession.tsx           ★ The whole practice flow (intro → conversation → feedback)
  VoiceRecorder.tsx             Mic permission, MediaRecorder, webm/mp4 handling
  ScenarioCard.tsx, ScenarioPicker.tsx, LanguageSelector.tsx, UiLanguageSwitcher.tsx
  ConfidenceRating.tsx, FeedbackCard.tsx, ProgressView.tsx, Header.tsx
lib/
  agent.ts                      ★ AI prompts, structured-output schemas, mock mode
  scenarios.ts                  ★ Scenario content per language (add new scenarios here)
  openai.ts                     Server-only OpenAI client + model names
  speech.ts                     Browser text-to-speech
  progress.ts                   Save/load sessions (localStorage → swap for Supabase)
  supabase.ts                   Supabase client (not wired up yet)
i18n/request.ts                 next-intl config (reads NEXT_LOCALE cookie)
messages/en.json, zh-CN.json    All UI text — never hard-code strings in components
types/index.ts                  Shared types + API request/response contracts
supabase/schema.sql             Starter DB schema with Row Level Security
docs/ROADMAP.md                 Backlog, owners, and next steps
```

> ⚠️ This project uses **Next.js 16**. Some APIs differ from older tutorials (e.g. `params` and `searchParams` are Promises you must `await`). Bundled docs live in `node_modules/next/dist/docs/`.

---

## Team ownership

| Member | Area | Start with |
| --- | --- | --- |
| **Member 1 — Frontend + product** | UI, user journey, bilingual experience | `components/`, `app/page.tsx`, `messages/*.json` |
| **Member 2 — AI + voice** | Agent prompts, recording, transcription, speech | `lib/agent.ts`, `lib/scenarios.ts`, `components/VoiceRecorder.tsx`, `lib/speech.ts` |
| **Member 3 — Backend + data** | Supabase, auth, progress, deployment | `lib/progress.ts`, `lib/supabase.ts`, `supabase/schema.sql`, Vercel |

See **[docs/ROADMAP.md](docs/ROADMAP.md)** for the full backlog and **[CONTRIBUTING.md](CONTRIBUTING.md)** for the Git workflow.

---

## Rules

- `main` is always working. Every change goes through a **feature branch + pull request** reviewed by a teammate.
- **Never commit** `.env.local`, API keys, passwords, or participant recordings.
- `OPENAI_API_KEY` is server-only — **never** prefix it with `NEXT_PUBLIC_` or import `lib/openai.ts` from a client component.
- Audio is sent for transcription and **not stored**. Keep it that way unless participants explicitly consent.
- All UI text goes in `messages/en.json` **and** `messages/zh-CN.json`. Have a fluent Mandarin speaker review Chinese text and scenarios.
