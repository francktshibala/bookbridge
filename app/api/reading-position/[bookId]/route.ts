import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

// GET /api/reading-position/[bookId] - Get user's reading position for a book
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ bookId: string }> }
) {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { bookId } = await params;

    // Check if reading_positions table exists, if not return empty
    const { data: position, error } = await supabase
      .from('reading_positions')
      .select('*')
      .eq('user_id', user.id)
      .eq('book_id', bookId)
      .single();

    if (error) {
      if (error.code === 'PGRST116') { // No rows returned
        return NextResponse.json({
          success: true,
          position: null,
          message: 'No saved position found'
        });
      }
      if (error.message.includes('relation "reading_positions" does not exist')) {
        console.log('Reading positions table not created yet, returning null');
        return NextResponse.json({
          success: true,
          position: null,
          message: 'Reading positions not available yet'
        });
      }
      throw error;
    }

    if (!position) {
      return NextResponse.json({
        success: true,
        position: null,
        message: 'No saved position found'
      });
    }

    return NextResponse.json({
      success: true,
      position: {
        currentSentenceIndex: position.current_sentence_index,
        currentBundleIndex: position.current_bundle_index,
        currentChapter: position.current_chapter,
        playbackTime: position.playback_time,
        totalTime: position.total_time,
        cefrLevel: position.cefr_level,
        playbackSpeed: position.playback_speed,
        contentMode: position.content_mode,
        completionPercentage: position.completion_percentage,
        sentencesRead: position.sentences_read,
        lastAccessed: position.last_accessed,
        sessionDuration: position.session_duration
      }
    });

  } catch (error) {
    console.error('Error fetching reading position:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch reading position' },
      { status: 500 }
    );
  }
}

// POST /api/reading-position/[bookId] - Save/update user's reading position
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ bookId: string }> }
) {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { bookId } = await params;
    const body = await request.json();

    // Validate required fields
    const {
      currentSentenceIndex,
      currentBundleIndex,
      currentChapter,
      playbackTime,
      totalTime,
      cefrLevel,
      playbackSpeed,
      contentMode,
      completionPercentage,
      sentencesRead,
      sessionDuration = 0,
      deviceType = null
    } = body;

    // Get user agent for device type detection if not provided
    const userAgent = request.headers.get('user-agent') || '';
    const detectedDeviceType = deviceType || (
      /Mobile|Android|iPhone|iPad/.test(userAgent) ? 'mobile' : 'desktop'
    );

    // Try to upsert reading position using Supabase
    const { data: position, error } = await supabase
      .from('reading_positions')
      .upsert({
        user_id: user.id,
        book_id: bookId,
        current_sentence_index: currentSentenceIndex,
        current_bundle_index: currentBundleIndex,
        current_chapter: currentChapter,
        playback_time: playbackTime,
        total_time: totalTime,
        cefr_level: cefrLevel,
        playback_speed: playbackSpeed,
        content_mode: contentMode,
        completion_percentage: completionPercentage,
        sentences_read: sentencesRead,
        last_accessed: new Date().toISOString(),
        session_duration: sessionDuration,
        device_type: detectedDeviceType
      })
      .select()
      .single();

    if (error) {
      if (error.message.includes('relation "reading_positions" does not exist')) {
        console.log('Reading positions table not created yet');
        return NextResponse.json({
          success: false,
          error: 'Reading positions feature not available yet'
        }, { status: 503 });
      }
      throw error;
    }

    return NextResponse.json({
      success: true,
      position: {
        id: position.id,
        currentSentenceIndex: position.current_sentence_index,
        currentBundleIndex: position.current_bundle_index,
        currentChapter: position.current_chapter,
        lastAccessed: position.last_accessed,
        completionPercentage: position.completion_percentage
      }
    });

  } catch (error) {
    console.error('Error saving reading position:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to save reading position' },
      { status: 500 }
    );
  }
}

// DELETE /api/reading-position/[bookId] - Reset reading position for a book
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ bookId: string }> }
) {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { bookId } = await params;

    const { error } = await supabase
      .from('reading_positions')
      .delete()
      .eq('user_id', user.id)
      .eq('book_id', bookId);

    if (error) {
      if (error.message.includes('relation "reading_positions" does not exist')) {
        return NextResponse.json({
          success: true,
          message: 'Reading positions not available yet'
        });
      }
      throw error;
    }

    return NextResponse.json({
      success: true,
      message: 'Reading position reset successfully'
    });

  } catch (error) {
    console.error('Error resetting reading position:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to reset reading position' },
      { status: 500 }
    );
  }
}