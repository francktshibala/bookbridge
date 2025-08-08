# Phase 2: Spaced Repetition System Implementation

## Overview
Implement a scientifically-proven spaced repetition system for long-term retention of literary concepts, themes, and vocabulary.

## Priority: HIGH (Week 4-5)
Essential for transforming one-time learning into lasting knowledge.

## Technical Requirements

### 1. Database Schema Updates
```sql
-- Core spaced repetition tables
CREATE TABLE spaced_repetition_items (
  id TEXT PRIMARY KEY,
  user_id TEXT REFERENCES users(id),
  item_type TEXT CHECK (item_type IN ('concept', 'quote', 'vocabulary', 'theme')),
  content JSONB NOT NULL, -- Flexible content structure
  book_id TEXT,
  chapter_reference TEXT,
  difficulty FLOAT DEFAULT 2.5, -- Anki-style difficulty rating
  interval_days INT DEFAULT 1, -- Days until next review
  ease_factor FLOAT DEFAULT 2.5, -- Multiplier for interval growth
  next_review_date DATE NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE review_history (
  id TEXT PRIMARY KEY,
  item_id TEXT REFERENCES spaced_repetition_items(id),
  user_id TEXT REFERENCES users(id),
  reviewed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  quality INT CHECK (quality BETWEEN 0 AND 5), -- 0=forgot, 5=perfect
  time_taken_ms INT,
  interval_before INT,
  interval_after INT
);

-- Indexes for efficient queries
CREATE INDEX idx_next_review ON spaced_repetition_items(user_id, next_review_date);
CREATE INDEX idx_item_type ON spaced_repetition_items(user_id, item_type);
```

### 2. Spaced Repetition Algorithm (SM-2 Based)

```typescript
// lib/spaced-repetition/algorithm.ts
export class SpacedRepetitionAlgorithm {
  // Based on SuperMemo SM-2 algorithm with modifications
  
  calculateNextReview(
    quality: number, // 0-5 rating
    repetitions: number,
    easeFactor: number,
    interval: number
  ): ReviewSchedule {
    let newEaseFactor = easeFactor;
    let newInterval = interval;
    let newRepetitions = repetitions;

    if (quality < 3) {
      // Failed review - reset
      newRepetitions = 0;
      newInterval = 1;
    } else {
      // Successful review
      if (repetitions === 0) {
        newInterval = 1;
      } else if (repetitions === 1) {
        newInterval = 6;
      } else {
        newInterval = Math.round(interval * easeFactor);
      }
      newRepetitions += 1;
    }

    // Adjust ease factor
    newEaseFactor = Math.max(1.3, easeFactor + (0.1 - (5 - quality) * (0.08 + (5 - quality) * 0.02)));

    return {
      interval: newInterval,
      easeFactor: newEaseFactor,
      repetitions: newRepetitions,
      nextReviewDate: new Date(Date.now() + newInterval * 24 * 60 * 60 * 1000)
    };
  }

  // Adaptive difficulty based on user performance
  adjustDifficulty(item: RepetitionItem, history: ReviewHistory[]): number {
    const recentReviews = history.slice(-5);
    const averageQuality = recentReviews.reduce((sum, r) => sum + r.quality, 0) / recentReviews.length;
    
    if (averageQuality < 2.5) {
      return Math.max(1, item.difficulty - 0.5); // Make easier
    } else if (averageQuality > 4) {
      return Math.min(5, item.difficulty + 0.5); // Make harder
    }
    
    return item.difficulty;
  }
}
```

### 3. Content Generation Service

```typescript
// lib/spaced-repetition/content-generator.ts
export class RepetitionContentGenerator {
  async generateFromConversation(
    conversation: Conversation,
    messages: Message[]
  ): Promise<RepetitionItem[]> {
    const items: RepetitionItem[] = [];
    
    // Extract concepts discussed
    const concepts = await this.extractConcepts(messages);
    for (const concept of concepts) {
      items.push({
        type: 'concept',
        content: {
          question: `What is ${concept.name} in the context of ${conversation.bookTitle}?`,
          answer: concept.explanation,
          hints: concept.examples,
          bookContext: concept.bookPassage
        },
        bookId: conversation.bookId,
        difficulty: this.assessConceptDifficulty(concept)
      });
    }
    
    // Extract important quotes
    const quotes = await this.extractImportantQuotes(messages);
    for (const quote of quotes) {
      items.push({
        type: 'quote',
        content: {
          question: `Complete this quote: "${quote.partial}..."`,
          answer: quote.full,
          context: quote.significance,
          character: quote.speaker
        },
        bookId: conversation.bookId,
        difficulty: 2.5
      });
    }
    
    // Extract themes
    const themes = await this.extractThemes(messages);
    for (const theme of themes) {
      items.push({
        type: 'theme',
        content: {
          question: `How does ${conversation.bookTitle} explore the theme of ${theme.name}?`,
          answer: theme.analysis,
          examples: theme.textualEvidence,
          connections: theme.relatedThemes
        },
        bookId: conversation.bookId,
        difficulty: 3.5
      });
    }
    
    return items;
  }
  
  private async extractConcepts(messages: Message[]): Promise<Concept[]> {
    // Use AI to identify key concepts from conversation
    const aiMessages = messages.filter(m => m.sender === 'assistant');
    const prompt = `Extract literary concepts discussed in these messages: ${JSON.stringify(aiMessages)}`;
    
    const extraction = await aiService.query(prompt, {
      systemPrompt: 'Extract key literary concepts, their definitions, and examples.',
      maxTokens: 500
    });
    
    return JSON.parse(extraction.content);
  }
}
```

### 4. Review Interface Components

```typescript
// app/review/page.tsx
'use client';

export default function SpacedRepetitionReview() {
  const [currentItem, setCurrentItem] = useState<RepetitionItem | null>(null);
  const [showAnswer, setShowAnswer] = useState(false);
  const [queue, setQueue] = useState<RepetitionItem[]>([]);
  const [stats, setStats] = useState({ reviewed: 0, correct: 0 });

  useEffect(() => {
    loadReviewQueue();
  }, []);

  const loadReviewQueue = async () => {
    const items = await fetch('/api/spaced-repetition/due').then(r => r.json());
    setQueue(items);
    setCurrentItem(items[0] || null);
  };

  const handleReview = async (quality: number) => {
    if (!currentItem) return;
    
    // Submit review
    await fetch('/api/spaced-repetition/review', {
      method: 'POST',
      body: JSON.stringify({
        itemId: currentItem.id,
        quality,
        timeMs: Date.now() - startTime
      })
    });
    
    // Update stats
    setStats({
      reviewed: stats.reviewed + 1,
      correct: quality >= 3 ? stats.correct + 1 : stats.correct
    });
    
    // Next item
    const newQueue = queue.slice(1);
    setQueue(newQueue);
    setCurrentItem(newQueue[0] || null);
    setShowAnswer(false);
  };

  if (!currentItem) {
    return <ReviewComplete stats={stats} />;
  }

  return (
    <div className="review-container">
      <ProgressBar current={stats.reviewed} total={stats.reviewed + queue.length} />
      
      <Card className="review-card">
        <div className="question-section">
          <Badge>{currentItem.type}</Badge>
          <h2>{currentItem.content.question}</h2>
          {currentItem.content.bookContext && (
            <blockquote className="context">
              "{currentItem.content.bookContext}"
            </blockquote>
          )}
        </div>
        
        {!showAnswer ? (
          <Button onClick={() => setShowAnswer(true)}>
            Show Answer
          </Button>
        ) : (
          <div className="answer-section">
            <div className="answer">{currentItem.content.answer}</div>
            
            <div className="quality-buttons">
              <Button onClick={() => handleReview(0)} variant="danger">
                Forgot
              </Button>
              <Button onClick={() => handleReview(2)} variant="warning">
                Hard
              </Button>
              <Button onClick={() => handleReview(3)} variant="primary">
                Good
              </Button>
              <Button onClick={() => handleReview(5)} variant="success">
                Easy
              </Button>
            </div>
          </div>
        )}
      </Card>
      
      <HintSystem hints={currentItem.content.hints} />
    </div>
  );
}
```

### 5. API Endpoints

```typescript
// app/api/spaced-repetition/due/route.ts
export async function GET(request: NextRequest) {
  const user = await getUser();
  
  // Get items due for review
  const dueItems = await prisma.spacedRepetitionItem.findMany({
    where: {
      userId: user.id,
      nextReviewDate: {
        lte: new Date()
      }
    },
    orderBy: [
      { nextReviewDate: 'asc' },
      { difficulty: 'desc' }
    ],
    take: 20 // Daily limit
  });
  
  return NextResponse.json(dueItems);
}

// app/api/spaced-repetition/review/route.ts
export async function POST(request: NextRequest) {
  const { itemId, quality, timeMs } = await request.json();
  const user = await getUser();
  
  // Get current item
  const item = await prisma.spacedRepetitionItem.findUnique({
    where: { id: itemId }
  });
  
  if (!item || item.userId !== user.id) {
    return NextResponse.json({ error: 'Invalid item' }, { status: 404 });
  }
  
  // Calculate next review
  const algorithm = new SpacedRepetitionAlgorithm();
  const schedule = algorithm.calculateNextReview(
    quality,
    item.repetitions || 0,
    item.easeFactor,
    item.intervalDays
  );
  
  // Update item
  await prisma.spacedRepetitionItem.update({
    where: { id: itemId },
    data: {
      intervalDays: schedule.interval,
      easeFactor: schedule.easeFactor,
      nextReviewDate: schedule.nextReviewDate,
      difficulty: algorithm.adjustDifficulty(item, await getReviewHistory(itemId))
    }
  });
  
  // Record review
  await prisma.reviewHistory.create({
    data: {
      itemId,
      userId: user.id,
      quality,
      timeTakenMs: timeMs,
      intervalBefore: item.intervalDays,
      intervalAfter: schedule.interval
    }
  });
  
  return NextResponse.json({ success: true, nextReview: schedule.nextReviewDate });
}
```

### 6. Automatic Item Generation

```typescript
// lib/spaced-repetition/auto-generator.ts
export class AutomaticItemGenerator {
  async generateFromAIResponse(
    userId: string,
    bookId: string,
    query: string,
    response: string
  ): Promise<void> {
    // Analyze if response contains reviewable content
    const analysis = await this.analyzeContent(query, response);
    
    if (analysis.hasImportantConcepts) {
      const items = await this.createReviewItems(analysis);
      
      // Add to user's review queue
      await prisma.spacedRepetitionItem.createMany({
        data: items.map(item => ({
          userId,
          bookId,
          ...item,
          nextReviewDate: new Date(Date.now() + 24 * 60 * 60 * 1000) // Tomorrow
        }))
      });
      
      // Notify user (optional)
      await this.notifyNewReviewItems(userId, items.length);
    }
  }
}
```

## Success Criteria

1. **Retention**: 70% of reviewed concepts retained after 1 week
2. **Engagement**: 60% of users complete daily reviews
3. **Efficiency**: Average review time < 20 seconds per item
4. **Accuracy**: Algorithm correctly predicts difficulty 80% of time
5. **Coverage**: 90% of important concepts captured for review

## Testing Plan

1. **Algorithm Testing**
   - Validate SM-2 implementation with known test cases
   - Test edge cases (perfect scores, all failures)
   - Verify interval calculations

2. **Content Quality**
   - Manual review of generated items
   - User feedback on question clarity
   - A/B test different question formats

3. **Performance Testing**
   - Load test with 1000 items per user
   - Ensure queries remain fast
   - Test review session with 50 items

## Time Estimate: 1.5 Weeks

- Day 1-2: Database schema and algorithm implementation
- Day 3-4: Content generation from conversations
- Day 5-6: Review interface and components
- Day 7-8: API endpoints and integration
- Day 9-10: Testing and optimization

## Dependencies

- Conversation memory system (must be implemented first)
- AI service for content extraction
- React components for review interface

## Future Enhancements

1. **Adaptive scheduling** - Adjust review times based on user's schedule
2. **Group reviews** - Review concepts by theme or book
3. **Gamification** - Streaks, points, leaderboards
4. **Export to Anki** - Let users take their cards with them
5. **Voice reviews** - Audio questions for commute learning