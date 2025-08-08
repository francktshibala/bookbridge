# Phase 3: Emotional Tracking Implementation

## Feature: Reading Journey Emotional Intelligence

### Overview
Track and respond to users' emotional journey through books, providing support, encouragement, and deeper connection to the material.

### Technical Requirements

#### 1. Emotion Detection System
```typescript
interface EmotionalState {
  primaryEmotion: 'excited' | 'curious' | 'frustrated' | 'sad' | 'inspired' | 'confused';
  intensity: number; // 0-1 scale
  bookContext: {
    chapter: string;
    topic: string;
    characterInvolved?: string;
  };
  triggers: string[];
}

interface ReadingMood {
  sessionMood: EmotionalState;
  bookMood: EmotionalState[]; // Historical
  preferredSupport: 'encourage' | 'explore' | 'validate' | 'distract';
}
```

#### 2. Emotion Indicators
- **Reading pace**: Slower might indicate struggle or deep thought
- **Question types**: Confusion vs curiosity
- **Interaction patterns**: Frequent pauses, rereading
- **Explicit feedback**: Emoji reactions, mood selection
- **Language analysis**: Sentiment in user messages

#### 3. Adaptive Responses

**For Frustration**:
- "This is a challenging part. Let's break it down together."
- Offer simpler explanations
- Suggest taking a break
- Provide encouragement about progress

**For Excitement**:
- "Your enthusiasm is wonderful! What excites you most?"
- Deeper exploration options
- Related content suggestions
- Community sharing prompts

**For Sadness (from content)**:
- "This scene affects many readers deeply."
- Validation of emotions
- Discussion of themes
- Positive reframing options

### Implementation Steps

#### Step 1: Emotion Detection Service
```typescript
// lib/services/emotionService.ts
export class EmotionTrackingService {
  detectEmotion(
    userInteractions: Interaction[],
    readingPatterns: ReadingPattern,
    explicitSignals?: UserMoodSignal
  ): EmotionalState {
    // Multi-signal emotion detection
  }
  
  generateEmpatheticResponse(
    emotion: EmotionalState,
    bookContext: BookContext
  ): string {
    // Context-aware emotional support
  }
  
  trackEmotionalJourney(
    userId: string,
    bookId: string
  ): EmotionalJourney {
    // Long-term emotional patterns
  }
}
```

#### Step 2: UI Mood Indicators
```typescript
// components/MoodTracker.tsx
const MoodTracker = () => {
  return (
    <div className="mood-tracker">
      <button onClick={() => setMood('excited')}>😊</button>
      <button onClick={() => setMood('confused')}>🤔</button>
      <button onClick={() => setMood('inspired')}>✨</button>
      {/* Subtle, non-intrusive design */}
    </div>
  );
};
```

#### Step 3: AI Emotional Intelligence
```typescript
const emotionalPrompts = {
  frustrated: `User seems frustrated. Provide supportive, 
               clarifying response about: ${topic}`,
  excited: `User is engaged and excited. Deepen their 
            exploration of: ${topic}`,
  sad: `User affected by emotional content. Acknowledge 
        feelings while discussing: ${theme}`
};
```

### Database Schema
```sql
-- Emotional journey tracking
CREATE TABLE emotional_states (
  id SERIAL PRIMARY KEY,
  user_id INTEGER REFERENCES users(id),
  book_id INTEGER REFERENCES books(id),
  chapter_id INTEGER,
  emotion VARCHAR(50),
  intensity DECIMAL(3,2),
  triggers TEXT[],
  created_at TIMESTAMP DEFAULT NOW()
);

-- Reading session moods
CREATE TABLE session_moods (
  id SERIAL PRIMARY KEY,
  session_id UUID,
  user_id INTEGER REFERENCES users(id),
  start_mood VARCHAR(50),
  end_mood VARCHAR(50),
  mood_transitions JSONB,
  support_effectiveness INTEGER CHECK (support_effectiveness BETWEEN 1 AND 5)
);

-- Emotional preferences
ALTER TABLE user_preferences ADD COLUMN
  emotional_support_style VARCHAR(50) DEFAULT 'balanced';
```

### Privacy & Ethics
- Emotion data is highly sensitive
- Opt-in only with clear explanations
- Local processing when possible
- No emotion data in analytics
- User can delete emotion history

### Testing Strategy
1. Emotion detection accuracy testing
2. User comfort level surveys
3. A/B test support responses
4. Long-term mood improvement tracking

### Success Metrics
- User-reported connection to books ↑30%
- Reading completion rates ↑20%
- Positive mood transitions 70%+
- User trust/comfort ratings

### Rollout Plan
1. Opt-in beta for trusted users
2. Start with basic mood selection
3. Gradually add detection features
4. Continuous privacy reviews
5. Expand based on user consent