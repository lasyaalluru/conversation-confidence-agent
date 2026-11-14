# ConvoConfidence AI

**Know the words. Find your voice.**

An AI conversation coach for international students in the US who already know English but hesitate in real conversations. Learners pick a *comfort level* (not a test score), practice realistic spoken situations with an AI partner, get specific feedback on conversational moves (never on their accent), track honest progress, and take small real-world missions into their day.

> **Status — working MVP.** The full journey works end-to-end: 3D landing → onboarding → café conversation (voice or text) → structured feedback → mission → dashboard → replay.
> Without an OpenAI key it runs in a clearly labeled **Demo Mode** (scripted barista, rule-based feedback), so anyone can develop and demo for free.
> Progress is saved in the browser for guests; optional email accounts sync via Supabase.

---

## Quick start

**Prerequisites:** Node.js 20.9+ (24 LTS recommended — see `.nvmrc`), Git, VS Code. Chrome or Safari for testing (the mic needs `localhost` or `https://`).

```bash
git clone https://github.com/lasyaalluru/conversation-confidence-agent.git
cd conversation-confidence-agent
npm install
cp .env.example .env.local     # optional: add OPENAI_API_KEY for live AI
npm run dev                    # → http://localhost:3000
```

| Command | What it does |
| --- | --- |
| `npm run dev` | Dev server with hot reload |
| `npm test` | Unit tests (Vitest) — agent rules, demo barista, analytics, recommendations, consent |
| `npm run lint` | ESLint (incl. React hooks rules) |
| `npm run typecheck` | Generate route types + TypeScript check |
| `npm run build` | Production build — run before every PR |

CI (`.github/workflows/ci.yml`) runs lint → typecheck → tests → build on every pull request.

### Environment variables

| Variable | Needed for | Notes |
| --- | --- | --- |
| `OPENAI_API_KEY` | Live AI conversation, voice transcription, AI feedback | **Server-only.** Empty → Demo Mode. Set a spending limit in the OpenAI dashboard. |
| `OPENAI_CONVERSATION_MODEL` / `OPENAI_FEEDBACK_MODEL` / `OPENAI_TRANSCRIBE_MODEL` | Optional overrides | Defaults: `gpt-5.4-mini`, `gpt-5.4-mini`, `gpt-transcribe` |
| `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | Optional accounts + cross-device sync | Publishable key is safe in the browser; Row Level Security protects data |

---

## What's in the MVP

| Area | What works |
| --- | --- |
| **Landing** | Cinematic scroll story around a procedural 3D "Conversation Sculpture" (three.js): physical glass/metal materials, in-scene studio lighting, scroll-directed camera cues, layers that separate in the "confidence gap" section, cursor tilt, CTA hover glow, bloom/ACES/grain. Adaptive quality, reduced-motion stills, no-WebGL CSS fallback. |
| **Onboarding** | 5 steps, ~1 minute, no account: welcome → comfort level (1–3) → goals → confidence baseline → personalized first practice |
| **Scenario library** | Data-driven catalog across 5 categories (the confidence ladder). *Ordering Coffee* is playable at all 3 comfort levels; 24 others are labeled "Coming soon". |
| **Conversation** | Push-to-talk voice (real mic level drives the orb), transcription, comfort-adaptive AI barista with stage tracking (greeting → ordering → follow-up → complication → closing), hint, repeat (slower), transcript, typed fallback, end-session dialog, retry on every failure |
| **Feedback** | Structured: what went well (quoted), what to try, natural alternatives, social-convention reflection; confidence after; try again at any level; optional pilot reflection |
| **Missions** | One per session; "I tried it / Not yet / I want to try again" + optional reflection; dashboard asks how it went when you return |
| **Progress** | Dashboard (recommended practice, next challenge, summary, confidence journey, continue practicing) and Progress page (trend, activity, ladder progress, before-vs-after, history). Only real data; sample data only behind a labeled preview. |
| **Phrases** | Save from feedback or add your own; listen; remove |
| **Settings** | Comfort level, goals, transcript-storage consent, reflections consent, account, export (JSON), delete all |

---

## Architecture

```
app/
  page.tsx                       Landing (dark, 3D)
  onboarding/                    5-step guest onboarding
  practice/[scenarioId]/         Pre-brief → conversation (focused, dark)
  (app)/                         Light app shell with nav: dashboard, scenarios, progress,
                                 phrases, settings, feedback/[sessionId]
  auth/, auth/callback/          Optional email magic-link sign-in (Supabase)
  api/
    conversation/route.ts        POST → next AI turn  (validated, rate-limited)
    transcribe/route.ts          POST audio → text    (audio never stored)
    feedback/route.ts            POST → structured feedback
    status/route.ts              GET  → "live" | "demo"
components/
  three/                         SculptureCanvas + sculpture/{engine,geometry,materials,studio,cues}
  landing/ onboarding/ conversation/ feedback/ dashboard/ settings/ scenarios/ layout/ ui/
  providers/ProgressProvider     Data context — picks LocalStore (guest) or SupabaseStore (signed in)
hooks/
  useConversation.ts             Conversation state machine (turns, stage, mic, speech, errors)
lib/
  ai/          contract.ts (zod + JSON schemas) · prompts.ts (pure) · agent.ts (server) · openai.ts · demo/
  audio/       recorder.ts (MediaRecorder + level meter) · speech.ts (speech synthesis)
  scenarios/   types.ts · comfort-levels.ts · catalog.ts · ordering-coffee.ts
  analytics/   metrics.ts (deterministic) · registry.ts (future speech metrics + why they're hidden)
  recommendations/rules.ts       Transparent rule-based next steps
  database/    store.ts (interface) · local-store.ts · supabase-store.ts · supabase-client.ts
  server/      http.ts (errors, size limits) · rate-limit.ts
  demo/        sample-progress.ts (labeled preview data only)
supabase/migrations/0001_init.sql  Tables + Row Level Security
tests/                            Vitest unit tests
```

### How a conversation turn works

```
learner speaks ─▶ PushToTalkRecorder ─▶ POST /api/transcribe ─▶ text
                                                       │
history + stage + comfort level ─▶ POST /api/conversation
   zod-validate ▸ rate-limit ▸ buildConversationInstructions(scenario, level)
   ▸ OpenAI Responses (strict JSON schema) ▸ zod re-validate (1 retry) ▸ applyCompletionRules
   ◀─ { reply, scenarioStage, isComplete, hint, learningObjective, mode }
reply ─▶ speech synthesis (rate per level; word boundaries drive the orb)
end ─▶ save session + mission ─▶ /feedback/[id] ─▶ POST /api/feedback (separate evaluator)
```

**Adding a scenario:** create `lib/scenarios/<id>.ts` (copy `ordering-coffee.ts`: character, convention tip, stages, objectives, per-level config, completion rules, missions), then replace its `preview(...)` entry in `catalog.ts`. The agent, pre-brief, feedback and recommendations pick it up automatically. Add a row to `public.scenarios` in Supabase.

### Design system
Tokens live in `app/globals.css` (`midnight`, `ivory`, `lavender`, `sage`, `champagne`, `slate`, plus AA-contrast `*-ink` variants for text). Display type: Instrument Serif; UI: Geist. Primitives in `components/ui/`. Chart palette validated for color-vision deficiency (see `components/dashboard/charts.tsx`).

---

## Database (optional accounts)

1. Create a project at [supabase.com](https://supabase.com).
2. **SQL Editor** → paste and run `supabase/migrations/0001_init.sql`.
3. **Authentication → Providers**: enable Email (magic link).
4. **Authentication → URL Configuration**: add `http://localhost:3000/auth/callback` and your deployed `https://<domain>/auth/callback` to Redirect URLs.
5. Put the project URL and *publishable* key in `.env.local`.
6. **Verify RLS** with two test accounts: account B must not see account A's sessions.

> ⚠️ The Supabase store and migration are written against this schema but **have not yet been run against a live project** — step 6 is required before the pilot.

## Deploy (Vercel)

1. vercel.com → **Add New → Project** → import this GitHub repo (framework auto-detected).
2. Add environment variables (above). Leave `OPENAI_API_KEY` empty for a free demo deployment.
3. Deploy. Every PR gets a preview URL.
4. If using accounts, add the deployed `/auth/callback` URL in Supabase.
5. On the live URL test: mic permission (Chrome + Safari + iPhone), a full conversation, feedback, dashboard.

The Hobby plan is for non-commercial projects. Rate limits are in-memory per server instance (best-effort) — **also set a monthly budget in the OpenAI dashboard**.

---

## Privacy & honesty principles

- Raw audio is **never stored**. Transcripts are stored only if the user allows it (Settings); otherwise deleted once feedback is saved.
- The AI never comments on accent, and feedback never invents problems that aren't in the transcript.
- Confidence scores are **self-reported** and labeled that way. Missions are **user-reported**.
- Advanced speech metrics (pauses, speaking rate, fillers…) are architected but **not shown** until validated across accents — see `lib/analytics/registry.ts`.
- Demo Mode is labeled everywhere it appears and never presented as live AI.
- This is a speaking coach, not therapy.

## Team & contributing

See **[CONTRIBUTING.md](CONTRIBUTING.md)** (workflow, branches, PRs), **[docs/ROADMAP.md](docs/ROADMAP.md)** (backlog by owner), **[docs/PILOT_GUIDE.md](docs/PILOT_GUIDE.md)** (running the 5-student pilot) and **[docs/IMPLEMENTATION_PLAN.md](docs/IMPLEMENTATION_PLAN.md)** (requirements, design blueprint, checklist).
