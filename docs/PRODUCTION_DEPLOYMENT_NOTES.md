# Production Deployment Notes

## ✅ Catalog System Deployment (November 17, 2025)

### What Was Completed

1. **Code Deployment**
   - ✅ Merged `feature/book-catalog-transformation` to `main`
   - ✅ Pushed to GitHub
   - ✅ Render auto-deployed successfully

2. **Database Setup**
   - ✅ Ran `npx prisma migrate resolve --rolled-back manual_add_preview` (skipped problematic migration)
   - ✅ Seeded database with 10 books via `npx tsx prisma/seed.ts`
   - ✅ Created 5 collections (Classic Literature, Quick Reads, Love Stories, Psychological Fiction, Gothic & Horror)

3. **Catalog Functionality**
   - ✅ Catalog page accessible at `/catalog`
   - ✅ All 10 books displaying correctly
   - ✅ Collections working
   - ✅ Preview feature working (text + audio)

---

## ⚠️ Known Issues & Future Considerations

### 1. Preview Migration Failed (Non-Critical)

**Issue:** `manual_add_preview` migration times out in production database

**Status:** Skipped - Not blocking functionality

**Why It's OK:**
- Preview text loads from cache files (`cache/the-necklace-A1-preview.txt`)
- Preview audio loads from Supabase storage (`the-necklace/A1/preview.mp3`)
- API routes handle cache files correctly (`app/api/the-necklace-a1/bundles/route.ts`)

**Future Fix (If Needed):**
```bash
# Option 1: Run migration manually when database is less busy
npx prisma migrate deploy

# Option 2: Add preview column manually via SQL
ALTER TABLE "book_content" ADD COLUMN "preview" TEXT;

# Option 3: Continue using cache files (current approach works fine)
```

**Where to Check:**
- Migration file: `prisma/migrations/manual_add_preview/migration.sql`
- API routes: `app/api/the-necklace-a1/bundles/route.ts` (lines 186-229)
- Cache files: `cache/the-necklace-*-preview.txt` and `cache/the-necklace-*-preview-audio.json`

---

### 2. Cache Files Dependency

**Issue:** Preview feature depends on cache files being in production

**Current Status:** ✅ Working (cache files committed to repo)

**Potential Problem:**
- If cache files are deleted or not deployed, previews won't show
- New books need cache files generated and committed

**Solution:**
- Cache files are in git repo, so they deploy automatically
- For new books: Run `scripts/generate-necklace-preview.js` and commit cache files

**Where to Check:**
- Cache files: `cache/the-necklace-*-preview.txt` and `cache/the-necklace-*-preview-audio.json`
- Generation script: `scripts/generate-necklace-preview.js`

---

### 3. Supabase Storage for Preview Audio

**Issue:** Preview audio files must exist in Supabase storage

**Current Status:** ✅ Working (files uploaded during generation)

**Potential Problem:**
- If Supabase files are deleted, preview audio won't play
- New books need preview audio uploaded to Supabase

**Solution:**
- Preview audio generation script (`scripts/generate-necklace-preview.js`) uploads to Supabase automatically
- Files stored at: `{bookId}/{level}/preview.mp3` (e.g., `the-necklace/A1/preview.mp3`)

**Where to Check:**
- Supabase storage bucket: `audio-files`
- Upload logic: `scripts/generate-necklace-preview.js` (generatePreviewAudio function)

---

### 4. Database Seed Script Dependency

**Issue:** Catalog requires database to be seeded with books

**Current Status:** ✅ Seeded (10 books)

**Potential Problem:**
- If database is reset or wiped, catalog will be empty
- New books need to be added to seed script or database manually

**Solution:**
- Seed script: `prisma/seed.ts`
- To add new books: Edit `prisma/seed.ts` and run `npx tsx prisma/seed.ts` in production
- Or use Prisma Studio to add books manually

**Where to Check:**
- Seed script: `prisma/seed.ts`
- Database tables: `FeaturedBook`, `BookCollection`, `BookCollectionMembership`

---

### 5. Migration State Management

**Issue:** Failed migration (`manual_add_preview`) marked as rolled back

**Current Status:** ✅ Resolved (marked as rolled back)

**Potential Problem:**
- If migrations are reset, this migration will try to run again and fail
- Need to keep it marked as rolled back or remove it

**Solution:**
- Migration is marked as rolled back, so it won't block future migrations
- If needed, can delete migration folder: `prisma/migrations/manual_add_preview/`

**Where to Check:**
- Migration status: `npx prisma migrate status`
- Migration folder: `prisma/migrations/manual_add_preview/`

---

## 🔍 Troubleshooting Guide

### Catalog Shows No Books

**Check:**
1. Database seeded? Run: `npx tsx prisma/seed.ts` in Render Shell
2. API working? Check: `https://your-app.onrender.com/api/collections`
3. Database connection? Check `DATABASE_URL` in Render environment variables

**Fix:**
```bash
# In Render Shell
npx tsx prisma/seed.ts
```

---

### Preview Not Showing

**Check:**
1. Cache files exist? Check `cache/the-necklace-*-preview.txt` in repo
2. API loading cache? Check browser console for errors
3. Preview audio exists? Check Supabase storage at `{bookId}/{level}/preview.mp3`

**Fix:**
- Regenerate preview: `node scripts/generate-necklace-preview.js A1`
- Commit cache files to repo
- Verify Supabase upload succeeded

---

### Migration Errors

**Check:**
1. Failed migrations? Run: `npx prisma migrate status`
2. Database timeout? Check database load/performance

**Fix:**
```bash
# Mark failed migration as rolled back
npx prisma migrate resolve --rolled-back {migration-name}

# Or skip problematic migration
npx prisma migrate resolve --applied {migration-name}
```

---

## 📝 Quick Reference Commands

### Production Database Operations (Run in Render Shell)

```bash
# Check migration status
npx prisma migrate status

# Run migrations
npx prisma migrate deploy

# Seed database
npx tsx prisma/seed.ts

# Mark failed migration as rolled back
npx prisma migrate resolve --rolled-back {migration-name}
```

### Adding New Books to Catalog

1. **Via Seed Script (Recommended):**
   - Edit `prisma/seed.ts`
   - Add book to `books` array
   - Run `npx tsx prisma/seed.ts` in Render Shell

2. **Via Prisma Studio:**
   - Run `npx prisma studio` locally (connects to production DB)
   - Add book manually in FeaturedBook table

---

## ✅ Deployment Checklist

Before deploying catalog changes:

- [ ] Code pushed to `main` branch
- [ ] Render auto-deployment triggered
- [ ] Database migrations run (`npx prisma migrate deploy`)
- [ ] Database seeded (`npx tsx prisma/seed.ts`)
- [ ] Catalog page loads (`/catalog`)
- [ ] Books display correctly
- [ ] Collections work
- [ ] Preview feature works (if applicable)

---

**Last Updated:** November 17, 2025  
**Deployment Status:** ✅ Complete and Working
