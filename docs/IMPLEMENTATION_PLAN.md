# ConvoConfidence AI — Implementation Plan & Checklist

> Source inputs: Master Build Prompt (latest, wins on conflicts), Idea Brief (Nov 12 2026),
> Project Plan (Canvas timeline: prototype testing Dec 1–3, presentation Dec 11), 3D Build Guide.
> Status legend: `[x]` done & verified · `[~]` built but not verifiable here (needs live credentials/device) · `[ ]` not started

---

## A. Functional requirements

| ID | Requirement | MVP? | Notes |
| --- | --- | --- | --- |
| FR-01 | Landing page, 3D hero, 6 story sections | **Essential** | Cinematic, scroll-directed sculpture |
| FR-02 | 1-minute guest onboarding: welcome → comfort level → goals → baseline confidence → start | **Essential** | Comfort ≠ proficiency; changeable later |
| FR-03 | Dashboard: greeting, recommended practice, confidence chart, real summary, continue, next challenge, empty state | **Essential** | No fabricated data; demo sample data only when labeled |
| FR-04 | Data-driven scenario library (5 categories) | **Essential** (structure) | Only *Ordering Coffee* is playable; others labeled "Coming soon" |
| FR-05 | Voice-first café simulator with comfort adaptation, hint, repeat, transcript, text fallback | **Essential — core** | Push-to-talk |
| FR-06 | Structured feedback: went well / improve / alternatives / reflection / try again | **Essential** | Never invent issues; never judge accent |
| FR-07 | Honest analytics: confidence before/after, sessions, duration, turns, missions, phrases, history | **Essential** | Advanced speech metrics = architecture + "not yet measured" state |
| FR-08 | Real-world missions: tried / not yet / try again + reflection; ask on return | **Essential** | User-reported |
| FR-09 | Saved phrases page | **Essential** | Spaced repetition = future |
| FR-10 | Transparent rule-based recommendations, user can override | **Essential** | Explain *why* each recommendation |
| FR-11 | Guest mode + optional email accounts; settings; consent; data deletion | Essential (guest) · Should (accounts) | Supabase magic link |
| FR-12 | Future modules (group sim, presentations, noise, realtime voice, avatar…) | **Future** | Architected via scenario/character config only |

## B. Technical requirements

- **Framework:** Next.js 16 App Router, React 19, TypeScript (strict), Tailwind v4.
- **3D:** plain `three` (one engine class, one fixed canvas, landing page only), procedural geometry, `MeshPhysicalMaterial`, PMREM studio environment, scroll cue list, post (bloom + ACES tone mapping), adaptive DPR/quality, WebGL detection, reduced-motion + static fallback, visibility pause, full disposal on unmount.
- **Motion:** `motion` for UI transitions; scroll-position-driven reveals (not IntersectionObserver-only, per guide lesson 04).
- **AI:** OpenAI Responses API, server-only, models via env vars, strict JSON-schema output validated again with **zod**; timeouts, one retry on malformed output, typed errors.
- **Voice:** MediaRecorder (webm/mp4), `/api/transcribe` (OpenAI STT), browser SpeechSynthesis (rate per comfort level), real mic amplitude via Web Audio `AnalyserNode` while listening; status-based animation otherwise. No simultaneous record + playback.
- **Data:** `ProgressStore` interface → `LocalStore` (guest, localStorage) and `SupabaseStore` (signed-in). Supabase Postgres + Auth (email magic link via `@supabase/ssr`), SQL migrations, RLS on every table.
- **Security:** keys server-only, zod input validation, body-size limits, per-IP rate limit on AI routes, no raw audio stored, `.env*` ignored.
- **Demo mode:** isolated `lib/ai/demo/*` deterministic barista + sample feedback, used only when `OPENAI_API_KEY` is absent; every demo output carries `mode: "demo"` and the UI labels it.
- **Quality:** ESLint, `tsc`, Vitest unit tests (agent contract, demo agent, analytics, recommendations, validation), GitHub Actions CI (lint · typecheck · test · build).
- **Deploy:** Vercel; env vars documented; Supabase redirect URLs.

## C. Experience & design blueprint

**Page hierarchy**
```
/                 Landing (dark, cinematic, 3D)
/onboarding       5 steps (light, calm)
/dashboard        Home base after onboarding
/scenarios        Library by category
/practice/[id]    Pre-brief → conversation → wrap-up   (focused, no nav clutter)
/feedback/[sid]   Feedback, mission, phrases, confidence after
/progress         Charts + history
/phrases          Saved phrases
/settings         Comfort level, goals, consent, account, export/delete data
/auth             Email sign-in (magic link)
```

**Visual system — "The Art of Finding Your Voice"**
- Palette: midnight `#0B1020`, ivory `#F8F7F2`, lavender `#BAACF7`, sage `#A7DCCB`, champagne `#E9D6B8`, slate `#596171`.
- Type: *Instrument Serif* (display, editorial) + *Geist* (UI/body). Large headlines, generous leading.
- Surfaces: dark cinematic landing; warm ivory app surfaces with soft shadows, 24px radii, restrained motion.

**Signature 3D — "The Conversation Sculpture"**
Four layered, interlocking forms = the confidence gap:
1. *Knowing the words* — brushed champagne-metal ring (outer)
2. *Finding the words* — lavender glass torus-knot ribbon
3. *Expressing the thought* — sage satin wave ribbon
4. *Speaking confidently* — luminous glass core

Interactions: cursor tilts pose + rotates studio environment; scroll cues (hero → gap/apart → how-it-works/rebuild → scenarios/around → journey → CTA/together); CTA hover = glow + layers expand; gentle "breath" from one shared clock (no endless fast spin).

**Practice screen**: top bar (brand, scenario, comfort level, end) · center voice orb with states idle/listening (real amplitude)/processing/speaking/error · transcript · bottom: mic button, hint, repeat, text input.

## D. Development architecture

```
app/                     routes (see C) + api/{conversation,transcribe,feedback}
components/{ui,layout,landing,three,onboarding,scenarios,conversation,feedback,dashboard,settings}
lib/ai/                  agent.ts (prompt + orchestration), contract.ts (zod), openai.ts, demo/
lib/audio/               recorder.ts, speech.ts, level-meter.ts
lib/scenarios/           types.ts, comfort-levels.ts, catalog.ts, coffee.ts
lib/analytics/           metrics.ts (deterministic), registry.ts (future metrics + availability)
lib/recommendations/     rules.ts
lib/database/            store.ts (interface), local-store.ts, supabase-store.ts, supabase clients
lib/validations/         api.ts (zod request schemas)
lib/server/              rate-limit.ts
hooks/                   useProgress, useConversation, useReducedMotion…
supabase/migrations/     0001_init.sql
tests/                   vitest
```

**AI conversation workflow**
```
client(history, stage, level) → POST /api/conversation
  → validate (zod) → rate-limit → agent.buildInstructions(scenario, level, stage, objectives)
  → OpenAI Responses (json_schema strict) → zod parse → (retry once) → stage guards (max turns)
  ← { reply, scenarioStage, isComplete, hint, learningObjective, mode }
end → POST /api/feedback (separate evaluator, schema) → store → /feedback/[sid]
```

---

## Implementation checklist

### Phase 0 — Reset scope
- [x] Read brief, plan, 3D guide; write this plan
- [x] Feature branch `feat/convoconfidence-mvp`
- [ ] Remove Mandarin / next-intl; English-only; rename app to ConvoConfidence AI
- [ ] Install three, motion, zod, @supabase/ssr, vitest

### Phase 1 — Foundation & visual identity
- [ ] Design tokens, fonts, focus styles, reduced-motion base
- [ ] UI primitives (Button, Card, Badge, Container, etc.) + app shell / nav
- [ ] Scenario data model + catalog (5 categories) + coffee scenario × 3 comfort levels
- [ ] 3D engine: procedural sculpture, materials, PMREM studio, post, adaptive quality
- [ ] 3D: scroll cues, cursor/touch, CTA hover glow, explode layers, lifecycle & fallbacks
- [ ] Landing page: hero + 5 sections + final CTA, scroll reveals, mobile layout
- [ ] Onboarding (5 steps, guest)
- [ ] Scenario library page

### Phase 2 — Conversation MVP
- [ ] Zod contracts + validation + rate limit
- [ ] Agent: comfort-adaptive instructions, structured turn, retry/timeout
- [ ] Demo agent (deterministic, remembers order) — isolated
- [ ] Recorder + level meter + speech synthesis (per-level rate)
- [ ] Practice UI: pre-brief, voice orb states, transcript, mic/hint/repeat/text, end
- [ ] Transcription route

### Phase 3 — Feedback & persistence
- [ ] Feedback evaluator + schema + demo feedback
- [ ] Feedback page (sections, save phrases, mission, confidence after, try again)
- [ ] ProgressStore + LocalStore
- [ ] Missions (tried / not yet / try again + reflection, ask on return)
- [ ] Analytics utilities (deterministic) + future-metric registry
- [ ] Recommendations (rule-based, explained, overridable)
- [ ] Dashboard + progress charts (confidence trend, activity, by category, before/after)
- [ ] Saved phrases page
- [ ] Settings (level, goals, consent, export, delete)
- [~] Supabase: migrations + RLS, auth (magic link), SupabaseStore

### Phase 4 — Refinement & testing
- [ ] Unit tests (Vitest)
- [ ] Lint, typecheck, build clean
- [ ] Browser QA via Playwright: every route desktop + mobile, console errors, reduced-motion, no-WebGL
- [ ] Full MVP journey run (demo mode)
- [ ] GitHub Actions CI
- [ ] README, CONTRIBUTING, ROADMAP, pilot guide updated
- [ ] Push branch, open PR, create backlog Issues

### Needs your team (cannot be completed here)
- [ ] Live OpenAI key test (real conversation + transcription)
- [ ] Create Supabase project, run migration, verify RLS with two accounts
- [ ] Real-device mic tests: Chrome, Safari, iPhone
- [ ] Accent-diverse testing + human review of feedback
- [ ] Deploy to Vercel
- [ ] 5-student pilot
