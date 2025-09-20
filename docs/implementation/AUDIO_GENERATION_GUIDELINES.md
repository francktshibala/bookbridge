# Audio Generation Guidelines for Future Books
**Created**: January 20, 2025
**Purpose**: Prevent audio quality issues found in first 10 enhanced books

## 🚨 CRITICAL: Lessons Learned from First 10 Books

### **Problem #1: Repetitive Intro Phrases**
**Issue**: Every chunk starts with "Here is the simplified version for [CEFR level]..."
- Breaks immersion every ~400 words
- Users hear same phrase 20-30 times per book
- Cannot be removed without complete regeneration

**Solution for Future Books**:
```javascript
// ❌ WRONG - Current problematic approach
const prompt = `Here is the simplified version for ${cefrLevel} level: ${chunkText}`;

// ✅ CORRECT - Clean audio generation
const prompt = chunkText; // Just the text, no intro
```

### **Problem #2: Path Collisions**
**Issue**: Generic paths like `a1/chunk_0.mp3` caused books to overwrite each other
- Romeo & Juliet audio played for Pride & Prejudice
- Cost significant time and money

**Solution for Future Books**:
```javascript
// ❌ WRONG - Generic paths
const audioPath = `${cefrLevel}/chunk_${index}.mp3`;

// ✅ CORRECT - Book-specific paths
const audioPath = `${bookId}/${cefrLevel}/chunk_${index}.mp3`;
```

---

## 📋 Future Book Audio Generation Checklist

### **Pre-Generation**
- [ ] Remove ALL intro phrases from prompts
- [ ] Use book-specific CDN paths
- [ ] Validate CEFR level text before audio generation
- [ ] Test first chunk before full generation

### **Audio Prompt Template**
```javascript
// For original text
const audioPrompt = {
  text: chunkText, // Direct text, no modifications
  voice: selectedVoice,
  model: 'tts-1-hd',
  speed: 1.0
};

// For simplified text
const audioPrompt = {
  text: simplifiedText, // Just the simplified text
  voice: selectedVoice,
  model: 'tts-1-hd',
  speed: 1.0
  // NO INTRO PHRASES!
};
```

### **CDN Path Structure**
```
/audio/
  ├── {bookId}/
  │   ├── original/
  │   │   ├── chunk_0.mp3
  │   │   └── chunk_1.mp3
  │   ├── a1/
  │   │   ├── chunk_0.mp3
  │   │   └── chunk_1.mp3
  │   └── b2/
  │       ├── chunk_0.mp3
  │       └── chunk_1.mp3
```

---

## 🎯 Quality Standards for Future Books

### **Continuous Reading Optimization**
1. **No intro phrases** - Clean text only
2. **Consistent voice** - Same voice across all chunks
3. **Natural transitions** - End chunks at sentence boundaries
4. **Silence trimming** - Remove leading/trailing silence

### **Sentence-Level Audio (Future)**
When implementing sentence-level audio:
```javascript
// Group 3-5 sentences per audio file (GPT-5 recommendation)
const sentenceGroup = {
  id: `${bookId}_${chunkIndex}_sg_${groupIndex}`,
  sentences: [sentence1, sentence2, sentence3],
  audioUrl: `${bookId}/sentence_groups/sg_${groupIndex}.mp3`,
  wordTimings: [...] // Individual timings per word
};
```

### **Testing Requirements**
Before marking any book as "enhanced":
1. Listen to first and last chunk of each CEFR level
2. Verify no intro phrases
3. Check smooth transitions between chunks
4. Validate word timing accuracy

---

## 🔧 Implementation Code

### **Clean Audio Generation Function**
```javascript
async function generateCleanAudio(bookId: string, chunkIndex: number, text: string, cefrLevel: string) {
  // NO INTRO PHRASES
  const cleanText = text.trim();

  // Book-specific path
  const audioPath = `${bookId}/${cefrLevel}/chunk_${chunkIndex}.mp3`;

  // Generate audio
  const audio = await openai.audio.speech.create({
    model: 'tts-1-hd',
    voice: 'alloy', // or user selection
    input: cleanText, // CLEAN TEXT ONLY
    speed: 1.0
  });

  // Upload to CDN with book-specific path
  await uploadToCDN(audioPath, audio);

  return audioPath;
}
```

---

## 📊 First 10 Books Status

**Books with Intro Phrase Issue**:
1. Pride and Prejudice - All CEFR levels affected
2. Emma - All CEFR levels affected
3. Frankenstein - All CEFR levels affected
4. Romeo and Juliet - All CEFR levels affected
5. Adventures of Sherlock Holmes - All CEFR levels affected
6. Alice's Adventures - All CEFR levels affected
7. Christmas Carol - All CEFR levels affected
8. Dr. Jekyll and Mr. Hyde - All CEFR levels affected
9. Great Gatsby - All CEFR levels affected
10. Dracula - All CEFR levels affected

**Decision**: Keep as-is for MVP, fix in all future books

---

## 🚀 Future Book Standards

All books generated after January 2025 MUST:
1. ✅ Have clean audio without intro phrases
2. ✅ Use book-specific CDN paths
3. ✅ Support continuous reading from day one
4. ✅ Include sentence-level timing data
5. ✅ Pass quality checklist before release

**Remember**: Users will compare new books to old ones. New books should be noticeably better to justify the continuous reading upgrade.