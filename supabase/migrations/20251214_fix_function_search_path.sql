-- Fix Function Search Path Security Warnings
-- Adds SECURITY INVOKER to all functions that had mutable search_path warnings
-- Date: 2025-12-14
-- Issue: Supabase Security Advisor Warning - Function Search Path Mutable

-- Drop existing functions first to avoid signature conflicts
-- CASCADE is safe here because we're immediately recreating the functions
-- Triggers will automatically use the new function definitions
DROP FUNCTION IF EXISTS public.update_audio_access() CASCADE;
DROP FUNCTION IF EXISTS public.update_reading_positions_updated_at() CASCADE;
DROP FUNCTION IF EXISTS public.handle_updated_at() CASCADE;
DROP FUNCTION IF EXISTS public.cleanup_expired_audio_cache() CASCADE;
DROP FUNCTION IF EXISTS public.update_featured_book_search_vector() CASCADE;
DROP FUNCTION IF EXISTS public.invalidate_book_audio_cache() CASCADE;
DROP FUNCTION IF EXISTS public.invalidate_book_audio_cache(character varying) CASCADE;
DROP FUNCTION IF EXISTS public.get_audio_cache_stats() CASCADE;

-- 1. update_audio_access
CREATE FUNCTION public.update_audio_access()
RETURNS trigger
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $function$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$function$;

-- 2. update_reading_positions_updated_at
CREATE FUNCTION public.update_reading_positions_updated_at()
RETURNS trigger
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $function$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$function$;

-- 3. handle_updated_at
CREATE FUNCTION public.handle_updated_at()
RETURNS trigger
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $function$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$function$;

-- 4. cleanup_expired_audio_cache
CREATE FUNCTION public.cleanup_expired_audio_cache()
RETURNS void
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $function$
BEGIN
  DELETE FROM public.audio_cache
  WHERE expires_at < NOW();
END;
$function$;

-- 5. update_featured_book_search_vector
CREATE FUNCTION public.update_featured_book_search_vector()
RETURNS trigger
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $function$
BEGIN
  NEW.search_vector =
    setweight(to_tsvector('english', COALESCE(NEW.title, '')), 'A') ||
    setweight(to_tsvector('english', COALESCE(NEW.author, '')), 'B') ||
    setweight(to_tsvector('english', COALESCE(NEW.description, '')), 'C');
  RETURN NEW;
END;
$function$;

-- 6. invalidate_book_audio_cache (trigger version)
CREATE FUNCTION public.invalidate_book_audio_cache()
RETURNS trigger
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $function$
BEGIN
  DELETE FROM public.book_cache
  WHERE book_id = NEW.id;
  RETURN NEW;
END;
$function$;

-- 6b. invalidate_book_audio_cache (function version with argument)
CREATE FUNCTION public.invalidate_book_audio_cache(target_book_id character varying)
RETURNS void
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $function$
BEGIN
  DELETE FROM public.book_cache
  WHERE book_id = target_book_id;
END;
$function$;

-- 7. get_audio_cache_stats
CREATE FUNCTION public.get_audio_cache_stats()
RETURNS TABLE(
  total_entries bigint,
  expired_entries bigint,
  active_entries bigint,
  total_size_bytes bigint
)
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $function$
BEGIN
  RETURN QUERY
  SELECT
    COUNT(*)::bigint AS total_entries,
    COUNT(*) FILTER (WHERE expires_at < NOW())::bigint AS expired_entries,
    COUNT(*) FILTER (WHERE expires_at >= NOW())::bigint AS active_entries,
    COALESCE(SUM(LENGTH(audio_data)), 0)::bigint AS total_size_bytes
  FROM public.audio_cache;
END;
$function$;

-- Verification: Check all functions have SECURITY INVOKER set
-- Run this query to verify:
-- SELECT proname, prosecdef, pg_get_function_arguments(oid) AS arguments
-- FROM pg_proc
-- WHERE pronamespace = 'public'::regnamespace
--   AND proname IN (
--     'update_audio_access',
--     'update_reading_positions_updated_at',
--     'handle_updated_at',
--     'cleanup_expired_audio_cache',
--     'update_featured_book_search_vector',
--     'invalidate_book_audio_cache',
--     'get_audio_cache_stats'
--   );
-- Expected: All should have prosecdef = false (SECURITY INVOKER)
-- Note: invalidate_book_audio_cache has two versions - one trigger, one with argument
