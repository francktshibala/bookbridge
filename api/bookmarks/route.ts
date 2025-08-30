import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(request: NextRequest) {
  try {
    const bookmarkData = await request.json();
    
    // Validate required fields
    const required = ['id', 'bookId', 'userId', 'page', 'position', 'timestamp', 'type'];
    const missing = required.filter(field => !(field in bookmarkData));
    
    if (missing.length > 0) {
      return NextResponse.json(
        { error: `Missing required fields: ${missing.join(', ')}` },
        { status: 400 }
      );
    }

    // Upsert bookmark
    const { data, error } = await supabase
      .from('bookmarks')
      .upsert({
        id: bookmarkData.id,
        user_id: bookmarkData.userId,
        book_id: bookmarkData.bookId,
        page: bookmarkData.page,
        position: bookmarkData.position,
        note: bookmarkData.note,
        type: bookmarkData.type,
        content: bookmarkData.content,
        created_at: new Date(bookmarkData.timestamp).toISOString(),
        updated_at: new Date(bookmarkData.timestamp).toISOString()
      }, {
        onConflict: 'id'
      })
      .select();

    if (error) {
      console.error('Database error saving bookmark:', error);
      return NextResponse.json(
        { error: 'Failed to save bookmark' },
        { status: 500 }
      );
    }

    return NextResponse.json({ 
      success: true, 
      data: data?.[0],
      message: 'Bookmark saved successfully'
    });

  } catch (error) {
    console.error('API error in bookmarks:', error);
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
    const type = url.searchParams.get('type');

    if (!userId) {
      return NextResponse.json(
        { error: 'userId parameter is required' },
        { status: 400 }
      );
    }

    let query = supabase
      .from('bookmarks')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (bookId) {
      query = query.eq('book_id', bookId);
    }

    if (type) {
      query = query.eq('type', type);
    }

    const { data, error } = await query;

    if (error) {
      console.error('Database error fetching bookmarks:', error);
      return NextResponse.json(
        { error: 'Failed to fetch bookmarks' },
        { status: 500 }
      );
    }

    return NextResponse.json({ 
      success: true, 
      data: data || [],
      count: data?.length || 0
    });

  } catch (error) {
    console.error('API error in bookmarks GET:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const url = new URL(request.url);
    const bookmarkId = url.searchParams.get('id');
    const userId = url.searchParams.get('userId');

    if (!bookmarkId || !userId) {
      return NextResponse.json(
        { error: 'id and userId parameters are required' },
        { status: 400 }
      );
    }

    const { data, error } = await supabase
      .from('bookmarks')
      .delete()
      .eq('id', bookmarkId)
      .eq('user_id', userId)
      .select();

    if (error) {
      console.error('Database error deleting bookmark:', error);
      return NextResponse.json(
        { error: 'Failed to delete bookmark' },
        { status: 500 }
      );
    }

    if (!data || data.length === 0) {
      return NextResponse.json(
        { error: 'Bookmark not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({ 
      success: true, 
      message: 'Bookmark deleted successfully'
    });

  } catch (error) {
    console.error('API error in bookmarks DELETE:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}