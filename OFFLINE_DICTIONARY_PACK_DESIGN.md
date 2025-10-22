# Comprehensive Offline Dictionary Pack Design for BookBridge ESL App

## Executive Summary

This document provides detailed technical specifications for implementing a mobile-first offline dictionary pack for the BookBridge ESL audiobook platform. The design focuses on 2,000-3,000 essential words optimized for English language learners, with emphasis on mobile performance, offline capability, and ESL-appropriate definitions.

## 1. WORD SELECTION STRATEGY

### 1.1 Primary Data Sources Analysis

Based on the comprehensive research findings, we leverage multiple authoritative sources:

**Foundation Source: Simple English Wiktionary (51,765 entries)**
- ✅ ESL-optimized definitions designed for learners
- ✅ Creative Commons licensed (commercial use allowed)
- ✅ Monthly data dumps available
- ✅ Simplified language appropriate for A1-C2 levels

**Enhancement Source: ECDICT (760,000 entries)**
- ✅ British National Corpus (BNC) frequency rankings
- ✅ Oxford 3000 core vocabulary identification
- ✅ CEFR level annotations
- ✅ MIT licensed for unlimited commercial use

**Pronunciation Source: IPA Dictionary Project**
- ✅ Comprehensive phonetic data for US/UK variants
- ✅ MIT licensed
- ✅ Multiple word forms supported

### 1.2 Word Selection Criteria

**Target Vocabulary: 2,500 Essential Words**

**Priority Ranking Algorithm:**
1. **Oxford 3000 Core Words** (Weight: 40%)
   - Academically validated essential vocabulary
   - CEFR level mapped (A1-C2)
   - Pedagogically proven for ESL learners

2. **BNC Frequency Ranking** (Weight: 30%)
   - Top 2000 most frequent words in British English
   - Real-world usage validation
   - Cross-reference with American English patterns

3. **ESL Pedagogical Value** (Weight: 20%)
   - Function words (articles, prepositions, conjunctions)
   - Basic verbs with multiple meanings (get, make, take, go)
   - Essential adjectives and adverbs
   - Common nouns across semantic domains

4. **BookBridge Corpus Analysis** (Weight: 10%)
   - Words appearing in classic literature
   - Historical and cultural vocabulary
   - Context-specific terminology

### 1.3 CEFR Level Distribution

```
A1 Level: 500 words (20%) - Basic survival vocabulary
A2 Level: 600 words (24%) - Elementary expansion
B1 Level: 600 words (24%) - Intermediate core
B2 Level: 500 words (20%) - Upper-intermediate
C1 Level: 200 words (8%)  - Advanced academic
C2 Level: 100 words (4%)  - Proficiency level
```

## 2. DATABASE SCHEMA DESIGN

### 2.1 Optimized Mobile Schema

**Primary Storage: SQLite Database**
- Rationale: Excellent mobile performance, built-in compression, atomic transactions
- Target Size: <3MB compressed, <8MB uncompressed
- Indexing: Optimized for prefix and exact word lookup

### 2.2 Core Table Structure

```sql
-- Core dictionary entries table
CREATE TABLE dictionary_entries (
    id INTEGER PRIMARY KEY,
    word TEXT NOT NULL UNIQUE,
    lemma TEXT NOT NULL,
    part_of_speech TEXT NOT NULL,
    definition TEXT NOT NULL,
    simple_definition TEXT, -- Extra simplified for A1-A2
    example_sentence TEXT,
    cefr_level TEXT NOT NULL CHECK (cefr_level IN ('A1','A2','B1','B2','C1','C2')),
    frequency_rank INTEGER,
    oxford_3000 BOOLEAN DEFAULT FALSE,
    pronunciation_ipa TEXT,
    pronunciation_us TEXT,
    pronunciation_uk TEXT,
    syllable_count INTEGER,
    word_family TEXT, -- Base word family (run, running, ran)
    difficulty_score REAL, -- Calculated ESL difficulty (1.0-5.0)
    audio_file_path TEXT, -- Relative path to pronunciation audio
    created_at INTEGER DEFAULT (strftime('%s', 'now')),

    -- Computed fields for search optimization
    word_length INTEGER GENERATED ALWAYS AS (length(word)) VIRTUAL,
    search_tokens TEXT -- Space-separated searchable variations
);

-- Word variations and inflections
CREATE TABLE word_forms (
    id INTEGER PRIMARY KEY,
    base_word_id INTEGER NOT NULL,
    form_type TEXT NOT NULL, -- 'plural', 'past', 'present', 'gerund', 'comparative'
    inflected_form TEXT NOT NULL,
    FOREIGN KEY (base_word_id) REFERENCES dictionary_entries(id) ON DELETE CASCADE
);

-- Example sentences and usage patterns
CREATE TABLE usage_examples (
    id INTEGER PRIMARY KEY,
    word_id INTEGER NOT NULL,
    example_text TEXT NOT NULL,
    difficulty_level TEXT NOT NULL,
    context_type TEXT, -- 'conversation', 'academic', 'literary', 'business'
    audio_file_path TEXT,
    FOREIGN KEY (word_id) REFERENCES dictionary_entries(id) ON DELETE CASCADE
);

-- Semantic relationships and word networks
CREATE TABLE word_relationships (
    id INTEGER PRIMARY KEY,
    word_id INTEGER NOT NULL,
    related_word_id INTEGER NOT NULL,
    relationship_type TEXT NOT NULL, -- 'synonym', 'antonym', 'collocation', 'word_family'
    strength REAL DEFAULT 1.0, -- Relationship strength (0.0-1.0)
    FOREIGN KEY (word_id) REFERENCES dictionary_entries(id) ON DELETE CASCADE,
    FOREIGN KEY (related_word_id) REFERENCES dictionary_entries(id) ON DELETE CASCADE
);

-- Frequency and usage statistics
CREATE TABLE word_statistics (
    word_id INTEGER PRIMARY KEY,
    bnc_frequency INTEGER, -- British National Corpus ranking
    coca_frequency INTEGER, -- Corpus of Contemporary American English
    google_ngram_frequency REAL,
    academic_frequency INTEGER, -- Academic Word List ranking
    speaking_frequency INTEGER, -- Spoken English frequency
    writing_frequency INTEGER, -- Written English frequency
    FOREIGN KEY (word_id) REFERENCES dictionary_entries(id) ON DELETE CASCADE
);

-- Performance optimization indexes
CREATE INDEX idx_word_lookup ON dictionary_entries(word);
CREATE INDEX idx_word_prefix ON dictionary_entries(word COLLATE NOCASE);
CREATE INDEX idx_cefr_level ON dictionary_entries(cefr_level);
CREATE INDEX idx_frequency ON dictionary_entries(frequency_rank);
CREATE INDEX idx_oxford_3000 ON dictionary_entries(oxford_3000) WHERE oxford_3000 = TRUE;
CREATE INDEX idx_difficulty ON dictionary_entries(difficulty_score);
CREATE INDEX idx_word_family ON dictionary_entries(word_family);

-- Full-text search support
CREATE VIRTUAL TABLE dictionary_fts USING fts5(
    word, lemma, definition, simple_definition, example_sentence,
    content='dictionary_entries',
    content_rowid='id'
);

-- FTS triggers for automatic index updates
CREATE TRIGGER dictionary_fts_insert AFTER INSERT ON dictionary_entries BEGIN
    INSERT INTO dictionary_fts(rowid, word, lemma, definition, simple_definition, example_sentence)
    VALUES (new.id, new.word, new.lemma, new.definition, new.simple_definition, new.example_sentence);
END;

CREATE TRIGGER dictionary_fts_delete AFTER DELETE ON dictionary_entries BEGIN
    DELETE FROM dictionary_fts WHERE rowid = old.id;
END;

CREATE TRIGGER dictionary_fts_update AFTER UPDATE ON dictionary_entries BEGIN
    DELETE FROM dictionary_fts WHERE rowid = old.id;
    INSERT INTO dictionary_fts(rowid, word, lemma, definition, simple_definition, example_sentence)
    VALUES (new.id, new.word, new.lemma, new.definition, new.simple_definition, new.example_sentence);
END;
```

### 2.3 Storage Size Calculations

**Per Entry Storage Estimate:**
```
Base word data: ~200 bytes
Definition text: ~150 bytes
Example sentence: ~100 bytes
Metadata fields: ~50 bytes
Index overhead: ~30 bytes
Total per entry: ~530 bytes
```

**Total Database Size:**
```
2,500 entries × 530 bytes = 1.325 MB
Index overhead: ~400 KB
FTS index: ~600 KB
Audio metadata: ~200 KB
Total uncompressed: ~2.5 MB
SQLite compression: ~1.8 MB
Gzip compression: ~1.2 MB
```

## 3. TECHNICAL SPECIFICATIONS

### 3.1 Mobile-First Architecture

**Storage Layer:**
```typescript
interface DictionaryConfig {
  dbPath: string;
  cacheSize: number; // LRU cache size in entries
  preloadCommonWords: boolean;
  enableOfflineAudio: boolean;
  compressionLevel: 'none' | 'standard' | 'aggressive';
}

interface DictionaryEntry {
  id: number;
  word: string;
  lemma: string;
  partOfSpeech: 'noun' | 'verb' | 'adjective' | 'adverb' | 'preposition' | 'article' | 'conjunction';
  definition: string;
  simpleDefinition?: string;
  exampleSentence?: string;
  cefrLevel: 'A1' | 'A2' | 'B1' | 'B2' | 'C1' | 'C2';
  frequencyRank: number;
  isOxford3000: boolean;
  pronunciationIPA?: string;
  pronunciationUS?: string;
  pronunciationUK?: string;
  difficultyScore: number;
  audioFilePath?: string;
  wordFamily?: string;
  syllableCount: number;
}

interface SearchResult {
  entry: DictionaryEntry;
  matchType: 'exact' | 'prefix' | 'fuzzy' | 'definition';
  relevanceScore: number;
  examples?: UsageExample[];
  relatedWords?: RelatedWord[];
}
```

### 3.2 Compression Strategy

**Multi-Level Compression:**
1. **SQLite Built-in Compression:** ~30% reduction
2. **Text Compression:** Deduplicate common phrases
3. **Audio Compression:** MP3 64kbps for pronunciation
4. **Gzip Archive:** Final packaging compression

**Progressive Loading:**
```typescript
interface DictionaryPack {
  core: {
    // A1-A2 essential words (1,100 entries)
    size: '600KB';
    loadPriority: 'immediate';
  };
  intermediate: {
    // B1-B2 words (1,100 entries)
    size: '650KB';
    loadPriority: 'background';
  };
  advanced: {
    // C1-C2 words (300 entries)
    size: '200KB';
    loadPriority: 'on-demand';
  };
  audio: {
    // Pronunciation files
    size: '800KB';
    loadPriority: 'user-preference';
  };
}
```

### 3.3 Search Optimization

**Multi-Strategy Search:**
```typescript
class OfflineDictionary {
  // Exact word lookup (fastest)
  async lookupExact(word: string): Promise<DictionaryEntry | null> {
    const normalized = word.toLowerCase().trim();
    return this.cache.get(normalized) || this.db.get(
      'SELECT * FROM dictionary_entries WHERE word = ? LIMIT 1',
      [normalized]
    );
  }

  // Prefix matching for autocomplete
  async searchPrefix(prefix: string, limit = 10): Promise<SearchResult[]> {
    const query = `
      SELECT *,
             (frequency_rank * 0.4 +
              (oxford_3000 * 20) +
              (6 - difficulty_score) * 5) as relevance_score
      FROM dictionary_entries
      WHERE word LIKE ? || '%'
      ORDER BY relevance_score DESC, frequency_rank ASC
      LIMIT ?`;

    return this.db.all(query, [prefix.toLowerCase(), limit]);
  }

  // Lemmatization and word family lookup
  async lookupWordFamily(word: string): Promise<DictionaryEntry | null> {
    // First try exact match
    let result = await this.lookupExact(word);
    if (result) return result;

    // Try word forms table
    const wordForm = await this.db.get(`
      SELECT de.* FROM dictionary_entries de
      JOIN word_forms wf ON de.id = wf.base_word_id
      WHERE wf.inflected_form = ?
    `, [word.toLowerCase()]);

    return wordForm || null;
  }

  // Full-text search for definitions
  async searchDefinitions(query: string, limit = 5): Promise<SearchResult[]> {
    return this.db.all(`
      SELECT de.*, fts.rank as relevance_score
      FROM dictionary_fts fts
      JOIN dictionary_entries de ON de.id = fts.rowid
      WHERE dictionary_fts MATCH ?
      ORDER BY fts.rank DESC, de.frequency_rank ASC
      LIMIT ?
    `, [query, limit]);
  }
}
```

### 3.4 Update Mechanism

**Version Control Strategy:**
```typescript
interface DictionaryVersion {
  version: string; // semver format
  releaseDate: string;
  changesSummary: string;
  downloadSize: number;
  isRequired: boolean; // Critical updates
  compatibleAppVersions: string[];
}

class DictionaryUpdater {
  async checkForUpdates(): Promise<DictionaryVersion | null> {
    const currentVersion = await this.getCurrentVersion();
    const response = await fetch('/api/dictionary/latest-version');
    const latestVersion: DictionaryVersion = await response.json();

    return this.isNewerVersion(latestVersion.version, currentVersion)
      ? latestVersion
      : null;
  }

  async downloadUpdate(version: DictionaryVersion): Promise<void> {
    // Download compressed delta or full database
    const updateData = await this.downloadWithProgress(
      `/api/dictionary/download/${version.version}`
    );

    // Apply update atomically
    await this.applyUpdate(updateData);
    await this.updateLocalVersion(version);
  }
}
```

## 4. PRIORITIZATION ALGORITHM

### 4.1 ESL Word Importance Scoring

**Multi-Factor Ranking Algorithm:**
```typescript
interface WordScore {
  frequencyScore: number;    // 0-40 points (BNC + COCA frequency)
  pedagogicalScore: number;  // 0-30 points (Oxford 3000, CEFR level)
  utilityScore: number;      // 0-20 points (word family size, versatility)
  contextScore: number;      // 0-10 points (BookBridge corpus relevance)
  totalScore: number;        // 0-100 points
}

function calculateWordPriority(word: WordData): WordScore {
  const frequencyScore = calculateFrequencyScore(word.bncRank, word.cocaRank);
  const pedagogicalScore = calculatePedagogicalScore(word.cefrLevel, word.isOxford3000);
  const utilityScore = calculateUtilityScore(word.partOfSpeech, word.wordFamilySize);
  const contextScore = calculateContextScore(word.bookbridgeFrequency);

  return {
    frequencyScore,
    pedagogicalScore,
    utilityScore,
    contextScore,
    totalScore: frequencyScore + pedagogicalScore + utilityScore + contextScore
  };
}

function calculateFrequencyScore(bncRank: number, cocaRank: number): number {
  // Higher frequency = higher score, capped at 40 points
  const avgRank = (bncRank + cocaRank) / 2;
  if (avgRank <= 500) return 40;
  if (avgRank <= 1000) return 35;
  if (avgRank <= 2000) return 30;
  if (avgRank <= 5000) return 20;
  if (avgRank <= 10000) return 10;
  return 5;
}

function calculatePedagogicalScore(cefrLevel: string, isOxford3000: boolean): number {
  let score = 0;

  // Oxford 3000 bonus
  if (isOxford3000) score += 15;

  // CEFR level importance (earlier levels = higher priority)
  switch (cefrLevel) {
    case 'A1': score += 15; break;
    case 'A2': score += 12; break;
    case 'B1': score += 10; break;
    case 'B2': score += 8; break;
    case 'C1': score += 5; break;
    case 'C2': score += 3; break;
  }

  return score;
}
```

### 4.2 Proficiency Level Adaptation

**Dynamic Content Serving:**
```typescript
interface LearnerProfile {
  cefrLevel: 'A1' | 'A2' | 'B1' | 'B2' | 'C1' | 'C2';
  vocabularySize: number;
  strongDomains: string[]; // 'academic', 'casual', 'business'
  weakDomains: string[];
  learningGoals: 'general' | 'academic' | 'business' | 'test-prep';
}

class AdaptiveDictionary {
  async getDefinitionForLearner(
    word: string,
    learnerProfile: LearnerProfile
  ): Promise<DictionaryEntry> {
    const entry = await this.lookupWord(word);

    // Adapt definition complexity based on learner level
    if (this.shouldSimplifyDefinition(entry, learnerProfile)) {
      entry.definition = entry.simpleDefinition || entry.definition;
    }

    // Select appropriate example sentence
    entry.exampleSentence = await this.selectBestExample(
      entry,
      learnerProfile
    );

    return entry;
  }

  private shouldSimplifyDefinition(
    entry: DictionaryEntry,
    profile: LearnerProfile
  ): boolean {
    // Use simple definition if learner is 2+ levels below word difficulty
    const learnerLevel = this.cefrToNumeric(profile.cefrLevel);
    const wordLevel = this.cefrToNumeric(entry.cefrLevel);

    return (wordLevel - learnerLevel) >= 2;
  }
}
```

## 5. EXAMPLE IMPLEMENTATION

### 5.1 Sample Dictionary Data

**Core Vocabulary Sample (25 Essential Words):**

```json
{
  "dictionaryVersion": "1.0.0",
  "generatedAt": "2024-10-22T00:00:00Z",
  "totalEntries": 2500,
  "sampleEntries": [
    {
      "id": 1,
      "word": "the",
      "lemma": "the",
      "partOfSpeech": "article",
      "definition": "Used before nouns to refer to particular things that both the speaker and listener know about.",
      "simpleDefinition": "A word used before nouns.",
      "exampleSentence": "The book is on the table.",
      "cefrLevel": "A1",
      "frequencyRank": 1,
      "isOxford3000": true,
      "pronunciationIPA": "/ðə/",
      "pronunciationUS": "/ðə/",
      "pronunciationUK": "/ðə/",
      "difficultyScore": 1.0,
      "wordFamily": "the",
      "syllableCount": 1,
      "totalScore": 95
    },
    {
      "id": 2,
      "word": "be",
      "lemma": "be",
      "partOfSpeech": "verb",
      "definition": "To exist or live; to have a particular quality or state.",
      "simpleDefinition": "To exist or to have a quality.",
      "exampleSentence": "I want to be a teacher.",
      "cefrLevel": "A1",
      "frequencyRank": 2,
      "isOxford3000": true,
      "pronunciationIPA": "/biː/",
      "pronunciationUS": "/bi/",
      "pronunciationUK": "/biː/",
      "difficultyScore": 1.2,
      "wordFamily": "be",
      "syllableCount": 1,
      "totalScore": 94,
      "wordForms": [
        {"form": "am", "type": "present_1st_singular"},
        {"form": "is", "type": "present_3rd_singular"},
        {"form": "are", "type": "present_plural"},
        {"form": "was", "type": "past_singular"},
        {"form": "were", "type": "past_plural"},
        {"form": "been", "type": "past_participle"},
        {"form": "being", "type": "gerund"}
      ]
    },
    {
      "id": 15,
      "word": "make",
      "lemma": "make",
      "partOfSpeech": "verb",
      "definition": "To create, produce, or cause something to happen.",
      "simpleDefinition": "To create or produce something.",
      "exampleSentence": "I will make dinner tonight.",
      "cefrLevel": "A1",
      "frequencyRank": 45,
      "isOxford3000": true,
      "pronunciationIPA": "/meɪk/",
      "pronunciationUS": "/meɪk/",
      "pronunciationUK": "/meɪk/",
      "difficultyScore": 1.8,
      "wordFamily": "make",
      "syllableCount": 1,
      "totalScore": 88,
      "usageExamples": [
        {
          "text": "She makes beautiful art.",
          "difficulty": "A1",
          "context": "creative"
        },
        {
          "text": "This decision will make a difference.",
          "difficulty": "B1",
          "context": "abstract"
        }
      ],
      "relatedWords": [
        {"word": "create", "relationship": "synonym", "strength": 0.8},
        {"word": "produce", "relationship": "synonym", "strength": 0.7},
        {"word": "build", "relationship": "synonym", "strength": 0.6}
      ]
    },
    {
      "id": 156,
      "word": "serendipity",
      "lemma": "serendipity",
      "partOfSpeech": "noun",
      "definition": "The occurrence of events by chance in a happy or beneficial way.",
      "simpleDefinition": "Finding something good by accident.",
      "exampleSentence": "Meeting my best friend was pure serendipity.",
      "cefrLevel": "C2",
      "frequencyRank": 15420,
      "isOxford3000": false,
      "pronunciationIPA": "/ˌsɛrənˈdɪpɪti/",
      "pronunciationUS": "/ˌsɛrənˈdɪpɪti/",
      "pronunciationUK": "/ˌsɛrənˈdɪpɪti/",
      "difficultyScore": 4.8,
      "wordFamily": "serendipity",
      "syllableCount": 5,
      "totalScore": 25
    }
  ]
}
```

### 5.2 Size Calculations by Category

**Storage Breakdown:**
```typescript
interface StorageAnalysis {
  coreVocabulary: {
    entries: 1100; // A1-A2 levels
    avgSizePerEntry: 485; // bytes
    totalSize: '534 KB';
    compressionRatio: 0.65;
    compressedSize: '347 KB';
  };

  intermediateVocabulary: {
    entries: 1100; // B1-B2 levels
    avgSizePerEntry: 520; // bytes (longer definitions)
    totalSize: '572 KB';
    compressionRatio: 0.68;
    compressedSize: '389 KB';
  };

  advancedVocabulary: {
    entries: 300; // C1-C2 levels
    avgSizePerEntry: 580; // bytes (complex definitions)
    totalSize: '174 KB';
    compressionRatio: 0.70;
    compressedSize: '122 KB';
  };

  pronunciationAudio: {
    filesCount: 2500;
    avgSizePerFile: 3500; // bytes (MP3 64kbps, 2-3 seconds)
    totalSize: '8.75 MB';
    compressionRatio: 0.85; // Already compressed audio
    compressedSize: '7.44 MB';
  };

  databaseOverhead: {
    indexes: '180 KB';
    ftsSearch: '220 KB';
    metadata: '50 KB';
    total: '450 KB';
  };

  totalPackageSize: {
    withoutAudio: '1.31 MB'; // Text-only dictionary
    withAudio: '8.89 MB';    // Full package with pronunciation
    downloadSize: '2.1 MB';  // Progressive download core + intermediate
  };
}
```

### 5.3 Performance Benchmarks

**Target Performance Metrics:**
```typescript
interface PerformanceBenchmarks {
  lookupSpeed: {
    exactMatch: '<50ms';      // Cache hit
    prefixSearch: '<100ms';   // 10 results
    fuzzySearch: '<200ms';    // 5 results
    definitionSearch: '<300ms'; // FTS query
  };

  memoryUsage: {
    baseFootprint: '2.5 MB';   // Essential data in memory
    lruCache: '1.5 MB';        // 500 most recent entries
    maxTotalUsage: '6 MB';     // With audio cache
  };

  batteryImpact: {
    lookupCost: '0.01%';       // Per lookup
    hourlyUsage: '2-3%';       // Typical reading session
  };

  diskSpace: {
    corePackage: '1.31 MB';
    fullPackage: '8.89 MB';
    cacheExpansion: '2-5 MB';  // User-generated cache
  };
}
```

## 6. INTEGRATION WITH BOOKBRIDGE ARCHITECTURE

### 6.1 Prisma Schema Extension

**Add to existing schema.prisma:**
```prisma
// Offline Dictionary Tables
model DictionaryEntry {
  id                String   @id @default(cuid())
  word              String   @unique
  lemma             String
  partOfSpeech      String   @map("part_of_speech")
  definition        String
  simpleDefinition  String?  @map("simple_definition")
  exampleSentence   String?  @map("example_sentence")
  cefrLevel         String   @map("cefr_level")
  frequencyRank     Int      @map("frequency_rank")
  isOxford3000      Boolean  @default(false) @map("is_oxford_3000")
  pronunciationIPA  String?  @map("pronunciation_ipa")
  pronunciationUS   String?  @map("pronunciation_us")
  pronunciationUK   String?  @map("pronunciation_uk")
  difficultyScore   Float    @map("difficulty_score")
  audioFilePath     String?  @map("audio_file_path")
  wordFamily        String?  @map("word_family")
  syllableCount     Int      @map("syllable_count")
  createdAt         DateTime @default(now()) @map("created_at")
  updatedAt         DateTime @updatedAt @map("updated_at")

  // Relations
  wordForms         WordForm[]
  usageExamples     UsageExample[]
  relatedWords      WordRelationship[] @relation("BaseWord")
  reverseRelations  WordRelationship[] @relation("RelatedWord")
  lookupLogs        DictionaryLookup[]

  @@index([word])
  @@index([cefrLevel])
  @@index([frequencyRank])
  @@index([isOxford3000])
  @@map("dictionary_entries")
}

model WordForm {
  id            String          @id @default(cuid())
  baseWordId    String          @map("base_word_id")
  formType      String          @map("form_type")
  inflectedForm String          @map("inflected_form")

  baseWord      DictionaryEntry @relation(fields: [baseWordId], references: [id], onDelete: Cascade)

  @@index([inflectedForm])
  @@map("word_forms")
}

model UsageExample {
  id              String          @id @default(cuid())
  wordId          String          @map("word_id")
  exampleText     String          @map("example_text")
  difficultyLevel String          @map("difficulty_level")
  contextType     String?         @map("context_type")
  audioFilePath   String?         @map("audio_file_path")

  word            DictionaryEntry @relation(fields: [wordId], references: [id], onDelete: Cascade)

  @@map("usage_examples")
}

model WordRelationship {
  id                String          @id @default(cuid())
  wordId            String          @map("word_id")
  relatedWordId     String          @map("related_word_id")
  relationshipType  String          @map("relationship_type")
  strength          Float           @default(1.0)

  baseWord          DictionaryEntry @relation("BaseWord", fields: [wordId], references: [id], onDelete: Cascade)
  relatedWord       DictionaryEntry @relation("RelatedWord", fields: [relatedWordId], references: [id], onDelete: Cascade)

  @@unique([wordId, relatedWordId, relationshipType])
  @@map("word_relationships")
}

// User interaction tracking
model DictionaryLookup {
  id              String          @id @default(cuid())
  userId          String          @map("user_id")
  wordId          String          @map("word_id")
  bookId          String?         @map("book_id")
  sessionId       String?         @map("session_id")
  lookupType      String          @map("lookup_type") // 'tap', 'search', 'suggestion'
  cefrContext     String?         @map("cefr_context") // Reader's level when looking up
  wasUnknown      Boolean         @default(true) @map("was_unknown")
  timeSpent       Int?            @map("time_spent") // milliseconds
  resultUseful    Boolean?        @map("result_useful")
  createdAt       DateTime        @default(now()) @map("created_at")

  user            User            @relation(fields: [userId], references: [id], onDelete: Cascade)
  word            DictionaryEntry @relation(fields: [wordId], references: [id], onDelete: Cascade)

  @@index([userId, createdAt])
  @@index([wordId])
  @@index([bookId])
  @@map("dictionary_lookups")
}

// Update User model to include dictionary lookups
model User {
  // ... existing fields ...
  dictionaryLookups DictionaryLookup[]
}
```

### 6.2 API Endpoints

**RESTful Dictionary API:**
```typescript
// /api/dictionary/lookup/[word].ts
export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  const { word } = req.query;
  const { userId, cefrLevel } = req.body;

  try {
    const dictionary = new OfflineDictionary();
    const entry = await dictionary.lookupWordFamily(word as string);

    if (!entry) {
      return res.status(404).json({ error: 'Word not found' });
    }

    // Adapt definition for user's level
    const adaptedEntry = await dictionary.adaptForLearner(entry, {
      cefrLevel: cefrLevel || 'B2',
      userId
    });

    // Log lookup for analytics
    await logDictionaryLookup(userId, entry.id, {
      lookupType: 'api',
      cefrContext: cefrLevel
    });

    res.status(200).json({ entry: adaptedEntry });
  } catch (error) {
    res.status(500).json({ error: 'Internal server error' });
  }
}

// /api/dictionary/search.ts - Prefix and fuzzy search
export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  const { q: query, type = 'prefix', limit = 10 } = req.query;

  try {
    const dictionary = new OfflineDictionary();
    let results: SearchResult[] = [];

    switch (type) {
      case 'prefix':
        results = await dictionary.searchPrefix(query as string, Number(limit));
        break;
      case 'definition':
        results = await dictionary.searchDefinitions(query as string, Number(limit));
        break;
      case 'fuzzy':
        results = await dictionary.fuzzySearch(query as string, Number(limit));
        break;
    }

    res.status(200).json({ results });
  } catch (error) {
    res.status(500).json({ error: 'Search failed' });
  }
}
```

### 6.3 React Components

**Dictionary Lookup Component:**
```typescript
// components/dictionary/DictionaryLookup.tsx
import { useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

interface DictionaryLookupProps {
  word: string;
  onClose: () => void;
  userCefrLevel?: string;
}

export const DictionaryLookup: React.FC<DictionaryLookupProps> = ({
  word,
  onClose,
  userCefrLevel = 'B2'
}) => {
  const [entry, setEntry] = useState<DictionaryEntry | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const lookupWord = useCallback(async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/dictionary/lookup/${word}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ cefrLevel: userCefrLevel })
      });

      if (response.ok) {
        const data = await response.json();
        setEntry(data.entry);
      } else {
        setError('Word not found');
      }
    } catch (err) {
      setError('Failed to lookup word');
    } finally {
      setLoading(false);
    }
  }, [word, userCefrLevel]);

  React.useEffect(() => {
    lookupWord();
  }, [lookupWord]);

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: 50 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: 50 }}
        className="fixed bottom-0 left-0 right-0 bg-white rounded-t-xl shadow-xl z-50 p-6 max-h-80 overflow-y-auto"
      >
        <div className="flex justify-between items-start mb-4">
          <h2 className="text-xl font-semibold text-gray-900">
            {word}
          </h2>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700"
          >
            ✕
          </button>
        </div>

        {loading && (
          <div className="flex justify-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          </div>
        )}

        {error && (
          <div className="text-red-600 text-center py-4">
            {error}
          </div>
        )}

        {entry && (
          <div className="space-y-4">
            <div className="flex items-center space-x-2">
              <span className="text-sm font-medium text-blue-600 bg-blue-100 px-2 py-1 rounded">
                {entry.cefrLevel}
              </span>
              <span className="text-sm text-gray-600">
                {entry.partOfSpeech}
              </span>
              {entry.pronunciationUS && (
                <button className="text-sm text-gray-500 hover:text-gray-700">
                  🔊 /{entry.pronunciationUS}/
                </button>
              )}
            </div>

            <div>
              <h3 className="font-medium text-gray-900 mb-1">Definition</h3>
              <p className="text-gray-700">
                {entry.definition}
              </p>
            </div>

            {entry.exampleSentence && (
              <div>
                <h3 className="font-medium text-gray-900 mb-1">Example</h3>
                <p className="text-gray-600 italic">
                  "{entry.exampleSentence}"
                </p>
              </div>
            )}

            {entry.relatedWords && entry.relatedWords.length > 0 && (
              <div>
                <h3 className="font-medium text-gray-900 mb-1">Related</h3>
                <div className="flex flex-wrap gap-2">
                  {entry.relatedWords.map((related, index) => (
                    <span
                      key={index}
                      className="text-sm bg-gray-100 text-gray-700 px-2 py-1 rounded"
                    >
                      {related.word}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </motion.div>
    </AnimatePresence>
  );
};
```

## 7. IMPLEMENTATION ROADMAP

### 7.1 Phase 1: Foundation (Weeks 1-2)
- [ ] Download and process Simple English Wiktionary data dump
- [ ] Design and implement SQLite schema
- [ ] Create basic dictionary lookup API endpoints
- [ ] Implement core React components for word lookup
- [ ] Basic testing with 500 most common words

### 7.2 Phase 2: Enhancement (Weeks 3-4)
- [ ] Integrate ECDICT frequency and CEFR annotations
- [ ] Implement word form variation handling
- [ ] Add pronunciation data from IPA Dictionary
- [ ] Create search functionality (prefix, fuzzy, definition)
- [ ] Performance optimization and caching

### 7.3 Phase 3: Integration (Weeks 5-6)
- [ ] Integrate with existing BookBridge reading interface
- [ ] Add tap-to-define functionality to reading pages
- [ ] Implement user lookup tracking and analytics
- [ ] Create adaptive definitions based on user level
- [ ] Mobile optimization and testing

### 7.4 Phase 4: Production (Weeks 7-8)
- [ ] Audio pronunciation file generation and integration
- [ ] Progressive download implementation
- [ ] Update mechanism and version control
- [ ] Performance benchmarking and optimization
- [ ] Production deployment and monitoring

## 8. COST ANALYSIS

### 8.1 Development Costs
- **Data Processing:** ~16 hours (dump processing, schema design)
- **Backend Development:** ~32 hours (API, database, caching)
- **Frontend Development:** ~24 hours (React components, mobile UI)
- **Testing & Optimization:** ~16 hours (performance, edge cases)
- **Total Development:** ~88 hours

### 8.2 Operational Costs
- **Storage:** <$5/month (compressed dictionary data)
- **Bandwidth:** ~$10-30/month (based on user downloads)
- **Audio Hosting:** ~$20-50/month (pronunciation files)
- **API Calls:** $0 (fully offline after initial download)
- **Total Monthly:** ~$35-85/month

### 8.3 Licensing Costs
- **Simple English Wiktionary:** Free (CC license)
- **ECDICT:** Free (MIT license)
- **IPA Dictionary:** Free (MIT license)
- **Future Commercial APIs:** $500-2000/month (optional enhancement)

## Conclusion

This comprehensive offline dictionary pack design provides BookBridge with a robust, mobile-optimized, and ESL-focused vocabulary system. The solution balances performance, user experience, and development costs while maintaining a clear path for future enhancements. The implementation leverages proven open-source data sources and modern web technologies to deliver instant word lookups that enhance the reading experience without interrupting audio playback.

**Key Benefits:**
- ✅ Instant offline lookup (<50ms response time)
- ✅ ESL-optimized definitions for all proficiency levels
- ✅ Minimal storage footprint (<3MB core package)
- ✅ Zero ongoing licensing costs for MVP
- ✅ Seamless integration with existing BookBridge architecture
- ✅ Clear path to premium features and commercial API upgrades

This design positions BookBridge to offer a best-in-class dictionary experience that truly serves ESL learners' needs while maintaining technical excellence and cost efficiency.