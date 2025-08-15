# Phase 1: Conversation Memory Implementation

## Overview
Implement persistent conversation storage to enable episodic memory and context continuity across sessions.

## Priority: CRITICAL (Week 1)
This is the foundation that enables all other AI improvements.

## Technical Requirements

### 1. Database Schema Updates
```sql
-- Already exists in Prisma schema:
-- Conversation model with id, userId, bookId, title, createdAt, updatedAt
-- Message model with id, conversationId, content, sender, tokensUsed, model, cost

-- New fields needed:
ALTER TABLE messages ADD COLUMN embedding VECTOR(1536);
ALTER TABLE messages ADD COLUMN user_reaction VARCHAR(20);
ALTER TABLE messages ADD COLUMN concepts_discussed TEXT[];
```

### 2. API Endpoints to Create/Modify

#### POST /api/conversations
```typescript
// Create or retrieve conversation for user+book
interface CreateConversationRequest {
  userId: string;
  bookId: string;
  title?: string;
}

interface CreateConversationResponse {
  conversationId: string;
  isNew: boolean;
  messageCount: number;
}
```

#### POST /api/conversations/:id/messages
```typescript
// Add message to conversation
interface AddMessageRequest {
  content: string;
  sender: 'user' | 'assistant';
  embedding?: number[];
  tokensUsed?: number;
  model?: string;
  cost?: number;
  userReaction?: 'confused' | 'understood' | 'engaged';
  conceptsDiscussed?: string[];
}
```

### 3. Service Implementation

```typescript
// lib/conversation/conversation-service.ts
export class ConversationService {
  async findOrCreateConversation(userId: string, bookId: string): Promise<Conversation> {
    const existing = await prisma.conversation.findFirst({
      where: { userId, bookId },
      orderBy: { updatedAt: 'desc' }
    });
    
    if (existing) return existing;
    
    return await prisma.conversation.create({
      data: { userId, bookId, title: `Reading session ${new Date().toLocaleDateString()}` }
    });
  }
  
  async addMessage(conversationId: string, message: MessageInput): Promise<Message> {
    // Generate embedding if not provided
    if (!message.embedding && message.content) {
      message.embedding = await vectorService.createEmbedding(message.content);
    }
    
    return await prisma.message.create({
      data: { ...message, conversationId }
    });
  }
  
  async getConversationContext(conversationId: string, lastN: number = 10): Promise<ConversationContext> {
    const messages = await prisma.message.findMany({
      where: { conversationId },
      orderBy: { createdAt: 'desc' },
      take: lastN
    });
    
    return {
      messages: messages.reverse(),
      summary: await this.summarizeMessages(messages),
      concepts: this.extractConcepts(messages)
    };
  }
}
```

### 4. Integration with AI Route

```typescript
// app/api/ai/route.ts - Add conversation storage
export async function POST(request: NextRequest) {
  // ... existing code ...
  
  // NEW: Create/retrieve conversation
  const conversation = await conversationService.findOrCreateConversation(user.id, bookId);
  
  // NEW: Store user message
  await conversationService.addMessage(conversation.id, {
    content: query,
    sender: 'user',
    embedding: await vectorService.createEmbedding(query)
  });
  
  // NEW: Get conversation context
  const conversationContext = await conversationService.getConversationContext(conversation.id);
  
  // Pass context to AI service
  const response = await aiService.query(query, {
    userId: user.id,
    bookId,
    bookContext: enrichedBookContext,
    conversationContext, // NEW
    maxTokens,
    responseMode
  });
  
  // NEW: Store AI response
  await conversationService.addMessage(conversation.id, {
    content: response.content,
    sender: 'assistant',
    tokensUsed: response.usage.total_tokens,
    model: response.model,
    cost: response.cost,
    conceptsDiscussed: extractConcepts(response.content)
  });
  
  // ... rest of response ...
}
```

### 5. Episodic Memory Layer

```typescript
// lib/memory/episodic-memory.ts
export class EpisodicMemory {
  async getRelevantMemories(userId: string, query: string, bookId?: string): Promise<Memory[]> {
    // Find similar past conversations using embeddings
    const queryEmbedding = await vectorService.createEmbedding(query);
    
    const memories = await prisma.$queryRaw`
      SELECT m.*, c.bookId, 
             1 - (m.embedding <=> ${queryEmbedding}) as similarity
      FROM messages m
      JOIN conversations c ON m.conversationId = c.id
      WHERE c.userId = ${userId}
      ${bookId ? `AND c.bookId = ${bookId}` : ''}
      AND m.embedding IS NOT NULL
      ORDER BY similarity DESC
      LIMIT 5
    `;
    
    return memories;
  }
  
  async recordLearningMoment(messageId: string, reaction: UserReaction): Promise<void> {
    await prisma.message.update({
      where: { id: messageId },
      data: { userReaction: reaction }
    });
  }
}
```

## Success Criteria

1. **Every query creates/retrieves a conversation** ✓
2. **All messages stored with embeddings** ✓
3. **AI has access to last 10 messages for context** ✓
4. **Can retrieve similar past discussions** ✓
5. **User reactions tracked for learning patterns** ✓

## Testing Plan

1. **Unit Tests**
   - ConversationService CRUD operations
   - Embedding generation and storage
   - Context retrieval with proper ordering

2. **Integration Tests**
   - AI route creates conversations
   - Messages properly linked
   - Context passed to AI service

3. **Manual Testing**
   - Start conversation about a book
   - Ask follow-up questions
   - Verify AI references previous messages
   - Close and reopen - context persists

## Migration Strategy

1. **Add new columns to existing tables**
2. **Deploy conversation service**
3. **Update AI route incrementally**
4. **Backfill embeddings for existing data (optional)**

## Rollback Plan

- Feature flag: `ENABLE_CONVERSATION_MEMORY`
- If issues, disable flag to revert to stateless behavior
- No data loss - just stops using context

## Time Estimate: 1 Week

- Day 1-2: Database updates and conversation service
- Day 3-4: AI route integration
- Day 5: Episodic memory implementation
- Day 6-7: Testing and bug fixes

## Dependencies

- Existing Prisma schema (✓ already has tables)
- Vector service for embeddings (✓ exists)
- PostgreSQL with pgvector extension