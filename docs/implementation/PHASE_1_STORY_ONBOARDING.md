# Phase 1: Story-Driven Onboarding Implementation

## Overview
Replace traditional assessment with an engaging 3-minute interactive story that subtly evaluates reading level, preferences, and learning style.

## Priority: HIGH (Week 1-2)
First impression matters - this creates immediate engagement and better personalization.

## Technical Requirements

### 1. Database Schema Updates
```sql
-- New table for onboarding results
CREATE TABLE user_reading_profiles (
  id TEXT PRIMARY KEY,
  user_id TEXT UNIQUE REFERENCES users(id),
  reading_level TEXT CHECK (reading_level IN ('beginner', 'intermediate', 'advanced')),
  vocabulary_tier TEXT CHECK (vocabulary_tier IN ('casual', 'academic', 'advanced', 'literary')),
  genre_preferences JSONB, -- {fantasy: 0.8, mystery: 0.6, ...}
  attention_pattern TEXT CHECK (attention_pattern IN ('sprinter', 'marathoner', 'browser')),
  learning_style TEXT CHECK (learning_style IN ('visual', 'auditory', 'kinesthetic', 'mixed')),
  completed_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Track onboarding interactions
CREATE TABLE onboarding_interactions (
  id TEXT PRIMARY KEY,
  user_id TEXT REFERENCES users(id),
  story_segment INT,
  choice_made TEXT,
  response_time_ms INT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

### 2. Story Content Structure

```typescript
// lib/onboarding/story-content.ts
interface StorySegment {
  id: number;
  text: string;
  choices: Choice[];
  assessmentType: 'vocabulary' | 'comprehension' | 'preference' | 'style';
  imageUrl?: string; // Optional visual elements
}

interface Choice {
  id: string;
  text: string;
  reveals: {
    vocabularyLevel?: number; // 1-10
    genreAffinity?: { genre: string; score: number };
    comprehensionDepth?: number; // 1-10
    learningStyle?: string;
  };
  nextSegment: number;
}

// Example story segment
const STORY_SEGMENTS: StorySegment[] = [
  {
    id: 1,
    text: "You discover a mysterious library where books whisper secrets after midnight. As you enter, an ancient tome falls open, revealing a map. The map shows three paths:",
    choices: [
      {
        id: "a",
        text: "The path marked with cryptic symbols and arcane runes",
        reveals: { vocabularyLevel: 8, genreAffinity: { genre: "fantasy", score: 0.9 } },
        nextSegment: 2
      },
      {
        id: "b", 
        text: "The clearly marked trail with helpful signposts",
        reveals: { vocabularyLevel: 4, learningStyle: "structured" },
        nextSegment: 3
      },
      {
        id: "c",
        text: "The winding path that seems to change as you look at it",
        reveals: { genreAffinity: { genre: "mystery", score: 0.8 }, learningStyle: "exploratory" },
        nextSegment: 4
      }
    ],
    assessmentType: 'preference'
  }
  // ... more segments
];
```

### 3. Onboarding Flow Component

```typescript
// app/onboarding/page.tsx
'use client';

export default function OnboardingPage() {
  const [currentSegment, setCurrentSegment] = useState(1);
  const [interactions, setInteractions] = useState<Interaction[]>([]);
  const [startTime, setStartTime] = useState(Date.now());

  const handleChoice = async (choice: Choice) => {
    // Track interaction
    const interaction = {
      segmentId: currentSegment,
      choiceId: choice.id,
      responseTime: Date.now() - startTime,
      reveals: choice.reveals
    };
    
    setInteractions([...interactions, interaction]);
    
    // Move to next segment
    if (choice.nextSegment === -1) {
      // Story complete - analyze results
      await completeOnboarding(interactions);
    } else {
      setCurrentSegment(choice.nextSegment);
      setStartTime(Date.now());
    }
  };

  return (
    <div className="onboarding-container">
      <StorySegment 
        segment={STORY_SEGMENTS[currentSegment - 1]}
        onChoice={handleChoice}
      />
      <ProgressBar current={currentSegment} total={STORY_SEGMENTS.length} />
    </div>
  );
}
```

### 4. Profile Analysis Service

```typescript
// lib/onboarding/profile-analyzer.ts
export class ProfileAnalyzer {
  analyzeInteractions(interactions: Interaction[]): ReadingProfile {
    const profile: ReadingProfile = {
      readingLevel: this.calculateReadingLevel(interactions),
      vocabularyTier: this.assessVocabulary(interactions),
      genrePreferences: this.aggregateGenreScores(interactions),
      attentionPattern: this.detectAttentionPattern(interactions),
      learningStyle: this.identifyLearningStyle(interactions)
    };
    
    return profile;
  }
  
  private calculateReadingLevel(interactions: Interaction[]): ReadingLevel {
    // Analyze vocabulary choices and comprehension responses
    const vocabScores = interactions
      .filter(i => i.reveals.vocabularyLevel)
      .map(i => i.reveals.vocabularyLevel!);
    
    const avgVocab = vocabScores.reduce((a, b) => a + b, 0) / vocabScores.length;
    
    if (avgVocab >= 7) return 'advanced';
    if (avgVocab >= 4) return 'intermediate';
    return 'beginner';
  }
  
  private detectAttentionPattern(interactions: Interaction[]): AttentionPattern {
    // Analyze response times
    const avgResponseTime = interactions.reduce((sum, i) => sum + i.responseTime, 0) / interactions.length;
    
    if (avgResponseTime < 5000) return 'sprinter'; // Quick decisions
    if (avgResponseTime > 15000) return 'marathoner'; // Thoughtful reader
    return 'browser'; // Balanced approach
  }
}
```

### 5. Integration with Main App

```typescript
// app/api/onboarding/complete/route.ts
export async function POST(request: NextRequest) {
  const { interactions } = await request.json();
  const user = await getUser();
  
  // Analyze interactions
  const analyzer = new ProfileAnalyzer();
  const profile = analyzer.analyzeInteractions(interactions);
  
  // Store profile
  await prisma.userReadingProfile.create({
    data: {
      userId: user.id,
      ...profile,
      completedAt: new Date()
    }
  });
  
  // Store interactions for future analysis
  await prisma.onboardingInteraction.createMany({
    data: interactions.map(i => ({
      userId: user.id,
      storySegment: i.segmentId,
      choiceMade: i.choiceId,
      responseTimeMs: i.responseTime
    }))
  });
  
  // Update learning profile service
  await learningProfileService.initializeFromOnboarding(user.id, profile);
  
  return NextResponse.json({ 
    success: true, 
    profile,
    redirect: '/dashboard' 
  });
}
```

### 6. First-Time User Detection

```typescript
// middleware.ts - Add onboarding redirect
export async function middleware(request: NextRequest) {
  // ... existing auth checks ...
  
  if (user && !request.nextUrl.pathname.startsWith('/onboarding')) {
    // Check if user has completed onboarding
    const hasProfile = await checkUserProfile(user.id);
    
    if (!hasProfile) {
      return NextResponse.redirect(new URL('/onboarding', request.url));
    }
  }
}
```

## Success Criteria

1. **Engagement**: 85% completion rate (vs. traditional forms: 40%)
2. **Accuracy**: Profile predictions match actual behavior 75%+
3. **Time**: Average completion under 3 minutes
4. **Delight**: User feedback "fun" or "engaging" 80%+

## Testing Plan

1. **A/B Test Structure**
   - 50% get story onboarding
   - 50% get traditional assessment
   - Compare completion rates and accuracy

2. **Profile Accuracy Validation**
   - Track if assigned reading level matches comprehension
   - Monitor if genre preferences align with book choices
   - Adjust scoring algorithms based on data

3. **User Experience Testing**
   - Test with 10 users per reading level
   - Gather qualitative feedback
   - Iterate on story content

## Content Creation

1. **Write 10-12 story segments** (2 days)
   - Each with 3-4 meaningful choices
   - Natural flow between segments
   - Embedded assessment elements

2. **Visual Assets** (optional, 1 day)
   - Simple illustrations for each segment
   - Enhances engagement without distraction

## Time Estimate: 1.5 Weeks

- Day 1-2: Database schema and core services
- Day 3-4: Story content creation
- Day 5-6: React components and UI
- Day 7-8: Integration and profile analysis
- Day 9-10: Testing and refinement

## Dependencies

- User authentication system (✓ exists)
- Learning profile service (✓ exists)
- Database with JSONB support (✓ PostgreSQL)

## Future Enhancements

1. **Multiple story paths** - Different stories for re-assessment
2. **Seasonal themes** - Halloween mystery, summer adventure
3. **Author style matching** - "Find authors who write like this story"
4. **Social sharing** - "Share your reading personality"