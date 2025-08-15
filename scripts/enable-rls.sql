-- Re-enable RLS on all tables for production
-- Run this before deploying to production!

-- Enable RLS on all tables
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE books ENABLE ROW LEVEL SECURITY;
ALTER TABLE conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE usage ENABLE ROW LEVEL SECURITY;
ALTER TABLE system_usage ENABLE ROW LEVEL SECURITY;
ALTER TABLE book_cache ENABLE ROW LEVEL SECURITY;
ALTER TABLE app_testimonials ENABLE ROW LEVEL SECURITY;

-- Note: You'll need to create proper RLS policies after enabling
-- See supabase/migrations/ for policy examples