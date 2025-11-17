-- Add slug column to featured_books
ALTER TABLE "public"."featured_books" ADD COLUMN "slug" TEXT;

-- Create unique index on slug
CREATE UNIQUE INDEX "featured_books_slug_key" ON "public"."featured_books"("slug");

-- Drop old indexes
DROP INDEX IF EXISTS "featured_books_popularity_score_idx";
DROP INDEX IF EXISTS "featured_books_reading_time_minutes_idx";

-- Add composite indexes for stable cursor pagination (GPT-5 recommendation)
CREATE INDEX "featured_books_popularity_score_id_idx" ON "public"."featured_books"("popularity_score" DESC, "id" ASC);
CREATE INDEX "featured_books_reading_time_minutes_id_idx" ON "public"."featured_books"("reading_time_minutes" ASC, "id" ASC);
CREATE INDEX "featured_books_created_at_id_idx" ON "public"."featured_books"("created_at" DESC, "id" ASC);

-- Update search trigger to include slug (optional, but helpful for slug-based search)
CREATE OR REPLACE FUNCTION update_featured_book_search_vector()
RETURNS trigger AS $$
BEGIN
  NEW.search_vector := to_tsvector('english',
    coalesce(NEW.slug, '') || ' ' ||
    coalesce(NEW.title, '') || ' ' ||
    coalesce(NEW.author, '') || ' ' ||
    coalesce(NEW.description, '')
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;
