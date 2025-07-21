# Vector Search Setup Guide

## Overview
Vector search enables semantic understanding of book content, allowing the AI to find relevant passages based on meaning rather than just keywords. This dramatically improves response quality and accuracy.

## Setup Instructions

### 1. Pinecone Setup (Free Tier Available)

1. **Sign up for Pinecone** (free):
   - Go to https://www.pinecone.io/
   - Create a free account (no credit card required)
   - Free tier includes 1 index with 100K vectors

2. **Create an API Key**:
   - Go to your Pinecone dashboard
   - Navigate to "API Keys"
   - Create a new API key
   - Copy the key value

3. **Add to Environment Variables**:
   ```bash
   # In your .env.local file
   PINECONE_API_KEY=your-pinecone-api-key
   PINECONE_INDEX=bookbridge-books  # Optional, defaults to bookbridge-books
   ```

### 2. OpenAI Setup (For Embeddings)

If you don't already have an OpenAI API key:

1. **Sign up at** https://platform.openai.com/
2. **Create an API key** in your account settings
3. **Add to .env.local**:
   ```bash
   OPENAI_API_KEY=sk-your-openai-api-key
   ```

### 3. Index Your Books

After setting up the API keys, run the indexing script:

```bash
npx ts-node scripts/index-books.ts
```

This will:
- Check all books in your database
- Create vector embeddings for each chunk
- Store them in Pinecone for semantic search

## How It Works

1. **Book Upload**: When a book is uploaded, it's automatically chunked and indexed
2. **Query Processing**: User queries are converted to embeddings
3. **Semantic Search**: Find chunks with similar meaning, not just matching keywords
4. **Enhanced Context**: AI receives the most relevant passages for accurate answers

## Testing Vector Search

1. **Without Vector Search** (keyword only):
   - Query: "What did the author think about dishonesty?"
   - Result: May miss relevant passages about "fraud", "deception", etc.

2. **With Vector Search** (semantic):
   - Query: "What did the author think about dishonesty?"
   - Result: Finds passages about fraud, corruption, deception, lying, etc.

## Fallback Behavior

If vector search is not configured:
- The system automatically falls back to keyword search
- All features remain functional
- Response quality may be lower for complex queries

## Cost Considerations

- **Pinecone Free Tier**: 100K vectors (enough for ~50-100 books)
- **OpenAI Embeddings**: ~$0.0001 per 1K tokens
- **Typical Book**: ~$0.10-0.30 to index

## Troubleshooting

### "Vector search not available" message
- Check that both PINECONE_API_KEY and OPENAI_API_KEY are set
- Restart your development server after adding keys

### Indexing fails
- Verify your Pinecone API key is correct
- Check that you have internet connectivity
- Look for error messages in the console

### Search not finding relevant content
- Ensure the book has been indexed (run the index script)
- Try more specific queries
- Check Pinecone dashboard to verify vectors exist