# Roadmap & backlog

Timeline from the project plan: Solution due **Nov 24** · prototype tests **Dec 1–3** · presentation **Dec 11** · final report **Dec 14**.

## ✅ Done (MVP foundation)

See the checklist in [IMPLEMENTATION_PLAN.md](IMPLEMENTATION_PLAN.md). Everything in the Part 4 journey works in Demo Mode and has been run end-to-end in Chrome (desktop + phone width) with zero console errors.

## Next — must happen before the pilot (Dec 1)

| # | Task | Owner | Done when |
| --- | --- | --- | --- |
| 1 | **Live AI test** with a real `OPENAI_API_KEY` | Dev 2 | 10 café conversations (3 levels) complete naturally in 4–6 exchanges; barista never re-asks known info; complication appears once |
| 2 | **Real-device mic testing** | Dev 2 | Record → transcribe works on Chrome (Mac/Windows), Safari (Mac), Safari (iPhone), Chrome (Android) |
| 3 | **Accent-diverse transcription check** | All | 5+ speakers with different accents; log transcript accuracy per speaker; note failures |
| 4 | **Supabase project + RLS verification** | Dev 3 | Migration applied; magic-link sign-in works; account B can't read account A's rows |
| 5 | **Deploy to Vercel** | Dev 3 | Public URL; mic works over HTTPS; OpenAI monthly budget set |
| 6 | **Feedback quality review** | Dev 2 + all | 10 transcripts reviewed by a human; feedback never invents issues or mentions accent |
| 7 | **Mobile & accessibility pass** | Dev 1 | Keyboard-only run-through; VoiceOver run-through of practice screen; phone layout reviewed on real devices |
| 8 | **Pilot materials** | Product lead | Consent text, test script and survey ready (see PILOT_GUIDE.md) |

## Soon (after the pilot)

| Task | Owner | Notes |
| --- | --- | --- |
| Silence / very-quiet recording detection before upload | Dev 2 | Use `PushToTalkRecorder.getLevel()` history |
| Better AI voice (TTS API) with real audio-amplitude visualization | Dev 2 | Browser voices vary a lot by device |
| Second scenario: "Talking to classmates" | Dev 2 + 1 | Copy `ordering-coffee.ts`; next on the ladder |
| Spaced-repetition review of saved phrases | Dev 3 | `saved_phrases.next_review_at` already exists |
| Ask about the mission at the start of the next session (in practice pre-brief) | Dev 1 | Dashboard already does this |
| Server-side persistence of sessions via API routes (instead of client + RLS) | Dev 3 | Only if needed for analytics |
| Shared rate limiting (e.g. Upstash) | Dev 3 | Current limiter is per-instance |
| Validate "time to respond" with voice-onset detection | Dev 2 + 3 | Events already recorded per session |

## Later (architected, not built)

Course-reading practice · professional coaching · multi-speaker group discussions · presentations · networking events · topic packs · neutral current-events discussions · validated speech analytics · noisy-café audio · realtime interruptible voice (Realtime API) · optional avatar.

Avoid leaderboards — they reward people who are already fluent.

## Kill criteria (from the Idea Brief)

Rethink the concept if, in the one-week pilot with 5 students:
- fewer than 3 complete a real-world mission,
- nobody asks for a second scenario,
- users can't tell this apart from a generic AI voice chat,
- speech recognition proves unreliable across accents.
