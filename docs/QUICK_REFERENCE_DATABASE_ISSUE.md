# Quick Reference - Database Connection Issue

## 🚨 Problem
All API endpoints return `500 Internal Server Error` - Database unreachable

## 🔍 Quick Checks

### 1. Find all endpoints using direct PrismaClient
```bash
grep -r "new PrismaClient()" app/api --include="*.ts"
```

### 2. Test database connection
```bash
npx tsx scripts/test-db.js
```

### 3. Check shared Prisma instance usage
```bash
grep -r "from '@/lib/prisma'" app/api --include="*.ts" | wc -l
grep -r "from '@prisma/client'" app/api --include="*.ts" | grep "PrismaClient" | wc -l
```

## 📁 Critical Files

### Must Review:
- `lib/prisma.ts` - Shared Prisma instance configuration
- `.env.local` - Database connection strings
- `app/api/*/bundles/route.ts` - All bundle API endpoints

### Already Fixed:
- ✅ `app/api/always-a-family-a1/bundles/route.ts`
- ✅ `app/api/how-great-leaders-inspire-action-a2/bundles/route.ts`
- ✅ `app/api/how-great-leaders-inspire-action-b1/bundles/route.ts`

## 🎯 Immediate Actions

1. **Verify all endpoints use shared instance**
2. **Test database connection**
3. **Check Supabase dashboard → Connection Pooling**
4. **Restart dev server** (clear stale connections)

## 📊 Expected Outcome

- All endpoints use `import { prisma } from '@/lib/prisma'`
- Database connection successful
- No more 500 errors

---

**See `docs/HANDOVER_DATABASE_CONNECTION_ISSUE.md` for full details.**

