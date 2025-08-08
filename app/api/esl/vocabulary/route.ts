import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase/client';
import { claudeService } from '@/lib/ai/claude-service';

interface VocabularyLookupRequest {
  word: string;
  context: string;
  userLevel: 'A1' | 'A2' | 'B1' | 'B2' | 'C1' | 'C2';
  userId: string;
  nativeLanguage?: string;
}

interface VocabularyDefinition {
  word: string;
  simple: string;
  advanced?: string;
  pronunciation: string;
  examples: string[];
  culturalNote?: string;
  cefrLevel: string;
  isFirstEncounter: boolean;
  partOfSpeech: string;
  synonyms: string[];
  etymology?: string;
}

export async function POST(request: NextRequest) {
  try {
    const body: VocabularyLookupRequest = await request.json();
    const { word, context, userLevel, userId, nativeLanguage } = body;
    
    // Validate required fields
    if (!word || !userLevel || !userId) {
      return NextResponse.json(
        { error: 'Missing required fields: word, userLevel, userId' },
        { status: 400 }
      );
    }

    // Validate CEFR level
    const validLevels = ['A1', 'A2', 'B1', 'B2', 'C1', 'C2'];
    if (!validLevels.includes(userLevel)) {
      return NextResponse.json(
        { error: 'Invalid userLevel. Use: A1, A2, B1, B2, C1, C2' },
        { status: 400 }
      );
    }

    const cleanWord = word.toLowerCase().trim();
    
    // Check if user has encountered this word before
    const { data: existingProgress, error: progressError } = await supabase
      .from('esl_vocabulary_progress')
      .select('*')
      .eq('user_id', userId)
      .eq('word', cleanWord)
      .single();

    const isFirstEncounter = !existingProgress;
    let masteryLevel = existingProgress?.mastery_level || 0;

    // Generate comprehensive vocabulary definition using AI
    const definition = await getESLDefinition(cleanWord, userLevel, context, nativeLanguage);
    
    // Track vocabulary encounter
    await trackVocabularyEncounter(userId, cleanWord, userLevel, definition, isFirstEncounter);
    
    return NextResponse.json({
      success: true,
      word: cleanWord,
      definition: definition.simple,
      advancedDefinition: definition.advanced,
      pronunciation: definition.pronunciation,
      examples: definition.examples,
      culturalNote: definition.culturalNote,
      difficulty: definition.cefrLevel,
      isFirstEncounter,
      masteryLevel: masteryLevel + (isFirstEncounter ? 0 : 1),
      partOfSpeech: definition.partOfSpeech,
      synonyms: definition.synonyms,
      etymology: definition.etymology,
      userLevel,
      lookupTimestamp: new Date().toISOString()
    });
    
  } catch (error) {
    console.error('Vocabulary lookup failed:', error);
    return NextResponse.json(
      { 
        error: 'Vocabulary lookup failed',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

async function getESLDefinition(
  word: string, 
  userLevel: string, 
  context: string, 
  nativeLanguage?: string
): Promise<VocabularyDefinition> {
  try {
    // Create ESL-specific vocabulary query
    const vocabularyQuery = `
Please provide a comprehensive definition for the word "${word}" appropriate for an ESL ${userLevel} level student.

Context: "${context}"

Please provide:
1. A simple definition appropriate for ${userLevel} level (use vocabulary they already know)
2. An advanced definition for reference
3. Phonetic pronunciation guide
4. 2-3 example sentences at ${userLevel} level
5. Part of speech
6. 2-3 simpler synonyms if available
7. Cultural context if the word has cultural significance
8. Estimated CEFR level of this word
9. Brief etymology if interesting and educational

${nativeLanguage ? `Note: The student's native language is ${nativeLanguage}. Provide cultural context relevant to this background.` : ''}

Format the response as structured data that can be parsed.
`;

    // Use the Claude service to get the definition
    const response = await claudeService.query(vocabularyQuery, {
      userId: 'system-vocabulary-lookup',
      responseMode: 'detailed',
      maxTokens: 800,
      userProfile: {
        eslLevel: userLevel,
        nativeLanguage: nativeLanguage
      }
    });

    // Parse the AI response and extract structured data
    const definition = parseAIVocabularyResponse(response.content, word, userLevel);
    return definition;
    
  } catch (error) {
    console.error('AI vocabulary definition failed:', error);
    // Return fallback definition
    return getFallbackDefinition(word, userLevel);
  }
}

function parseAIVocabularyResponse(aiResponse: string, word: string, userLevel: string): VocabularyDefinition {
  try {
    // Simple parsing - in production would use more sophisticated NLP
    const lines = aiResponse.split('\n').filter(line => line.trim());
    
    let simple = `${word} - see definition above`;
    let advanced = '';
    let pronunciation = `/${word}/`;
    let examples: string[] = [];
    let culturalNote = '';
    let partOfSpeech = 'word';
    let synonyms: string[] = [];
    let etymology = '';
    let estimatedLevel = userLevel;
    
    // Extract information using simple pattern matching
    for (const line of lines) {
      const lowerLine = line.toLowerCase();
      
      if (lowerLine.includes('simple definition') || lowerLine.includes('basic definition')) {
        simple = line.replace(/^[^:]*:?\s*/, '').trim();
      } else if (lowerLine.includes('advanced definition')) {
        advanced = line.replace(/^[^:]*:?\s*/, '').trim();
      } else if (lowerLine.includes('pronunciation')) {
        pronunciation = line.replace(/^[^:]*:?\s*/, '').trim();
      } else if (lowerLine.includes('example')) {
        const example = line.replace(/^[^:]*:?\s*/, '').trim();
        if (example.length > 10) examples.push(example);
      } else if (lowerLine.includes('cultural')) {
        culturalNote = line.replace(/^[^:]*:?\s*/, '').trim();
      } else if (lowerLine.includes('part of speech') || lowerLine.includes('pos:')) {
        partOfSpeech = line.replace(/^[^:]*:?\s*/, '').trim();
      } else if (lowerLine.includes('synonym')) {
        const synonymText = line.replace(/^[^:]*:?\s*/, '').trim();
        synonyms = synonymText.split(',').map(s => s.trim()).filter(s => s.length > 0);
      } else if (lowerLine.includes('etymology')) {
        etymology = line.replace(/^[^:]*:?\s*/, '').trim();
      } else if (lowerLine.includes('cefr') || lowerLine.includes('level')) {
        const levelMatch = line.match(/([ABC][12])/);
        if (levelMatch) estimatedLevel = levelMatch[1];
      }
    }
    
    // Ensure we have at least basic information
    if (simple === `${word} - see definition above`) {
      // Extract the first substantial sentence as definition
      const sentences = aiResponse.split(/[.!?]+/).filter(s => s.trim().length > 10);
      if (sentences.length > 0) {
        simple = sentences[0].trim() + '.';
      }
    }
    
    if (examples.length === 0) {
      // Generate basic example if none provided
      examples.push(`This is an example sentence with ${word}.`);
    }

    return {
      word,
      simple: simple || `A word meaning ${word}`,
      advanced: advanced || simple,
      pronunciation: pronunciation.includes('/') ? pronunciation : `/${pronunciation}/`,
      examples: examples.slice(0, 3), // Limit to 3 examples
      culturalNote: culturalNote || undefined,
      cefrLevel: estimatedLevel,
      isFirstEncounter: true, // Will be updated by caller
      partOfSpeech: partOfSpeech || 'word',
      synonyms: synonyms.slice(0, 3), // Limit to 3 synonyms
      etymology: etymology || undefined
    };
    
  } catch (error) {
    console.error('Failed to parse AI vocabulary response:', error);
    return getFallbackDefinition(word, userLevel);
  }
}

function getFallbackDefinition(word: string, userLevel: string): VocabularyDefinition {
  // Basic vocabulary definitions for common words
  const basicDefinitions: Record<string, Partial<VocabularyDefinition>> = {
    'love': {
      simple: 'A strong feeling of caring for someone or something',
      pronunciation: '/lʌv/',
      examples: ['I love my family.', 'She loves reading books.'],
      partOfSpeech: 'noun, verb',
      synonyms: ['like', 'care for', 'adore']
    },
    'beautiful': {
      simple: 'Very pretty or nice to look at',
      pronunciation: '/ˈbjuːtɪfəl/',
      examples: ['The sunset is beautiful.', 'She has a beautiful smile.'],
      partOfSpeech: 'adjective',
      synonyms: ['pretty', 'lovely', 'attractive']
    },
    'difficult': {
      simple: 'Hard to do or understand',
      pronunciation: '/ˈdɪfɪkəlt/',
      examples: ['This test is difficult.', 'Learning English is difficult but fun.'],
      partOfSpeech: 'adjective',
      synonyms: ['hard', 'challenging', 'tough']
    }
  };

  const fallback = basicDefinitions[word] || {
    simple: `A word that means ${word}`,
    pronunciation: `/${word}/`,
    examples: [`Here is an example with ${word}.`],
    partOfSpeech: 'word',
    synonyms: []
  };

  return {
    word,
    simple: fallback.simple || `A word meaning ${word}`,
    advanced: fallback.simple || `A word meaning ${word}`,
    pronunciation: fallback.pronunciation || `/${word}/`,
    examples: fallback.examples || [`Example: ${word}`],
    culturalNote: fallback.culturalNote,
    cefrLevel: userLevel,
    isFirstEncounter: true,
    partOfSpeech: fallback.partOfSpeech || 'word',
    synonyms: fallback.synonyms || [],
    etymology: fallback.etymology
  };
}

async function trackVocabularyEncounter(
  userId: string,
  word: string,
  userLevel: string,
  definition: VocabularyDefinition,
  isFirstEncounter: boolean
): Promise<void> {
  try {
    const now = new Date().toISOString();
    const nextReview = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(); // 24 hours from now
    
    if (isFirstEncounter) {
      // Create new vocabulary progress record
      const { error } = await supabase
        .from('esl_vocabulary_progress')
        .insert({
          user_id: userId,
          word: word,
          definition: definition.simple,
          difficulty_level: definition.cefrLevel,
          encounters: 1,
          mastery_level: 0,
          first_seen: now,
          last_reviewed: now,
          next_review: nextReview
        });
      
      if (error) {
        console.error('Failed to track new vocabulary:', error);
      }
    } else {
      // Update existing vocabulary progress
      const { error } = await supabase
        .from('esl_vocabulary_progress')
        .update({
          encounters: supabase.rpc('increment', { x: 1 }), // Increment encounters
          mastery_level: supabase.rpc('increment', { x: 1 }), // Increment mastery (up to 5)
          last_reviewed: now,
          next_review: nextReview
        })
        .eq('user_id', userId)
        .eq('word', word);
      
      if (error) {
        console.error('Failed to update vocabulary progress:', error);
      }
    }
  } catch (error) {
    console.error('Vocabulary tracking failed:', error);
    // Non-critical error - don't throw
  }
}