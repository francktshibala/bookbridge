# Book Search Examples

This guide shows you how to search for books using different API endpoints in BookBridge.

## 1. Search FeaturedBooks (Enhanced Books with Audio)

**Endpoint:** `/api/featured-books`

### Basic Search by Title/Author/Description
```bash
# Search for "Always a Family"
GET /api/featured-books?q=always%20a%20family

# Search for books by author "Danny"
GET /api/featured-books?q=danny

# Search for "love" in title, author, or description
GET /api/featured-books?q=love
```

### Filter by Genre
```bash
# Find all "True Story" books
GET /api/featured-books?genres=True%20Story

# Multiple genres (OR logic)
GET /api/featured-books?genres=True%20Story,Love,Relationships
```

### Filter by Theme
```bash
# Find books with "Love" theme
GET /api/featured-books?themes=Love

# Multiple themes
GET /api/featured-books?themes=Love,Marriage,Devotion
```

### Filter by Mood
```bash
# Find "Heartwarming" books
GET /api/featured-books?moods=Heartwarming

# Multiple moods
GET /api/featured-books?moods=Heartwarming,Tearjerker,Beautiful
```

### Combine Search + Filters
```bash
# Search for "family" AND filter by "Love" theme
GET /api/featured-books?q=family&themes=Love

# Search for "love" AND filter by "Heartwarming" mood
GET /api/featured-books?q=love&moods=Heartwarming

# Complex: Search + Genre + Theme + Mood
GET /api/featured-books?q=story&genres=True%20Story&themes=Love&moods=Heartwarming
```

### Filter by Collection
```bash
# Find all books in "Modern Voices" collection
GET /api/featured-books?collection=modern-voices

# Search within a collection
GET /api/featured-books?collection=modern-voices&q=family
```

### Filter by Reading Time
```bash
# Books under 15 minutes
GET /api/featured-books?readingTimeMax=15

# Books under 30 minutes with "love" theme
GET /api/featured-books?readingTimeMax=30&themes=Love
```

### Sorting Options
```bash
# Sort by popularity (default)
GET /api/featured-books?q=love&sort=popularityScore

# Sort by title
GET /api/featured-books?q=love&sort=title

# Sort by author
GET /api/featured-books?q=love&sort=author
```

### Pagination
```bash
# First page (default: 20 items)
GET /api/featured-books?q=love

# Next page using cursor
GET /api/featured-books?q=love&cursor=eyJwb3B1bGFyaXR5U2NvcmUiOjk1LCJpZCI6ImNtaW1qenRxcjAwMDBxbHRwN25nMGJ2ZjIifQ==

# Limit results (max 50)
GET /api/featured-books?q=love&limit=10
```

### Complete Example: Find "Always a Family"
```bash
# Method 1: Direct search
GET /api/featured-books?q=always%20a%20family

# Method 2: By genre
GET /api/featured-books?genres=True%20Story

# Method 3: By theme
GET /api/featured-books?themes=Love

# Method 4: By mood
GET /api/featured-books?moods=Heartwarming

# Method 5: Combined filters
GET /api/featured-books?genres=True%20Story&themes=Love&moods=Heartwarming
```

---

## 2. Search External Books (Gutenberg, OpenLibrary, etc.)

**Endpoint:** `/api/books/googlebooks/search`

### Basic Search
```bash
# Search for "Pride and Prejudice"
GET /api/books/googlebooks/search?q=pride%20and%20prejudice

# Search for author "Jane Austen"
GET /api/books/googlebooks/search?q=inauthor:jane%20austen

# Search by subject/genre
GET /api/books/googlebooks/search?q=subject:fiction
```

### Advanced Google Books Queries
```bash
# Search by title
GET /api/books/googlebooks/search?q=intitle:romeo%20juliet

# Search by author
GET /api/books/googlebooks/search?q=inauthor:shakespeare

# Combine title and author
GET /api/books/googlebooks/search?q=intitle:hamlet%20inauthor:shakespeare

# Search by subject/genre
GET /api/books/googlebooks/search?q=subject:romance

# Multiple subjects
GET /api/books/googlebooks/search?q=subject:fiction%20subject:classic
```

### Pagination
```bash
# First page
GET /api/books/googlebooks/search?q=fiction&page=1&limit=40

# Second page
GET /api/books/googlebooks/search?q=fiction&page=2&limit=40
```

---

## 3. Search User's Saved Books

**Endpoint:** `/api/books`

**Note:** Requires authentication

### Basic Search
```bash
# Search in title, author, or genre
GET /api/books?search=pride

# Search with pagination
GET /api/books?search=pride&page=1&limit=10
```

---

## 4. JavaScript/TypeScript Examples

### Search FeaturedBooks
```typescript
// Basic search
const response = await fetch('/api/featured-books?q=always%20a%20family');
const data = await response.json();
console.log('Found books:', data.items);

// Search with filters
const searchWithFilters = async () => {
  const params = new URLSearchParams({
    q: 'love',
    genres: 'True Story,Love',
    themes: 'Love,Marriage',
    moods: 'Heartwarming',
    limit: '20'
  });
  
  const response = await fetch(`/api/featured-books?${params}`);
  const data = await response.json();
  
  console.log('Books:', data.items);
  console.log('Facets:', data.facets); // Available genres, themes, moods
  console.log('Total:', data.totalApprox);
};

// Search by collection
const searchCollection = async () => {
  const response = await fetch('/api/featured-books?collection=modern-voices');
  const data = await response.json();
  console.log('Modern Voices books:', data.items);
};
```

### Search External Books
```typescript
// Google Books search
const searchGoogleBooks = async (query: string) => {
  const params = new URLSearchParams({
    q: query,
    page: '1',
    limit: '40'
  });
  
  const response = await fetch(`/api/books/googlebooks/search?${params}`);
  const data = await response.json();
  
  console.log('Books:', data.books);
  console.log('Has more:', data.hasMore);
};
```

### React Hook Example
```typescript
import { useState, useEffect } from 'react';

function useBookSearch(query: string, filters?: {
  genres?: string[];
  themes?: string[];
  moods?: string[];
}) {
  const [books, setBooks] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!query || query.length < 2) return;

    const searchBooks = async () => {
      setLoading(true);
      setError(null);

      try {
        const params = new URLSearchParams({ q: query });
        
        if (filters?.genres) {
          params.append('genres', filters.genres.join(','));
        }
        if (filters?.themes) {
          params.append('themes', filters.themes.join(','));
        }
        if (filters?.moods) {
          params.append('moods', filters.moods.join(','));
        }

        const response = await fetch(`/api/featured-books?${params}`);
        const data = await response.json();
        
        setBooks(data.items);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    searchBooks();
  }, [query, filters]);

  return { books, loading, error };
}

// Usage
function BookSearchComponent() {
  const { books, loading, error } = useBookSearch('always a family', {
    genres: ['True Story'],
    moods: ['Heartwarming']
  });

  if (loading) return <div>Searching...</div>;
  if (error) return <div>Error: {error}</div>;

  return (
    <div>
      {books.map(book => (
        <div key={book.id}>{book.title} by {book.author}</div>
      ))}
    </div>
  );
}
```

---

## 5. cURL Examples

### Search FeaturedBooks
```bash
# Basic search
curl "http://localhost:3000/api/featured-books?q=always%20a%20family"

# With filters
curl "http://localhost:3000/api/featured-books?q=love&genres=True%20Story&moods=Heartwarming"

# Pretty print JSON
curl "http://localhost:3000/api/featured-books?q=love" | jq
```

### Search External Books
```bash
# Google Books search
curl "http://localhost:3000/api/books/googlebooks/search?q=pride%20and%20prejudice"
```

---

## 6. Response Format

### FeaturedBooks Response
```json
{
  "items": [
    {
      "id": "cmimjztqr0000qltp7ng0bvf2",
      "slug": "always-a-family",
      "title": "Always a Family",
      "author": "Danny & Annie Perasa",
      "description": "Deeply moving StoryCorps conversation...",
      "genres": ["True Story", "Love", "Relationships"],
      "themes": ["Love", "Marriage", "Devotion", "Family", "Enduring Love"],
      "moods": ["Heartwarming", "Tearjerker", "Beautiful"],
      "readingTimeMinutes": 5,
      "sentences": 60,
      "bundles": 15
    }
  ],
  "nextCursor": null,
  "totalApprox": 1,
  "facets": {
    "genres": [
      { "name": "True Story", "count": 1 },
      { "name": "Love", "count": 1 }
    ],
    "themes": [
      { "name": "Love", "count": 1 },
      { "name": "Marriage", "count": 1 }
    ],
    "moods": [
      { "name": "Heartwarming", "count": 1 },
      { "name": "Tearjerker", "count": 1 }
    ],
    "readingTimes": [
      { "range": "< 15 min", "count": 1 }
    ]
  }
}
```

---

## 7. Quick Reference

| Search Type | Endpoint | Query Param | Example |
|------------|----------|-------------|---------|
| FeaturedBooks (text) | `/api/featured-books` | `q` | `?q=always%20a%20family` |
| FeaturedBooks (genre) | `/api/featured-books` | `genres` | `?genres=True%20Story` |
| FeaturedBooks (theme) | `/api/featured-books` | `themes` | `?themes=Love` |
| FeaturedBooks (mood) | `/api/featured-books` | `moods` | `?moods=Heartwarming` |
| FeaturedBooks (collection) | `/api/featured-books` | `collection` | `?collection=modern-voices` |
| External Books | `/api/books/googlebooks/search` | `q` | `?q=pride%20and%20prejudice` |
| User Books | `/api/books` | `search` | `?search=pride` |

---

## 8. Tips

1. **Minimum search length:** FeaturedBooks search requires at least 2 characters
2. **Case insensitive:** All searches are case-insensitive
3. **Multiple filters:** Use comma-separated values for multiple genres/themes/moods (OR logic)
4. **Combining filters:** Multiple filter types use AND logic
5. **Pagination:** Use `cursor` for FeaturedBooks, `page` for external books
6. **Facets:** Check `facets` in response to see available filter options

---

## 9. Real-World Examples

### Find all heartwarming love stories
```bash
GET /api/featured-books?themes=Love&moods=Heartwarming
```

### Find short reads (under 15 minutes)
```bash
GET /api/featured-books?readingTimeMax=15
```

### Find books in Modern Voices collection about family
```bash
GET /api/featured-books?collection=modern-voices&q=family
```

### Find classic literature from Gutenberg
```bash
GET /api/books/googlebooks/search?q=subject:classic%20literature
```

