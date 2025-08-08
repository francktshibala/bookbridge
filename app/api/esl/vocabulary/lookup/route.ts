import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/client';

// Mock dictionary for demo - in production this would use a real dictionary API
const DICTIONARY: Record<string, any> = {
  'however': {
    pronunciation: '/haʊˈevər/',
    partOfSpeech: 'adverb',
    definition: 'used to introduce a statement that contrasts with something said before',
    example: 'She was tired; however, she kept working.',
    synonyms: ['but', 'nevertheless', 'yet', 'still'],
    translations: {
      'Spanish': 'sin embargo',
      'Chinese': '然而',
      'French': 'cependant',
      'German': 'jedoch',
      'Portuguese': 'no entanto',
      'Arabic': 'ومع ذلك'
    },
    difficulty: 'medium'
  },
  'therefore': {
    pronunciation: '/ˈðerfɔːr/',
    partOfSpeech: 'adverb',
    definition: 'for that reason; consequently',
    example: 'He was the best candidate; therefore, he got the job.',
    synonyms: ['so', 'thus', 'hence', 'consequently'],
    translations: {
      'Spanish': 'por lo tanto',
      'Chinese': '因此',
      'French': 'donc',
      'German': 'daher',
      'Portuguese': 'portanto',
      'Arabic': 'لذلك'
    },
    difficulty: 'medium'
  },
  'shakespeare': {
    pronunciation: '/ˈʃeɪkspɪər/',
    partOfSpeech: 'proper noun',
    definition: 'William Shakespeare (1564-1616), English playwright and poet',
    example: 'Shakespeare wrote Romeo and Juliet.',
    synonyms: ['The Bard', 'The Bard of Avon'],
    translations: {
      'Spanish': 'Shakespeare',
      'Chinese': '莎士比亚',
      'French': 'Shakespeare',
      'German': 'Shakespeare',
      'Portuguese': 'Shakespeare',
      'Arabic': 'شكسبير'
    },
    difficulty: 'easy'
  },
  'tragedy': {
    pronunciation: '/ˈtrædʒədi/',
    partOfSpeech: 'noun',
    definition: 'a play dealing with tragic events and having an unhappy ending',
    example: 'Hamlet is one of Shakespeare\'s most famous tragedies.',
    synonyms: ['drama', 'catastrophe', 'disaster'],
    translations: {
      'Spanish': 'tragedia',
      'Chinese': '悲剧',
      'French': 'tragédie',
      'German': 'Tragödie',
      'Portuguese': 'tragédia',
      'Arabic': 'مأساة'
    },
    difficulty: 'medium'
  },
  'comedy': {
    pronunciation: '/ˈkɒmədi/',
    partOfSpeech: 'noun',
    definition: 'a play characterized by humor and a happy ending',
    example: 'A Midsummer Night\'s Dream is a popular comedy.',
    synonyms: ['humor', 'farce', 'satire'],
    translations: {
      'Spanish': 'comedia',
      'Chinese': '喜剧',
      'French': 'comédie',
      'German': 'Komödie',
      'Portuguese': 'comédia',
      'Arabic': 'كوميديا'
    },
    difficulty: 'easy'
  }
};

export async function POST(request: NextRequest) {
  try {
    const { word, eslLevel, targetLanguage } = await request.json();
    
    if (!word) {
      return NextResponse.json(
        { error: 'Word is required' },
        { status: 400 }
      );
    }

    // Clean the word (remove punctuation, lowercase)
    const cleanWord = word.toLowerCase().replace(/[.,!?;:]$/, '');

    // Try to fetch authenticated user (optional - works without auth too)
    let userId = null;
    try {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      userId = user?.id;
    } catch (e) {
      // Continue without auth
    }

    // Get definition from mock dictionary
    const definition = DICTIONARY[cleanWord];
    
    if (!definition) {
      // Generate a basic definition for unknown words
      return NextResponse.json({
        word: cleanWord,
        pronunciation: '/.../',
        partOfSpeech: 'word',
        definition: `Definition of "${cleanWord}"`,
        example: `The word "${cleanWord}" appears in this text.`,
        synonyms: [],
        translation: targetLanguage && definition?.translations?.[targetLanguage] || null,
        difficulty: 'unknown'
      });
    }

    // Track vocabulary lookup if user is authenticated
    if (userId && eslLevel) {
      try {
        const supabase = createClient();
        await supabase.from('vocabulary_lookups').insert({
          userId,
          word: cleanWord,
          bookId: 'general',
          eslLevel,
          timestamp: new Date().toISOString()
        });
      } catch (e) {
        // Tracking failed - not critical
        console.log('Vocabulary tracking failed:', e);
      }
    }

    // Return full definition with translation if requested
    return NextResponse.json({
      word: cleanWord,
      pronunciation: definition.pronunciation,
      partOfSpeech: definition.partOfSpeech,
      definition: definition.definition,
      example: definition.example,
      synonyms: definition.synonyms,
      translation: targetLanguage && definition.translations?.[targetLanguage] || null,
      difficulty: definition.difficulty
    });

  } catch (error) {
    console.error('Vocabulary lookup error:', error);
    return NextResponse.json(
      { error: 'Failed to lookup word' },
      { status: 500 }
    );
  }
}