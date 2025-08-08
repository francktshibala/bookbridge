import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { ESLSimplifier } from '@/lib/ai/esl-simplifier';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const resolvedParams = await params;
    const { searchParams } = new URL(request.url);
    const level = searchParams.get('level') as 'A1' | 'A2' | 'B1' | 'B2' | 'C1' | 'C2';
    const section = parseInt(searchParams.get('section') || '0');
    const forceRegenerate = searchParams.get('regenerate') === 'true';
    
    if (!level) {
      return NextResponse.json(
        { error: 'ESL level required (A1, A2, B1, B2, C1, C2)' },
        { status: 400 }
      );
    }

    // Validate CEFR level
    const validLevels = ['A1', 'A2', 'B1', 'B2', 'C1', 'C2'];
    if (!validLevels.includes(level)) {
      return NextResponse.json(
        { error: 'Invalid ESL level. Use: A1, A2, B1, B2, C1, C2' },
        { status: 400 }
      );
    }

    // Check cache first (unless regeneration is forced)
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );
    if (!forceRegenerate) {
      const { data: cached, error: cacheError } = await supabase
        .from('book_simplifications')
        .select('simplified_text, vocabulary_changes, cultural_annotations, quality_score, created_at')
        .eq('book_id', resolvedParams.id)
        .eq('target_level', level)
        .eq('chunk_index', section)
        .single();
      
      if (cached && !cacheError) {
        return NextResponse.json({
          success: true,
          content: cached.simplified_text,
          vocabularyChanges: cached.vocabulary_changes || [],
          culturalAnnotations: cached.cultural_annotations || [],
          qualityScore: cached.quality_score ? parseFloat(cached.quality_score.toString()) : null,
          source: 'cache',
          generatedAt: cached.created_at,
          level: level
        });
      }
    }
    
    // If not cached or regeneration forced, generate on-demand
    const originalContent = await fetchOriginalContent(resolvedParams.id, section);
    if (!originalContent) {
      return NextResponse.json(
        { error: 'Book content not found' },
        { status: 404 }
      );
    }

    console.log(`Generating ${level} simplification for book ${resolvedParams.id}, section ${section}`);
    
    const eslSimplifier = new ESLSimplifier();
    const simplificationResult = await eslSimplifier.simplifyText(
      originalContent,
      level,
      {
        preserveNames: true,
        addCulturalContext: true,
        maintainStoryStructure: true
      }
    );

    // Calculate quality score
    const qualityScore = await calculateSimplificationQuality(
      originalContent,
      simplificationResult.simplifiedText,
      level
    );

    // Store in cache for future requests
    try {
      const { error: storeError } = await supabase
        .from('book_simplifications')
        .upsert({
          book_id: resolvedParams.id,
          target_level: level,
          chunk_index: section,
          original_text: originalContent,
          simplified_text: simplificationResult.simplifiedText,
          vocabulary_changes: simplificationResult.changesLog,
          cultural_annotations: simplificationResult.culturalContexts,
          quality_score: qualityScore,
          updated_at: new Date().toISOString()
        });

      if (storeError) {
        console.error('Failed to cache simplification:', storeError);
        // Continue without caching - not a critical error
      }
    } catch (cacheStoreError) {
      console.error('Cache storage error:', cacheStoreError);
      // Continue without caching
    }
    
    return NextResponse.json({
      success: true,
      content: simplificationResult.simplifiedText,
      vocabularyChanges: simplificationResult.changesLog,
      culturalAnnotations: simplificationResult.culturalContexts,
      qualityScore: qualityScore,
      source: 'generated',
      generatedAt: new Date().toISOString(),
      level: level,
      stats: {
        originalLength: originalContent.length,
        simplifiedLength: simplificationResult.simplifiedText.length,
        compressionRatio: (simplificationResult.simplifiedText.length / originalContent.length).toFixed(2),
        vocabularyChanges: simplificationResult.changesLog.length,
        culturalExplanations: simplificationResult.culturalContexts.length
      }
    });
    
  } catch (error) {
    console.error('ESL simplification failed:', error);
    return NextResponse.json(
      { 
        error: 'Simplification failed',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

async function fetchOriginalContent(bookId: string, section: number): Promise<string | null> {
  try {
    // Try to fetch from the existing book content API
    const response = await fetch(`${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/api/books/${bookId}/content-fast`);
    if (!response.ok) return null;
    
    const data = await response.json();
    if (!data.content) return null;

    // For now, we'll work with the full content or a section based on word count
    // In production, this would be more sophisticated chunking
    const words = data.content.split(' ');
    const chunkSize = 800; // words per section
    const startIndex = section * chunkSize;
    const endIndex = Math.min(startIndex + chunkSize, words.length);
    
    if (startIndex >= words.length) return null;
    
    return words.slice(startIndex, endIndex).join(' ');
  } catch (error) {
    console.error('Failed to fetch original content:', error);
    return null;
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const resolvedParams = await params;
    // Skip auth for demo purposes - focus on making simplification work
    console.log('ESL Simplify: Processing request for book', resolvedParams.id);

    // Get request body
    const { text, targetLevel, nativeLanguage } = await request.json();

    if (!text || !targetLevel) {
      return NextResponse.json(
        { error: 'Missing required fields: text and targetLevel' },
        { status: 400 }
      );
    }

    // Initialize ESL simplifier
    const simplifier = new ESLSimplifier();
    
    // Simplify the text - using the simple overload
    const simplifiedText = await simplifier.simplifyText(
      text,
      targetLevel,
      nativeLanguage
    );

    console.log(`ESL Simplify: Original length: ${text.length}, Simplified length: ${simplifiedText.length}`);

    return NextResponse.json({
      simplifiedText,
      cached: false,
      debug: {
        originalText: text.substring(0, 100) + '...',
        simplifiedText: simplifiedText.substring(0, 100) + '...',
        targetLevel,
        textLength: text.length
      }
    });

  } catch (error) {
    console.error('ESL simplification error:', error);
    
    // Return original text as fallback
    const body = await request.json();
    return NextResponse.json({
      simplifiedText: body.text || 'Error simplifying text',
      error: 'Simplification temporarily unavailable',
      cached: false
    });
  }
}

async function calculateSimplificationQuality(
  original: string,
  simplified: string,
  level: string
): Promise<number> {
  try {
    // Simple quality scoring based on multiple factors
    const originalWords = original.split(' ').length;
    const simplifiedWords = simplified.split(' ').length;
    const lengthRatio = simplifiedWords / originalWords;
    
    // Calculate readability improvement (simple heuristic)
    const originalComplexWords = (original.match(/\b\w{8,}\b/g) || []).length;
    const simplifiedComplexWords = (simplified.match(/\b\w{8,}\b/g) || []).length;
    const complexityReduction = 1 - (simplifiedComplexWords / Math.max(originalComplexWords, 1));
    
    // Level-appropriate scoring
    const levelMultipliers = {
      'A1': 0.5, 'A2': 0.6, 'B1': 0.7, 'B2': 0.8, 'C1': 0.9, 'C2': 1.0
    };
    
    const levelMultiplier = levelMultipliers[level as keyof typeof levelMultipliers] || 0.7;
    
    // Composite score (0-1)
    const qualityScore = Math.min(1, Math.max(0, (
      complexityReduction * 0.5 +
      (lengthRatio > 0.3 ? 0.3 : lengthRatio) + // Prevent over-simplification
      levelMultiplier * 0.2
    )));
    
    return Math.round(qualityScore * 100) / 100; // Round to 2 decimal places
  } catch (error) {
    console.error('Quality calculation failed:', error);
    return 0.5; // Default moderate quality score
  }
}