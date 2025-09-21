import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const bookId = searchParams.get('bookId');
    const level = searchParams.get('level') || 'original';

    if (!bookId) {
      return NextResponse.json({
        success: false,
        error: 'Book ID is required'
      }, { status: 400 });
    }

    console.log(`📚 Loading sentences for book: ${bookId}, level: ${level}`);

    // Get book metadata
    const bookContent = await prisma.bookContent.findUnique({
      where: { bookId },
      select: {
        title: true,
        author: true,
        fullText: true
      }
    });

    if (!bookContent) {
      return NextResponse.json({
        success: false,
        error: `Book not found: ${bookId}`
      }, { status: 404 });
    }

    // Get sentence-level audio from Supabase
    const { data: audioAssets, error } = await supabase
      .from('audio_assets')
      .select('*')
      .eq('book_id', bookId)
      .eq('cefr_level', level)
      .eq('chunk_index', 0) // All sentences in chunk 0 for continuous
      .order('sentence_index', { ascending: true });

    if (error) {
      console.error('Supabase error:', error);
      return NextResponse.json({
        success: false,
        error: 'Failed to load audio data'
      }, { status: 500 });
    }

    if (!audioAssets || audioAssets.length === 0) {
      return NextResponse.json({
        success: false,
        error: `No audio found for ${bookId} at ${level} level. Has the test book been generated?`
      }, { status: 404 });
    }

    // Get simplified text if not original level
    let displayText = bookContent.fullText;
    if (level !== 'original') {
      const simplification = await prisma.bookSimplification.findFirst({
        where: {
          bookId,
          targetLevel: level,
          chunkIndex: 0
        },
        select: {
          simplifiedText: true
        }
      });

      if (simplification) {
        displayText = simplification.simplifiedText;
      }
    }

    // Split text into sentences to match audio
    const sentences = displayText
      .split(/[.!?]+/)
      .map(s => s.trim())
      .filter(s => s.length > 0)
      .map(s => s + (s.endsWith('.') || s.endsWith('!') || s.endsWith('?') ? '' : '.'));

    // Combine text sentences with audio data
    const sentencesWithAudio = audioAssets.map((asset, index) => ({
      sentence_index: asset.sentence_index,
      text: sentences[index] || `Sentence ${index + 1}`, // Fallback if text parsing differs
      audio_url: asset.audio_url,
      word_timings: asset.word_timings || [],
      created_at: asset.created_at
    }));

    console.log(`✅ Loaded ${sentencesWithAudio.length} sentences with audio`);

    return NextResponse.json({
      success: true,
      bookId,
      title: bookContent.title,
      author: bookContent.author,
      level,
      sentenceCount: sentencesWithAudio.length,
      sentences: sentencesWithAudio
    });

  } catch (error) {
    console.error('API error:', error);
    return NextResponse.json({
      success: false,
      error: 'Internal server error'
    }, { status: 500 });
  }
}