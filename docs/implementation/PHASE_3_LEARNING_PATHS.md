# Phase 3: Learning Paths Implementation

## Feature: Personalized Book Sequences & Reading Journeys

### Overview
Create intelligent reading paths that adapt to user interests, skill levels, and learning goals, building knowledge progressively across multiple books.

### Technical Requirements

#### 1. Path Generation System
```typescript
interface LearningPath {
  id: string;
  name: string;
  description: string;
  goal: 'skill' | 'topic' | 'genre' | 'author' | 'custom';
  books: PathBook[];
  estimatedDuration: number; // weeks
  difficulty: 'beginner' | 'intermediate' | 'advanced';
  prerequisites?: string[];
}

interface PathBook {
  bookId: string;
  order: number;
  reason: string; // Why this book fits here
  focusAreas: string[]; // What to pay attention to
  connections: string[]; // Links to previous books
  optionalSupplement?: boolean;
}

interface UserPath {
  userId: string;
  pathId: string;
  progress: number; // 0-100
  currentBook: number;
  adaptations: PathAdaptation[];
  completedBooks: string[];
}
```

#### 2. Path Types

**Skill Development Paths**:
- "Critical Thinking Through Mystery": Sherlock → Agatha Christie → Modern thrillers
- "Business Acumen": Biographies → Case studies → Strategy books
- "Emotional Intelligence": Fiction → Psychology → Self-improvement

**Topic Exploration Paths**:
- "Understanding AI": Sci-fi classics → Tech history → Current AI books
- "Climate Change": Fiction → Science → Solutions
- "Historical Periods": Fiction set in era → Non-fiction → Primary sources

**Genre Mastery Paths**:
- "Fantasy Progression": YA fantasy → Epic fantasy → Grimdark
- "Mystery Evolution": Cozy → Classic → Noir → Psychological

#### 3. Adaptive Algorithm
```typescript
class PathAdaptationEngine {
  suggestNextBook(
    currentProgress: UserPath,
    readingHistory: Book[],
    userPreferences: Preferences
  ): PathBook {
    // Consider: reading speed, comprehension, interests
  }
  
  adjustPath(
    originalPath: LearningPath,
    userFeedback: Feedback[],
    performance: ReadingMetrics
  ): LearningPath {
    // Add/remove/reorder books based on user needs
  }
  
  createCustomPath(
    goal: string,
    startingPoint: Book,
    constraints: PathConstraints
  ): LearningPath {
    // AI-generated personalized path
  }
}
```

### Implementation Steps

#### Step 1: Path Creation Service
```typescript
// lib/services/learningPathService.ts
export class LearningPathService {
  generatePath(params: PathParameters): LearningPath {
    // Use AI to create coherent learning journey
  }
  
  evaluateProgress(
    userId: string,
    pathId: string
  ): ProgressReport {
    // Track comprehension and engagement
  }
  
  recommendPaths(
    user: User,
    goals?: string[]
  ): LearningPath[] {
    // Personalized path suggestions
  }
}
```

#### Step 2: Path Visualization
```typescript
// components/PathVisualizer.tsx
const PathVisualizer = ({ path, progress }: Props) => {
  return (
    <div className="path-visualizer">
      {/* Interactive journey map */}
      {/* Show connections between books */}
      {/* Highlight current position */}
      {/* Preview upcoming books */}
    </div>
  );
};
```

#### Step 3: AI Path Prompts
```typescript
const pathPrompts = {
  generatePath: `Create a learning path for: ${goal}
                 Starting level: ${level}
                 Timeframe: ${duration}
                 Include 5-8 books with clear progression`,
  
  explainConnection: `Explain how ${book1} prepares 
                      the reader for ${book2}`,
  
  adaptPath: `User struggling with ${currentBook}.
              Suggest easier alternative or 
              supplementary material`
};
```

### Database Schema
```sql
-- Learning paths
CREATE TABLE learning_paths (
  id SERIAL PRIMARY KEY,
  name VARCHAR(255),
  description TEXT,
  goal_type VARCHAR(50),
  difficulty VARCHAR(50),
  estimated_weeks INTEGER,
  created_by INTEGER REFERENCES users(id),
  is_public BOOLEAN DEFAULT false,
  metadata JSONB
);

-- Path books
CREATE TABLE path_books (
  id SERIAL PRIMARY KEY,
  path_id INTEGER REFERENCES learning_paths(id),
  book_id INTEGER REFERENCES books(id),
  order_index INTEGER,
  reason TEXT,
  focus_areas TEXT[],
  is_optional BOOLEAN DEFAULT false
);

-- User path progress
CREATE TABLE user_paths (
  id SERIAL PRIMARY KEY,
  user_id INTEGER REFERENCES users(id),
  path_id INTEGER REFERENCES learning_paths(id),
  started_at TIMESTAMP DEFAULT NOW(),
  current_book_index INTEGER DEFAULT 0,
  progress_percentage INTEGER DEFAULT 0,
  adaptations JSONB DEFAULT '[]',
  completed_books TEXT[]
);

-- Path ratings and reviews
CREATE TABLE path_reviews (
  user_id INTEGER REFERENCES users(id),
  path_id INTEGER REFERENCES learning_paths(id),
  rating INTEGER CHECK (rating BETWEEN 1 AND 5),
  review TEXT,
  helped_achieve_goal BOOLEAN,
  PRIMARY KEY (user_id, path_id)
);
```

### Community Features
- Share custom paths
- Path recommendations from similar users
- Collaborative path creation
- Reading buddy matching for same path

### Testing Strategy
1. Path coherence validation
2. User goal achievement tracking
3. A/B test different path lengths
4. Measure completion rates vs solo reading

### Success Metrics
- Path completion rate > 60%
- User-reported goal achievement
- Books per user increase 40%
- Cross-book knowledge retention

### Rollout Plan
1. Create 10 expert-curated paths
2. Beta test with power users
3. Enable custom path creation
4. AI path generation for all
5. Community path marketplace