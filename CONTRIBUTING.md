# Contributing

## Team areas

| Developer | Owns | Main folders |
| --- | --- | --- |
| **1 — Frontend & product experience** | Landing, onboarding, scenario library, layout, responsive design, 3D | `app/page.tsx`, `components/{landing,three,onboarding,scenarios,layout,ui}` |
| **2 — AI & voice** | Agent, scenario prompts, recording, transcription, speech, feedback generation | `lib/ai`, `lib/audio`, `lib/scenarios`, `hooks/useConversation.ts`, `components/conversation` |
| **3 — Backend, data & integration** | Supabase, auth, progress, missions, analytics, deployment | `lib/database`, `supabase/`, `lib/analytics`, `lib/recommendations`, `components/{dashboard,settings,feedback}` |

Everyone reviews PRs and joins integration testing.

## Daily workflow

```bash
git switch main && git pull                 # always start from the latest main
git switch -c feat/voice-recorder           # one branch per piece of work
npm run dev
# …work, commit small and often…
git add -A && git commit -m "Add silence detection to recorder"
npm run lint && npm test && npm run build   # same checks CI runs
git push -u origin feat/voice-recorder      # then open a PR on GitHub
```

**Branch names:** `feat/…` new feature · `fix/…` bug · `docs/…` · `chore/…` tooling · `test/…`
Examples: `feat/onboarding`, `feat/ai-conversation`, `feat/voice-recorder`, `feat/progress-dashboard`.

## Pull requests

- Keep PRs small (ideally < 400 changed lines) and focused on one issue. Link it: `Closes #12`.
- Fill in the PR template, including **how to test** and screenshots for UI changes.
- At least **one teammate reviews** before merging. CI must be green.
- The author merges (squash merge), then deletes the branch.
- `main` must always build and run.

> GitHub Free doesn't enforce branch protection on private repos; this repo is public, so the owner can turn on
> **Settings → Branches → Add rule → `main`: Require a pull request + 1 approval + status checks (CI)**.

### Reviewing

```bash
git fetch && git switch <their-branch> && npm install && npm run dev
```
Try it in the browser (desktop + phone width). Check: works in Demo Mode, no console errors, keyboard usable, no secrets.

### Merge conflicts

```bash
git switch main && git pull
git switch <your-branch> && git merge main   # fix conflicts in VS Code
git add -A && git commit && git push
```

## Conventions

- **Types first.** Shared shapes: `types/domain.ts` (stored data) and `lib/ai/contract.ts` (API + AI contracts, zod). Change the contract → update the route, the caller and the tests.
- **Server-only secrets.** Anything using `OPENAI_API_KEY` imports `"server-only"`. Never use `NEXT_PUBLIC_` for secrets.
- **Never trust AI output.** Parse it with zod; handle malformed/empty/timeouts.
- **Demo vs live.** Demo implementations live in `lib/ai/demo/` and `lib/demo/`, and the UI must label them.
- **Honest data.** Don't show a number unless it's measured. Self-reports are labeled as self-reports.
- **Accessibility.** Real `<button>`/`<label>` elements, visible focus, `aria-live` for status changes, reduced-motion respected.
- **Styling.** Tailwind with tokens from `app/globals.css`. Text on light backgrounds uses `text-ink`, `text-slate` or `*-ink` colors (AA contrast).
- **Next.js 16.** `params`/`searchParams` are Promises; read `node_modules/next/dist/docs/` when unsure (see `AGENTS.md`).
- **Never commit** `.env.local`, API keys, recordings, or participant data.
