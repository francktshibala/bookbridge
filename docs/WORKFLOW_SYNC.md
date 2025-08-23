# Two-Computer Sync Guide (Git + Env + Node)

## Daily Workflow
- Pull latest before you start:
  - `git switch main` (or `git checkout main`)
  - `git pull origin main`
- Create a feature branch for work:
  - `git switch -c feat/<short-topic>`
- Commit and push:
  - `git add -A`
  - `git commit -m "<what you changed>"`
  - `git push -u origin feat/<short-topic>`
- Merge via PR (recommended) or fast-forward merge on `main`.
- On the other machine: `git switch main && git pull` then continue.

## Environment Variables
- Prefer syncing from Vercel on each machine:
  - `vercel login` (once)
  - `vercel link` (in repo root, once per machine)
  - `vercel env pull .env.local`
- Alternatively, store `.env.local` in a password manager and copy to each machine.
- Notes:
  - `.env.local` overrides `.env`. Avoid committing secrets.
  - `STRIPE_WEBHOOK_SECRET` is optional; without it, webhooks no-op.

## Node & npm Consistency
- Use the same Node version via nvm:
  - `nvm install --lts`
  - `nvm use --lts`
- Always use a clean install on each machine:
  - `npm ci` (uses the committed `package-lock.json`)
- After pulling changes that touch dependencies, run `npm ci` again.

## Quick Checklist (each time you switch machines)
1. `git switch main && git pull`
2. `git switch <your-branch>` (or re-create: `git switch -c feat/<topic>`)
3. `vercel env pull .env.local` (if envs changed)
4. `nvm use --lts`
5. `npm ci`
6. `npm run dev`

## Conflict Handling
- If `git pull` shows conflicts:
  - Open files, resolve conflicts
  - `git add -A && git commit`
- Use `git status` often; push and pull in small chunks to minimize conflicts.

## Troubleshooting
- npm cache/permissions on macOS:
  - `sudo chown -R $(id -u):$(id -g) ~/.npm`
  - `npm cache clean --force`
- Env not loading:
  - Ensure values are in `.env.local`, not `.env` (or remove `.env` if conflicting)
- Stripe build-time errors:
  - We use lazy `getStripe()`; only runtime needs `STRIPE_SECRET_KEY`.

## Deployment & Size Management
### Pre-Deploy Checklist
- [ ] Run `npm run build` locally to catch issues early
- [ ] Check `.vercelignore` excludes large files (`public/audio/`)
- [ ] Audio files stored as database URLs, not local files
- [ ] Vercel function limit: 300MB (our fix: exclude 1.8GB audio files)

### Optimal Push Timing
**Best Practice:** Push after completing features, not during audio generation.

**Avoid pushing during:**
- Active audio generation (creates large files)
- Database migrations
- Heavy file operations

**Safe to push:**
- After audio generation completes
- Code-only changes
- Config/documentation updates

## Recommended Conventions
- Branch names: `feat/...`, `fix/...`, `chore/...`
- Commit messages: short, descriptive, imperative mood.
- Do not commit secrets. Keep `.env.local` out of git. 