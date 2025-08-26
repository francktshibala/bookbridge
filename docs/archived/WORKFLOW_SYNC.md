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

## 🚨 CRITICAL: Pre-Audio Generation Checklist (MUST RUN BEFORE ANY AUDIO WORK)
```bash
# Step 1: Basic sync
git switch main && git pull
vercel env pull .env.local
nvm use --lts && npm ci

# Step 2: Read documentation FIRST
head -80 docs/implementation/MULTI_COMPUTER_AUDIO_GENERATION.md

# Step 3: Find books with actual content loaded (not just metadata)
for book in gutenberg-1524 gutenberg-158 gutenberg-1952 gutenberg-215 gutenberg-43 gutenberg-46 gutenberg-55 gutenberg-84 gutenberg-844; do
  node -e "const {PrismaClient} = require('@prisma/client'); const p = new PrismaClient(); p.bookContent.findFirst({where:{bookId:'$book'}}).then(c => console.log('$book has content:', !!c));"
done

# Step 4: Choose a book that returns "has content: true"
CHOSEN_BOOK="gutenberg-XXXX"  # Replace with working book

# Step 5: Verify simplifications exist
node -e "const {PrismaClient} = require('@prisma/client'); const p = new PrismaClient(); p.bookSimplification.count({where:{bookId:'$CHOSEN_BOOK'}}).then(c => console.log('Simplifications:', c));"

# Step 6: Copy simplifications to chunks FIRST
for level in A1 A2 B1 B2 C1 C2; do 
  node scripts/copy-simplifications-to-chunks.js $CHOSEN_BOOK $level
done

# Step 7: ONLY THEN create audio generation script
# CRITICAL: Use bookId/level/chunk_X.mp3 format, NOT just level/chunk_X.mp3
```

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

## Audio Generation Performance Guidelines

### Terminal vs Chat-Based Generation
**ALWAYS use terminal for audio generation - it's significantly faster**

Terminal execution avoids:
- Next.js API route overhead
- HTTP request/response cycles  
- Browser memory limits
- Chat interface delays

### Terminal Audio Generation Commands
```bash
# Check progress first
npx ts-node scripts/check-c1-c2-progress.ts

# If C2 hasn't started (0% complete), run terminal generation
npx ts-node scripts/generate-c2-audio.ts

# Alternative: Use backfill API via curl (slower but more reliable)
curl -X POST http://localhost:3000/api/admin/audio/backfill \
  -H "Content-Type: application/json" \
  -d '{"bookId": "gutenberg-1342", "levels": ["C2"]}' \
  --max-time 3600
```

### When to Use Each Approach
- **Terminal Scripts**: Initial bulk generation (A1, A2, B1, B2, C1, C2)
- **Chat/API**: Small fixes, testing, single chunk regeneration

## Audio System Status & Completion

### Pride & Prejudice (gutenberg-1342) - ✅ COMPLETE
**Status**: All 6 CEFR levels completed with consistent "alloy" voice
- **A1**: 252 files ✅
- **A2**: 282 files ✅  
- **B1**: 282 files ✅
- **B2**: 282 files ✅
- **C1**: 282 files ✅
- **C2**: 196 files ✅
- **Total**: 1,416 audio files

### Multi-Book Status (Updated 2025-08-24)
- **Pride & Prejudice**: ✅ Complete (1,606 files)
- **Romeo & Juliet**: ✅ Complete (312 files, C1 has sequence gaps)
- **Alice in Wonderland**: 🔄 Audio-text mismatch being fixed
- **⚠️ Critical Discovery**: Only ~3 books are "audio-ready" (have book_content entries)
- **Remaining books**: Need content loading before audio generation possible

### Global Storage Integration - ✅ COMPLETE  
- **Supabase Storage**: CDN-enabled bucket configured for 285+ cities worldwide
- **Global Access**: Optimized for instant playback including Africa
- **Migration Ready**: Script available to move local files to CDN
- **Cache Settings**: 30-day client cache, 90-day CDN cache for optimal performance

### Key Scripts for Future Use
```bash
# Check progress for any book
npx ts-node scripts/check-c1-c2-progress.ts

# Create Supabase audio bucket  
npx ts-node scripts/create-audio-bucket.ts

# Test storage integration
npx ts-node scripts/test-audio-storage.ts

# Migrate existing local files to global CDN
npx ts-node scripts/migrate-audio-to-supabase.ts
```

### Next Books Strategy
**Future books will automatically use Supabase Storage** - no migration needed.
Simply generate audio using terminal commands for optimal speed.

## Recommended Conventions
- Branch names: `feat/...`, `fix/...`, `chore/...`
- Commit messages: short, descriptive, imperative mood.
- Do not commit secrets. Keep `.env.local` out of git. 