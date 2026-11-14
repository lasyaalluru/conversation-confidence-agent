# Contributing — daily Git workflow

## Every time you start work

```bash
git switch main
git pull origin main
git switch -c feat/short-description     # e.g. feat/language-selector, fix/safari-recording
```

Branch prefixes: `feat/` new feature · `fix/` bug fix · `docs/` documentation · `chore/` tooling.

## While working

```bash
npm run dev            # keep this running, check http://localhost:3000
```

Commit small and often:

```bash
git add .
git commit -m "Add Mandarin classmate small-talk scenario"
```

## Before opening a pull request

```bash
npm run lint
npm run build          # must pass — catches TypeScript errors
git push -u origin feat/short-description
```

Then on GitHub click **Compare & pull request** → target `main` → fill in the template → request a review from a teammate.

## Reviewing a teammate's PR

1. `git fetch && git switch their-branch-name && npm install && npm run dev`
2. Try the feature in the browser (English **and** Mandarin if relevant).
3. Leave comments or approve. The author merges after approval.

## After a PR is merged

```bash
git switch main
git pull origin main
git branch -d feat/short-description
```

## Merge conflicts

If GitHub says your branch has conflicts:

```bash
git switch main && git pull origin main
git switch feat/your-branch
git merge main          # fix the conflicted files in VS Code, then:
git add . && git commit
git push
```

Ask for help early — conflicts are much easier when they're small.

## Conventions

- **Text:** never hard-code UI text. Add keys to both `messages/en.json` and `messages/zh-CN.json`, then use `useTranslations()` (client) or `getTranslations()` (server).
- **Types:** shared shapes live in `types/index.ts`. If you change an API contract, update both the route and the caller.
- **Secrets:** only in `.env.local`. If you add a new env var, add its name (no value) to `.env.example`.
- **Styling:** Tailwind with the color tokens in `app/globals.css` (`bg-surface`, `text-muted`, `border-line`, `bg-accent`, …) so dark mode keeps working.
