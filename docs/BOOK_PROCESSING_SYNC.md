# Book Processing & Enhanced Collection Sync Guide

## For Computers Processing Books

### Quick Start

When you've processed new books with simplifications, follow these steps:

```bash
# 1. Pull latest changes first
git switch main
git pull origin main

# 2. Run the sync script to see which books are enhanced
node scripts/sync-enhanced-books.js

# 3. Commit your book processing work
git add -A
git commit -m "feat: add simplifications for [book names]"
git push origin main
```

### How It Works

1. **Automatic Detection**: Any book in the database with at least one simplification is automatically considered "enhanced"

2. **Dynamic Collection**: The Enhanced Collection page now pulls books directly from the database via `/api/books/enhanced`

3. **No Manual Updates Needed**: You don't need to manually update any lists or arrays - just process books and they'll appear!

### Processing New Books

When processing new books, make sure to:

1. Store the book content in the `BookContent` table
2. Create simplifications in the `Simplification` table
3. Link simplifications to the book via `bookContentId`

### Checking Your Work

Run the sync script to see the current status:

```bash
node scripts/sync-enhanced-books.js
```

This will show you:
- ✅ Enhanced books (with simplifications)
- ⏳ Pending books (no simplifications yet)
- 📊 Summary statistics

### Book Metadata

The system automatically assigns metadata based on book titles:
- Genre (Romance, Fantasy, Gothic, etc.)
- CEFR levels (A1-C2 range)
- Estimated reading hours

If a book doesn't match any pattern, it gets default values:
- Genre: "Classic"
- CEFR: "B1-C2"
- Hours: 5

### Testing the Enhanced Collection

To test if your books appear:

1. Visit `/enhanced-collection` in the browser
2. Or fetch the API directly: `GET /api/books/enhanced`

### Dynamic vs Static Version

- **Dynamic** (`page-dynamic.tsx`): Pulls from database in real-time
- **Static** (`page.tsx`): Current hardcoded version

To switch to dynamic version:
```bash
mv app/enhanced-collection/page.tsx app/enhanced-collection/page-static.tsx
mv app/enhanced-collection/page-dynamic.tsx app/enhanced-collection/page.tsx
```

### Troubleshooting

If books don't appear:
1. Check if they have simplifications: `SELECT * FROM "Simplification" WHERE "bookContentId" = ?`
2. Run the sync script to debug
3. Check the API response: `/api/books/enhanced`

### Example Processing Script

```javascript
// Example: Process a new book
const bookId = 'gutenberg-12345';
const title = 'New Book Title';

// 1. Store book content
await prisma.bookContent.create({
  data: {
    bookId,
    title,
    author,
    content,
    chunks: [...]
  }
});

// 2. Create simplifications
await prisma.simplification.createMany({
  data: [
    { bookContentId, level: 'A1', chunkIndex: 0, simplifiedText: '...' },
    { bookContentId, level: 'A2', chunkIndex: 0, simplifiedText: '...' },
    // ... more levels
  ]
});

// 3. Book automatically appears in enhanced collection!
```

## Summary

**No more manual updates!** Just:
1. Process books with simplifications
2. They automatically appear in Enhanced Collection
3. Commit and push your work

The enhanced collection updates itself from the database.