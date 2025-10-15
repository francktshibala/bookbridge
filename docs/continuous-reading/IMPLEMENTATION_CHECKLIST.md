# Plan 1 Continuous Reading - Implementation Checklist for New Books

## 📁 Required Files (Reference These First)

### 1. **Master Plan Documentation**
- **`docs/implementation/16-WEEK-CONTINUOUS-READING-PLAN.md`** - The big Plan 1 strategy
- **`docs/continuous-reading/LESSONS_LEARNED.md`** - Complete implementation guide with critical patterns
- **`docs/continuous-reading/ARCHITECTURE_OVERVIEW.md`** - Technical architecture deep-dive

### 2. **Working Implementation (Copy These Patterns)**
- **`components/reading/TestBookContinuousReader.tsx`** - Main component pattern
- **`scripts/generate-test-book-continuous.js`** - Audio generation pipeline
- **`lib/audio/GaplessAudioManager.ts`** - Enhanced audio manager
- **`components/reading/VirtualizedReader.tsx`** - Auto-scroll & highlighting

### 3. **API & Database Patterns**
- **`app/api/test-book/sentences/route.ts`** - Sentence data API
- **Database schema:** Use `targetLevel` field (not `cefrLevel`)

### 4. **Test Validation**
- **`app/test-continuous-reading/page.tsx`** - Working test interface
- **Test URL:** `/test-continuous-reading` - Validate implementation works

## ✅ Implementation Checklist for New Agent

### Phase 1: Setup & Understanding
- [ ] **Read Plan 1 strategy** in `16-WEEK-CONTINUOUS-READING-PLAN.md`
- [ ] **Study lessons learned** in `LESSONS_LEARNED.md` (critical patterns!)
- [ ] **Review architecture** in `ARCHITECTURE_OVERVIEW.md`
- [ ] **Test working example** at `/test-continuous-reading`

### Phase 2: Book-Specific Implementation
- [ ] **Create book content entry** in `book_content` table
- [ ] **Generate text simplifications** (A2, B1 levels using Claude)
- [ ] **Generate sentence-level audio** using OpenAI TTS-1-HD
  - [ ] Use book-specific paths: `{bookId}/{cefrLevel}/sentence_{index}.mp3`
  - [ ] Clean text only (no intro phrases)
  - [ ] Store in `audio_assets` with `targetLevel` field
- [ ] **Create API endpoint** following `/api/test-book/sentences/route.ts` pattern
- [ ] **Implement reader component** using `TestBookContinuousReader.tsx` pattern

### Phase 3: Critical Implementation Patterns
- [ ] **State management:** Use `isPlayingRef` pattern (prevents closure issues)
```javascript
const isPlayingRef = useRef<boolean>(false);
// Update both state and ref together
setIsPlaying(true);
isPlayingRef.current = true;
```

- [ ] **Audio progression:** Use proper completion handlers
```javascript
onComplete: () => {
  if (nextSentence && isPlayingRef.current) {
    setTimeout(() => handleSentencePlay(nextSentence.id), 100);
  }
}
```

- [ ] **Auto-scroll:** Element-based scrolling with data attributes
```javascript
const element = document.querySelector(`[data-sentence-id="${currentSentenceId}"]`);
element.scrollIntoView({ behavior: 'smooth', block: 'center' });
```

- [ ] **Global word indexing:** Calculate across all sentences
```javascript
let globalIndex = 0;
for (let i = 0; i < currentSentenceIndex; i++) {
  globalIndex += sentences[i].text.split(' ').length;
}
```

- [ ] **Mobile optimization:** Use mobile-first responsive design
```javascript
const isMobile = useIsMobile();
// Touch-friendly controls, reduced memory usage
```

### Phase 4: Testing & Validation
- [ ] **Test audio progression:** All sentences play continuously
- [ ] **Test auto-scroll:** Text follows audio
- [ ] **Test highlighting:** Strong visual feedback
- [ ] **Test mobile experience:** Responsive design works
- [ ] **Test play/pause:** Instant response
- [ ] **Performance check:** Within 100MB mobile memory limit

### Phase 5: Production Deployment
- [ ] **Feature flag integration:** Use development overrides
- [ ] **CDN path verification:** Book-specific paths working
- [ ] **Database consistency:** All tables properly populated
- [ ] **API performance:** Fast sentence loading
- [ ] **User testing:** Speechify-like experience confirmed

## 🚨 Critical Implementation Notes

### ❌ Common Mistakes to Avoid
1. **Using chunk-based audio** - Must be sentence-level
2. **State closure issues** - Always use `isPlayingRef` pattern
3. **Wrong database field** - Use `targetLevel` not `cefrLevel`
4. **Paragraph-only auto-scroll** - Must use element-based scrolling
5. **Weak highlighting** - Need strong visual feedback
6. **Desktop-first design** - Must be mobile-first (70% users)

### ✅ Success Indicators
- Audio plays continuously without gaps (1→2→3...→end)
- Text auto-scrolls following audio
- Strong sentence highlighting visible
- Word highlighting animates smoothly
- Mobile experience perfect
- Play/pause responds instantly

## 🔄 Workflow for Each New Book

### Step 1: Content Preparation
```bash
# 1. Add book to database
# 2. Generate CEFR simplifications
# 3. Split into sentences
# 4. Generate individual audio files
```

### Step 2: Component Implementation
```javascript
// 1. Copy TestBookContinuousReader pattern
// 2. Replace test-specific logic with book data
// 3. Implement API endpoint for sentence data
// 4. Add to book reading interface
```

### Step 3: Validation
```javascript
// 1. Test continuous audio progression
// 2. Verify auto-scroll functionality
// 3. Check highlighting visibility
// 4. Validate mobile experience
```

## 📊 Progress Tracking Template

For each new book implementation, track:

```markdown
## Book: [Book Title] - Plan 1 Implementation

### Content Generation
- [ ] Book content in database
- [ ] A2 simplification generated
- [ ] B1 simplification generated
- [ ] Audio files generated (X sentences)
- [ ] CDN paths configured

### Component Implementation
- [ ] Reader component created
- [ ] API endpoint implemented
- [ ] Auto-scroll working
- [ ] Highlighting implemented
- [ ] Mobile optimized

### Validation Complete
- [ ] Continuous audio progression ✅
- [ ] Auto-scroll following audio ✅
- [ ] Strong visual highlighting ✅
- [ ] Mobile experience perfect ✅
- [ ] Performance within limits ✅

**Status:** [Ready for Production / In Progress / Testing]
```

## 🎯 Expected Outcome

After following this checklist, each new book should deliver:
- **Perfect Speechify/Audible experience**
- **Mobile-first responsive design**
- **Continuous audio without interruptions**
- **Strong visual feedback and auto-scroll**
- **Performance within mobile memory limits**

---

**Reference Implementation:** Test at `/test-continuous-reading` for validation of expected behavior.