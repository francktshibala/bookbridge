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
import { aiUniversalLookup } from '@/lib/dictionary/AIUniversalLookup';

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
      return await lookupWordWithHybridSystem({ word, context }, request);
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

// TRUE AI-FIRST lookup: AI primary, existing systems as fallback
async function lookupWordWithHybridSystem({
  word,
  context
}: DictionaryRequest, request: NextRequest): Promise<Omit<DictionaryResponse, 'cached' | 'responseTime'> | null> {

  console.log('🤖 Dictionary: Starting AI-FIRST lookup for:', word);

  // 1. AI-FIRST: Try AI for consistent ESL-friendly definitions
  try {
    // Get client IP for rate limiting
    const clientIP = request.headers.get('x-forwarded-for') ||
                     request.headers.get('x-real-ip') ||
                     'unknown';

    console.log('🤖 Dictionary: Using AI as primary source for:', word);
    const aiResult = await aiUniversalLookup({
      word,
      context,
      sentence: context // Pass context as sentence for better prompting
    }, clientIP);

    if (aiResult) {
      console.log('✅ Dictionary: AI-FIRST succeeded for:', word, 'Source:', aiResult.source);
      return {
        word: aiResult.word,
        definition: aiResult.definition,
        example: aiResult.example,
        partOfSpeech: aiResult.partOfSpeech,
        phonetic: aiResult.phonetic,
        cefrLevel: aiResult.cefrLevel,
        source: aiResult.source
      };
    } else {
      console.log('⚠️ Dictionary: AI returned null/falsy result for:', word);
    }

  } catch (error) {
    console.error('❌ Dictionary: AI-FIRST failed for:', word, 'Error:', error);

    // AI-ONLY MODE: No fallbacks to traditional dictionaries
    // Return null to force 404 instead of serving complex definitions
    console.log('🚫 Dictionary: AI-ONLY mode - no fallbacks allowed for:', word);
    return null;
  }

  // AI-ONLY MODE: This should never be reached if AI succeeds
  console.log('⚠️ Dictionary: AI returned null/undefined for:', word);
  return null;
}

// Health check endpoint
export async function HEAD() {
  return new NextResponse(null, { status: 200 });
}