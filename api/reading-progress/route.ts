import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(request: NextRequest) {
  try {
    const progressData = await request.json();
    
    // Validate required fields
    const required = ['bookId', 'userId', 'currentPage', 'totalPages', 'timestamp'];
    const missing = required.filter(field => !(field in progressData));
    
    if (missing.length > 0) {
      return NextResponse.json(
        { error: `Missing required fields: ${missing.join(', ')}` },
        { status: 400 }
      );
    }

    // Upsert reading progress
    const { data, error } = await supabase
      .from('reading_progress')
      .upsert({
        user_id: progressData.userId,
        book_id: progressData.bookId,
        current_page: progressData.currentPage,
        total_pages: progressData.totalPages,
        reading_time: progressData.readingTime || 0,
        last_position: progressData.lastPosition || 0,
        session_id: progressData.sessionId,
        cefr: progressData.cefr,
        voice: progressData.voice,
        audio_position: progressData.audioPosition,
        updated_at: new Date(progressData.timestamp).toISOString()
      }, {
        onConflict: 'user_id,book_id'
      })
      .select();

    if (error) {
      console.error('Database error saving reading progress:', error);
      return NextResponse.json(
        { error: 'Failed to save reading progress' },
        { status: 500 }
      );
    }

    return NextResponse.json({ 
      success: true, 
      data: data?.[0],
      message: 'Reading progress saved successfully'
    });

  } catch (error) {
    console.error('API error in reading-progress:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    const url = new URL(request.url);
    const userId = url.searchParams.get('userId');
    const bookId = url.searchParams.get('bookId');

    if (!userId) {
      return NextResponse.json(
        { error: 'userId parameter is required' },
        { status: 400 }
      );
    }

    let query = supabase
      .from('reading_progress')
      .select('*')
      .eq('user_id', userId)
      .order('updated_at', { ascending: false });

    if (bookId) {
      query = query.eq('book_id', bookId);
    }

    const { data, error } = await query;

    if (error) {
      console.error('Database error fetching reading progress:', error);
      return NextResponse.json(
        { error: 'Failed to fetch reading progress' },
        { status: 500 }
      );
    }

    return NextResponse.json({ 
      success: true, 
      data: data || [],
      count: data?.length || 0
    });

  } catch (error) {
    console.error('API error in reading-progress GET:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}