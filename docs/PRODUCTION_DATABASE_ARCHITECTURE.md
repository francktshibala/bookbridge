# Production Database Architecture Guide

## Current Issue (Development)
The app currently uses Prisma with direct database connections, which conflicts with Supabase's Row Level Security (RLS) policies. This causes "permission denied for schema public" errors.

## Temporary Solution (What we're implementing now)
Using Prisma with Supabase's service role connection string to bypass RLS. This works but isn't ideal for production.

## Recommended Production Architecture

### Option 1: Hybrid Approach (Recommended)
Use both Prisma and Supabase client based on context:

1. **Supabase Client for User-Facing Operations**
   - All client-side queries
   - User authentication flows
   - Real-time subscriptions
   - Respects RLS policies automatically

2. **Prisma for Server-Side Admin Operations**
   - Background jobs
   - Data migrations
   - Admin panels
   - Batch operations

### Option 2: Full Supabase Migration
Replace all Prisma queries with Supabase client:

**Pros:**
- Consistent security model
- Built-in real-time features
- Automatic RLS enforcement
- Better integration with Supabase Auth

**Cons:**
- Need to rewrite all database queries
- Less type safety than Prisma
- Different query syntax to learn

### Implementation Steps for Production

1. **Phase 1: Authentication Layer**
   ```typescript
   // Replace direct Prisma calls with authenticated Supabase calls
   // Before (Prisma):
   const books = await prisma.book.findMany();
   
   // After (Supabase):
   const { data: books } = await supabase
     .from('books')
     .select('*');
   ```

2. **Phase 2: RLS Policies**
   - Keep RLS enabled for all tables
   - Define proper policies for each table
   - Test thoroughly with different user roles

3. **Phase 3: API Routes Migration**
   - Update all API routes to use Supabase client
   - Pass user context from middleware
   - Handle auth errors properly

### Security Best Practices

1. **Never expose service role key to client**
2. **Use RLS for all user data**
3. **Implement proper error handling**
4. **Add rate limiting**
5. **Monitor database queries**

### Migration Checklist

- [ ] Audit all Prisma queries in the codebase
- [ ] Create Supabase client utilities
- [ ] Update API routes one by one
- [ ] Test RLS policies thoroughly
- [ ] Update error handling
- [ ] Add monitoring and logging
- [ ] Performance testing
- [ ] Security audit

### Code Examples

#### Current (Prisma - Development)
```typescript
// lib/prisma.ts
export const prisma = new PrismaClient();

// API route
const books = await prisma.book.findMany();
```

#### Future (Supabase - Production)
```typescript
// lib/supabase/server.ts
export const createClient = async () => {
  const supabase = createServerClient(...)
  return supabase;
};

// API route
const supabase = await createClient();
const { data: { user } } = await supabase.auth.getUser();
const { data: books } = await supabase
  .from('books')
  .select('*')
  .eq('user_id', user.id);
```

### Timeline Estimate
- Full migration: 2-3 weeks
- Hybrid approach: 1 week
- Testing & validation: 1 week

### Resources
- [Supabase RLS Guide](https://supabase.com/docs/guides/auth/row-level-security)
- [Prisma with Supabase](https://supabase.com/docs/guides/integrations/prisma)
- [Next.js + Supabase Auth](https://supabase.com/docs/guides/auth/auth-helpers/nextjs)