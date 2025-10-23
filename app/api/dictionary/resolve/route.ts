// Unified dictionary endpoint with caching and request deduplication
// Phase 1: Edge cache + dedup wrapper around existing system

import { NextRequest, NextResponse } from 'next/server';
import {
  getCachedDefinition,
  setCachedDefinition,
  deduplicateRequest,
  normalizeWord
} from '@/lib/dictionary/cache';
import { fetchDefinitionFromAPI } from '@/lib/dictionary/FreeDictionaryAPI';
import { fetchSimpleWiktionaryDefinition } from '@/lib/dictionary/SimpleWiktionaryAPI';
import { getMockDefinition } from '@/data/mockDictionary';
import { getLemmaCandidates } from '@/lib/dictionary/lemmatizer';

interface DictionaryRequest {
  word: string;
  context?: string;
}

interface DictionaryResponse {
  word: string;
  definition: string;
  example?: string;
  partOfSpeech?: string;
  phonetic?: string;
  audioUrl?: string;
  cefrLevel?: string;
  source: string;
  cached: boolean;
  responseTime: number;
}

export async function GET(request: NextRequest) {
  const startTime = Date.now();

  try {
    const { searchParams } = new URL(request.url);
    const word = searchParams.get('word');
    const context = searchParams.get('context') || undefined;

    if (!word) {
      return NextResponse.json(
        { error: 'Word parameter is required' },
        { status: 400 }
      );
    }

    console.log('🔍 Dictionary API: Looking up word:', word);

    // 1. Check cache first
    const cached = getCachedDefinition(word);
    if (cached) {
      const response: DictionaryResponse = {
        word: cached.word,
        definition: cached.definition,
        example: cached.example,
        partOfSpeech: cached.partOfSpeech,
        phonetic: cached.phonetic,
        audioUrl: cached.audioUrl,
        cefrLevel: cached.cefrLevel,
        source: `${cached.source} (cached)`,
        cached: true,
        responseTime: Date.now() - startTime
      };

      return NextResponse.json(response);
    }

    // 2. Use request deduplication to prevent concurrent requests
    const result = await deduplicateRequest(word, async () => {
      return await lookupWordWithExistingSystem({ word, context });
    });

    if (!result) {
      return NextResponse.json(
        { error: 'Definition not found' },
        { status: 404 }
      );
    }

    // 3. Cache the result for future requests
    setCachedDefinition(word, {
      word: result.word,
      definition: result.definition,
      example: result.example,
      partOfSpeech: result.partOfSpeech,
      phonetic: result.phonetic,
      audioUrl: result.audioUrl,
      cefrLevel: result.cefrLevel,
      source: result.source
    });

    const response: DictionaryResponse = {
      ...result,
      cached: false,
      responseTime: Date.now() - startTime
    };

    return NextResponse.json(response);

  } catch (error) {
    console.error('❌ Dictionary API: Error:', error);

    return NextResponse.json(
      {
        error: 'Internal server error',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

// Use existing system as the lookup mechanism (for Phase 1)
async function lookupWordWithExistingSystem({
  word,
  context
}: DictionaryRequest): Promise<Omit<DictionaryResponse, 'cached' | 'responseTime'> | null> {

  console.log('🔎 Dictionary: Starting existing system lookup for:', word);

  // Get lemma candidates for better matching
  const candidates = getLemmaCandidates(word);
  console.log('📝 Dictionary: Checking candidates:', candidates);

  // 1. Try Mock Dictionary first
  for (const candidate of candidates) {
    const mockDef = getMockDefinition(candidate);
    if (mockDef) {
      console.log('✅ Dictionary: Found in mock dictionary:', candidate);
      return {
        word: word, // Return original word, not candidate
        definition: mockDef.definition,
        example: mockDef.example,
        partOfSpeech: mockDef.partOfSpeech,
        phonetic: mockDef.phonetic,
        cefrLevel: mockDef.cefrLevel,
        source: 'Mock Dictionary'
      };
    }
  }

  // 2. Try Simple Wiktionary
  for (const candidate of candidates) {
    const wiktionaryDef = await fetchSimpleWiktionaryDefinition(candidate);
    if (wiktionaryDef) {
      console.log('✅ Dictionary: Found in Simple Wiktionary:', candidate);
      return {
        word: word,
        definition: wiktionaryDef.definition,
        example: wiktionaryDef.example,
        partOfSpeech: wiktionaryDef.partOfSpeech,
        phonetic: wiktionaryDef.phonetic,
        cefrLevel: wiktionaryDef.cefrLevel,
        source: 'Simple Wiktionary'
      };
    }
  }

  // 3. Try Free Dictionary API
  for (const candidate of candidates) {
    const apiDef = await fetchDefinitionFromAPI(candidate);
    if (apiDef) {
      console.log('✅ Dictionary: Found in Free Dictionary API:', candidate);
      return {
        word: word,
        definition: apiDef.definition,
        example: apiDef.example,
        partOfSpeech: apiDef.partOfSpeech,
        phonetic: apiDef.phonetic,
        audioUrl: apiDef.audioUrl,
        cefrLevel: apiDef.cefrLevel,
        source: apiDef.source
      };
    }
  }

  console.log('❌ Dictionary: No definition found for:', word);
  return null;
}

// Health check endpoint
export async function HEAD() {
  return new NextResponse(null, { status: 200 });
}