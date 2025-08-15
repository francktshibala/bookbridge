-- Temporarily disable RLS on all tables to allow Prisma to work
-- WARNING: This removes security! Only for development.
-- Re-enable RLS before production deployment!

-- Disable RLS on all tables
ALTER TABLE users DISABLE ROW LEVEL SECURITY;
ALTER TABLE subscriptions DISABLE ROW LEVEL SECURITY;
ALTER TABLE books DISABLE ROW LEVEL SECURITY;
ALTER TABLE conversations DISABLE ROW LEVEL SECURITY;
ALTER TABLE messages DISABLE ROW LEVEL SECURITY;
ALTER TABLE usage DISABLE ROW LEVEL SECURITY;
ALTER TABLE system_usage DISABLE ROW LEVEL SECURITY;
ALTER TABLE book_cache DISABLE ROW LEVEL SECURITY;
ALTER TABLE app_testimonials DISABLE ROW LEVEL SECURITY;

-- Grant permissions to authenticated and anon roles
GRANT ALL ON ALL TABLES IN SCHEMA public TO anon, authenticated;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO anon, authenticated;
GRANT ALL ON ALL FUNCTIONS IN SCHEMA public TO anon, authenticated;