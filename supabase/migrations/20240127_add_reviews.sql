-- Create reviews table
CREATE TABLE IF NOT EXISTS public.reviews (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  book_id TEXT NOT NULL,
  user_id TEXT NOT NULL,
  rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
  title TEXT,
  content TEXT NOT NULL,
  helpful INTEGER DEFAULT 0,
  verified BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- Foreign keys
  CONSTRAINT fk_review_book FOREIGN KEY (book_id) REFERENCES public.books(id) ON DELETE CASCADE,
  CONSTRAINT fk_review_user FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE,
  
  -- Unique constraint to ensure one review per user per book
  UNIQUE(book_id, user_id)
);

-- Create indexes for reviews
CREATE INDEX idx_reviews_book_rating ON public.reviews(book_id, rating);
CREATE INDEX idx_reviews_user_created ON public.reviews(user_id, created_at);

-- Create review_votes table
CREATE TABLE IF NOT EXISTS public.review_votes (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  review_id TEXT NOT NULL,
  user_id TEXT NOT NULL,
  helpful BOOLEAN NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- Foreign keys
  CONSTRAINT fk_vote_review FOREIGN KEY (review_id) REFERENCES public.reviews(id) ON DELETE CASCADE,
  CONSTRAINT fk_vote_user FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE,
  
  -- Unique constraint to ensure one vote per user per review
  UNIQUE(review_id, user_id)
);

-- Add review stats columns to books table
ALTER TABLE public.books 
ADD COLUMN IF NOT EXISTS avg_rating DECIMAL(3,2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS review_count INTEGER DEFAULT 0;

-- Create function to update book rating stats
CREATE OR REPLACE FUNCTION update_book_rating_stats()
RETURNS TRIGGER AS $$
BEGIN
  -- Update the book's average rating and review count
  UPDATE public.books
  SET 
    avg_rating = (
      SELECT COALESCE(AVG(rating)::DECIMAL(3,2), 0)
      FROM public.reviews
      WHERE book_id = COALESCE(NEW.book_id, OLD.book_id)
    ),
    review_count = (
      SELECT COUNT(*)
      FROM public.reviews
      WHERE book_id = COALESCE(NEW.book_id, OLD.book_id)
    )
  WHERE id = COALESCE(NEW.book_id, OLD.book_id);
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to update book stats when reviews change
DROP TRIGGER IF EXISTS update_book_rating_on_review ON public.reviews;
CREATE TRIGGER update_book_rating_on_review
AFTER INSERT OR UPDATE OR DELETE ON public.reviews
FOR EACH ROW
EXECUTE FUNCTION update_book_rating_stats();

-- Create function to update review helpful count
CREATE OR REPLACE FUNCTION update_review_helpful_count()
RETURNS TRIGGER AS $$
BEGIN
  -- Update the review's helpful count
  UPDATE public.reviews
  SET helpful = (
    SELECT COUNT(*)
    FROM public.review_votes
    WHERE review_id = COALESCE(NEW.review_id, OLD.review_id)
    AND helpful = true
  )
  WHERE id = COALESCE(NEW.review_id, OLD.review_id);
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to update helpful count when votes change
DROP TRIGGER IF EXISTS update_review_helpful_on_vote ON public.review_votes;
CREATE TRIGGER update_review_helpful_on_vote
AFTER INSERT OR UPDATE OR DELETE ON public.review_votes
FOR EACH ROW
EXECUTE FUNCTION update_review_helpful_count();

-- Enable Row Level Security
ALTER TABLE public.reviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.review_votes ENABLE ROW LEVEL SECURITY;

-- Create policies for reviews
-- Anyone can read reviews
CREATE POLICY "Reviews are viewable by everyone"
  ON public.reviews FOR SELECT
  USING (true);

-- Users can create reviews for books they haven't reviewed yet
CREATE POLICY "Users can create reviews"
  ON public.reviews FOR INSERT
  WITH CHECK (auth.uid()::text = user_id);

-- Users can update their own reviews
CREATE POLICY "Users can update own reviews"
  ON public.reviews FOR UPDATE
  USING (auth.uid()::text = user_id);

-- Users can delete their own reviews
CREATE POLICY "Users can delete own reviews"
  ON public.reviews FOR DELETE
  USING (auth.uid()::text = user_id);

-- Create policies for review_votes
-- Anyone can read votes
CREATE POLICY "Review votes are viewable by everyone"
  ON public.review_votes FOR SELECT
  USING (true);

-- Users can create votes
CREATE POLICY "Users can create votes"
  ON public.review_votes FOR INSERT
  WITH CHECK (auth.uid()::text = user_id);

-- Users can update their own votes
CREATE POLICY "Users can update own votes"
  ON public.review_votes FOR UPDATE
  USING (auth.uid()::text = user_id);

-- Users can delete their own votes
CREATE POLICY "Users can delete own votes"
  ON public.review_votes FOR DELETE
  USING (auth.uid()::text = user_id);