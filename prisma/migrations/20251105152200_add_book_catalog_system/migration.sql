-- ============================================
-- BOOK CATALOG SYSTEM (Book Organization)
-- ============================================

-- CreateTable: BookCollection
CREATE TABLE "public"."book_collections" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "icon" TEXT,
    "type" TEXT NOT NULL,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "isPrimary" BOOLEAN NOT NULL DEFAULT false,
    "is_smart_collection" BOOLEAN NOT NULL DEFAULT false,
    "smart_rules" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "book_collections_pkey" PRIMARY KEY ("id")
);

-- CreateTable: BookCollectionMembership
CREATE TABLE "public"."book_collection_membership" (
    "id" TEXT NOT NULL,
    "book_id" TEXT NOT NULL,
    "collection_id" TEXT NOT NULL,
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "book_collection_membership_pkey" PRIMARY KEY ("id")
);

-- CreateTable: FeaturedBook
CREATE TABLE "public"."featured_books" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "author" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "sentences" INTEGER NOT NULL,
    "bundles" INTEGER NOT NULL,
    "gradient" TEXT NOT NULL,
    "abbreviation" TEXT NOT NULL,
    "genres" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "themes" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "moods" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "region" TEXT,
    "country" TEXT,
    "literary_movement" TEXT,
    "publication_year" INTEGER,
    "era" TEXT,
    "reading_time_minutes" INTEGER NOT NULL DEFAULT 0,
    "difficulty_score" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "popularity_score" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "is_classic" BOOLEAN NOT NULL DEFAULT true,
    "is_featured" BOOLEAN NOT NULL DEFAULT false,
    "is_new" BOOLEAN NOT NULL DEFAULT false,
    "total_reads" INTEGER NOT NULL DEFAULT 0,
    "completion_rate" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "average_rating" DOUBLE PRECISION,
    "facets" JSONB,
    "search_vector" tsvector,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "featured_books_pkey" PRIMARY KEY ("id")
);

-- CreateTable: BookTag
CREATE TABLE "public"."book_tags" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "book_tags_pkey" PRIMARY KEY ("id")
);

-- CreateTable: BookTagMembership
CREATE TABLE "public"."book_tag_membership" (
    "id" TEXT NOT NULL,
    "book_id" TEXT NOT NULL,
    "tag_id" TEXT NOT NULL,

    CONSTRAINT "book_tag_membership_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "book_collections_slug_key" ON "public"."book_collections"("slug");
CREATE INDEX "book_collections_type_sortOrder_idx" ON "public"."book_collections"("type", "sortOrder");
CREATE INDEX "book_collections_isPrimary_sortOrder_idx" ON "public"."book_collections"("isPrimary", "sortOrder");

CREATE INDEX "book_collection_membership_collection_id_sort_order_idx" ON "public"."book_collection_membership"("collection_id", "sort_order");
CREATE INDEX "book_collection_membership_book_id_idx" ON "public"."book_collection_membership"("book_id");
CREATE UNIQUE INDEX "book_collection_membership_book_id_collection_id_key" ON "public"."book_collection_membership"("book_id", "collection_id");

CREATE INDEX "featured_books_is_classic_is_featured_idx" ON "public"."featured_books"("is_classic", "is_featured");
CREATE INDEX "featured_books_popularity_score_idx" ON "public"."featured_books"("popularity_score");
CREATE INDEX "featured_books_reading_time_minutes_idx" ON "public"."featured_books"("reading_time_minutes");
CREATE INDEX "featured_books_search_vector_idx" ON "public"."featured_books" USING GIN ("search_vector");

CREATE UNIQUE INDEX "book_tags_slug_key" ON "public"."book_tags"("slug");
CREATE INDEX "book_tags_type_slug_idx" ON "public"."book_tags"("type", "slug");

CREATE INDEX "book_tag_membership_tag_id_book_id_idx" ON "public"."book_tag_membership"("tag_id", "book_id");
CREATE INDEX "book_tag_membership_book_id_tag_id_idx" ON "public"."book_tag_membership"("book_id", "tag_id");
CREATE UNIQUE INDEX "book_tag_membership_book_id_tag_id_key" ON "public"."book_tag_membership"("book_id", "tag_id");

-- AddForeignKey
ALTER TABLE "public"."book_collection_membership" ADD CONSTRAINT "book_collection_membership_collection_id_fkey" FOREIGN KEY ("collection_id") REFERENCES "public"."book_collections"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "public"."book_collection_membership" ADD CONSTRAINT "book_collection_membership_book_id_fkey" FOREIGN KEY ("book_id") REFERENCES "public"."featured_books"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "public"."book_tag_membership" ADD CONSTRAINT "book_tag_membership_book_id_fkey" FOREIGN KEY ("book_id") REFERENCES "public"."featured_books"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "public"."book_tag_membership" ADD CONSTRAINT "book_tag_membership_tag_id_fkey" FOREIGN KEY ("tag_id") REFERENCES "public"."book_tags"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- ============================================
-- FULL-TEXT SEARCH SETUP (PostgreSQL)
-- ============================================

-- Create function to update search_vector
CREATE OR REPLACE FUNCTION update_featured_book_search_vector()
RETURNS trigger AS $$
BEGIN
  NEW.search_vector := to_tsvector('english',
    coalesce(NEW.title, '') || ' ' ||
    coalesce(NEW.author, '') || ' ' ||
    coalesce(NEW.description, '')
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger
CREATE TRIGGER featured_book_search_vector_update
BEFORE INSERT OR UPDATE ON "public"."featured_books"
FOR EACH ROW EXECUTE FUNCTION update_featured_book_search_vector();
