# Phase 1: Smart Hover Definitions Implementation

## Overview
Implement frictionless vocabulary support with instant definitions on hover/tap without disrupting reading flow.

## Priority: HIGH (Week 1)
Quick win that immediately improves user experience with minimal complexity.

## Technical Requirements

### 1. Database Schema Updates
```sql
-- Cache for word definitions
CREATE TABLE word_definitions (
  word TEXT PRIMARY KEY,
  definition TEXT NOT NULL,
  difficulty_level INT CHECK (difficulty_level BETWEEN 1 AND 10),
  synonyms TEXT[],
  usage_example TEXT,
  language TEXT DEFAULT 'en',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  last_accessed TIMESTAMP
);

-- Track which words users look up
CREATE TABLE user_word_lookups (
  id TEXT PRIMARY KEY,
  user_id TEXT REFERENCES users(id),
  word TEXT,
  book_id TEXT,
  context TEXT, -- sentence containing the word
  looked_up_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

### 2. Dictionary Service

```typescript
// lib/dictionary/dictionary-service.ts
export class DictionaryService {
  private cache = new Map<string, Definition>();
  
  async getDefinition(word: string): Promise<Definition | null> {
    // Check memory cache
    if (this.cache.has(word)) {
      return this.cache.get(word)!;
    }
    
    // Check database cache
    const cached = await prisma.wordDefinition.findUnique({
      where: { word: word.toLowerCase() }
    });
    
    if (cached) {
      await this.updateLastAccessed(word);
      return cached;
    }
    
    // Fetch from API
    const definition = await this.fetchFromAPI(word);
    if (definition) {
      await this.cacheDefinition(definition);
      this.cache.set(word, definition);
    }
    
    return definition;
  }
  
  private async fetchFromAPI(word: string): Promise<Definition | null> {
    try {
      // Option 1: Free Dictionary API
      const response = await fetch(`https://api.dictionaryapi.dev/api/v2/entries/en/${word}`);
      if (!response.ok) return null;
      
      const data = await response.json();
      const entry = data[0];
      
      return {
        word: entry.word,
        definition: entry.meanings[0].definitions[0].definition,
        synonyms: entry.meanings[0].synonyms || [],
        usageExample: entry.meanings[0].definitions[0].example || '',
        difficultyLevel: this.assessDifficulty(word)
      };
    } catch (error) {
      console.error('Dictionary API error:', error);
      return null;
    }
  }
  
  private assessDifficulty(word: string): number {
    // Simple heuristic: longer words and less common patterns = higher difficulty
    const length = word.length;
    const hasUncommonPatterns = /qu|ph|ght|tch/.test(word);
    const syllables = word.replace(/[^aeiou]/gi, '').length;
    
    let difficulty = Math.min(Math.floor(length / 2), 5);
    if (hasUncommonPatterns) difficulty += 2;
    if (syllables > 3) difficulty += 1;
    
    return Math.min(difficulty, 10);
  }
}
```

### 3. React Component for Hover Definitions

```typescript
// components/SmartText.tsx
'use client';

import { useState, useCallback, useRef } from 'react';
import { useDebounce } from '@/hooks/useDebounce';

interface SmartTextProps {
  content: string;
  bookId?: string;
  className?: string;
}

export function SmartText({ content, bookId, className }: SmartTextProps) {
  const [hoveredWord, setHoveredWord] = useState<string | null>(null);
  const [definition, setDefinition] = useState<Definition | null>(null);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const timeoutRef = useRef<NodeJS.Timeout>();

  const handleWordHover = useCallback(async (word: string, event: React.MouseEvent) => {
    // Clear any existing timeout
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    
    const rect = (event.target as HTMLElement).getBoundingClientRect();
    setPosition({ 
      x: rect.left + rect.width / 2, 
      y: rect.top - 10 
    });
    
    setHoveredWord(word);
    
    // Fetch definition after 300ms delay
    timeoutRef.current = setTimeout(async () => {
      const def = await fetch(`/api/dictionary/${word}`).then(r => r.json());
      if (def) {
        setDefinition(def);
        
        // Track lookup
        await fetch('/api/dictionary/track', {
          method: 'POST',
          body: JSON.stringify({ word, bookId, context: getSentenceContext(word, content) })
        });
      }
    }, 300);
  }, [bookId, content]);

  const handleWordLeave = useCallback(() => {
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    setHoveredWord(null);
    setDefinition(null);
  }, []);

  // Process content to make words hoverable
  const processedContent = useMemo(() => {
    // Split into words while preserving punctuation
    const words = content.split(/(\s+|[.,!?;:])/);
    
    return words.map((word, index) => {
      const cleanWord = word.replace(/[.,!?;:]/g, '');
      const isWord = /^[a-zA-Z]+$/.test(cleanWord);
      
      if (!isWord || cleanWord.length < 4) {
        return <span key={index}>{word}</span>;
      }
      
      // Assess word difficulty
      const difficulty = assessWordDifficulty(cleanWord);
      
      return (
        <span
          key={index}
          className={`smart-word difficulty-${difficulty}`}
          onMouseEnter={(e) => handleWordHover(cleanWord, e)}
          onMouseLeave={handleWordLeave}
          style={{ 
            borderBottom: difficulty > 5 ? '1px dotted #888' : 'none',
            cursor: 'help'
          }}
        >
          {word}
        </span>
      );
    });
  }, [content, handleWordHover, handleWordLeave]);

  return (
    <>
      <div className={className}>
        {processedContent}
      </div>
      
      {hoveredWord && definition && (
        <DefinitionTooltip
          word={hoveredWord}
          definition={definition}
          position={position}
          onClose={() => setDefinition(null)}
        />
      )}
    </>
  );
}

// Tooltip component
function DefinitionTooltip({ word, definition, position, onClose }: TooltipProps) {
  return (
    <div
      className="definition-tooltip"
      style={{
        position: 'fixed',
        left: position.x,
        top: position.y,
        transform: 'translate(-50%, -100%)',
        zIndex: 1000
      }}
    >
      <div className="tooltip-content">
        <h4>{word}</h4>
        <p>{definition.definition}</p>
        {definition.usageExample && (
          <p className="example">"{definition.usageExample}"</p>
        )}
        {definition.synonyms.length > 0 && (
          <p className="synonyms">Similar: {definition.synonyms.slice(0, 3).join(', ')}</p>
        )}
      </div>
      <button className="add-to-vocab" onClick={() => addToVocabularyList(word)}>
        + Save word
      </button>
    </div>
  );
}
```

### 4. API Routes

```typescript
// app/api/dictionary/[word]/route.ts
export async function GET(
  request: NextRequest,
  { params }: { params: { word: string } }
) {
  const { word } = params;
  
  const definition = await dictionaryService.getDefinition(word);
  
  if (!definition) {
    return NextResponse.json({ error: 'Word not found' }, { status: 404 });
  }
  
  return NextResponse.json(definition);
}

// app/api/dictionary/track/route.ts
export async function POST(request: NextRequest) {
  const { word, bookId, context } = await request.json();
  const user = await getUser();
  
  await prisma.userWordLookup.create({
    data: {
      userId: user.id,
      word,
      bookId,
      context
    }
  });
  
  // Update user's vocabulary profile
  await learningProfileService.trackVocabularyLookup(user.id, word);
  
  return NextResponse.json({ success: true });
}
```

### 5. Mobile Touch Support

```typescript
// hooks/useSmartTouch.ts
export function useSmartTouch() {
  const [selectedWord, setSelectedWord] = useState<string | null>(null);
  const longPressTimer = useRef<NodeJS.Timeout>();

  const handleTouchStart = (word: string) => {
    longPressTimer.current = setTimeout(() => {
      setSelectedWord(word);
      // Haptic feedback on mobile
      if ('vibrate' in navigator) {
        navigator.vibrate(10);
      }
    }, 500); // 500ms long press
  };

  const handleTouchEnd = () => {
    if (longPressTimer.current) {
      clearTimeout(longPressTimer.current);
    }
  };

  return { selectedWord, handleTouchStart, handleTouchEnd };
}
```

### 6. CSS Styling

```css
/* styles/smart-text.css */
.smart-word {
  transition: background-color 0.2s ease;
}

.smart-word:hover {
  background-color: rgba(0, 123, 255, 0.1);
  border-radius: 2px;
}

.difficulty-6, .difficulty-7, .difficulty-8, .difficulty-9, .difficulty-10 {
  border-bottom: 1px dotted #888;
}

.definition-tooltip {
  background: white;
  border: 1px solid #ddd;
  border-radius: 8px;
  padding: 12px;
  box-shadow: 0 4px 12px rgba(0,0,0,0.15);
  max-width: 300px;
  animation: fadeIn 0.2s ease;
}

@keyframes fadeIn {
  from { opacity: 0; transform: translate(-50%, -90%); }
  to { opacity: 1; transform: translate(-50%, -100%); }
}

.tooltip-content h4 {
  margin: 0 0 8px 0;
  font-size: 16px;
  font-weight: 600;
}

.example {
  font-style: italic;
  color: #666;
  margin: 8px 0;
}

.synonyms {
  font-size: 14px;
  color: #888;
}

.add-to-vocab {
  background: #007bff;
  color: white;
  border: none;
  padding: 4px 12px;
  border-radius: 4px;
  font-size: 12px;
  cursor: pointer;
  margin-top: 8px;
}
```

## Success Criteria

1. **Performance**: Definitions load in <200ms
2. **Accuracy**: 95% of common words have definitions
3. **Engagement**: 40% of users use hover definitions
4. **Learning**: Users who use definitions show 25% better comprehension
5. **Mobile**: Touch interaction works smoothly on all devices

## Testing Plan

1. **Performance Testing**
   - Test with 1000 word lookups
   - Ensure caching works properly
   - Monitor API rate limits

2. **User Testing**
   - Test hover delay timing (300ms optimal?)
   - Ensure tooltips don't block content
   - Verify mobile long-press works

3. **Accessibility**
   - Keyboard navigation support
   - Screen reader compatibility
   - High contrast mode

## Time Estimate: 1 Week

- Day 1: Dictionary service and API integration
- Day 2: Database schema and caching layer
- Day 3-4: React components and hover logic
- Day 5: Mobile touch support
- Day 6: CSS and animations
- Day 7: Testing and optimization

## Dependencies

- Dictionary API (free tier sufficient)
- PostgreSQL for caching
- React with TypeScript

## Future Enhancements

1. **Multilingual support** - Definitions in user's native language
2. **Vocabulary builder** - Save words to personal study list
3. **Difficulty highlighting** - Color-code text by reading level
4. **Audio pronunciation** - Click to hear word spoken
5. **Etymology** - Show word origins for deeper understanding