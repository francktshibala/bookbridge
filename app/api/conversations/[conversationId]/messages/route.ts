import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

const DEFAULT_LIMIT = 30;
const MAX_LIMIT = 100;

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ conversationId: string }> }
) {
  try {
    const supabase = await createClient();
    
    // Get authenticated user
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    const { conversationId } = await params;

    // Extract URL parameters
    const { searchParams } = new URL(request.url);
    const limitParam = searchParams.get('limit');
    const offsetParam = searchParams.get('offset');
    const latestParam = searchParams.get('latest');

    // Parse and validate parameters
    let limit = DEFAULT_LIMIT;
    if (limitParam) {
      const parsedLimit = parseInt(limitParam, 10);
      if (!isNaN(parsedLimit) && parsedLimit > 0) {
        limit = Math.min(parsedLimit, MAX_LIMIT);
      }
    }

    let offset = 0;
    if (offsetParam) {
      const parsedOffset = parseInt(offsetParam, 10);
      if (!isNaN(parsedOffset) && parsedOffset >= 0) {
        offset = parsedOffset;
      }
    }

    const latest = latestParam === 'true';

    // Verify conversation belongs to user
    const { data: conversation, error: convError } = await supabase
      .from('conversations')
      .select('id, userId')
      .eq('id', conversationId)
      .eq('userId', user.id)
      .single();

    if (convError || !conversation) {
      return NextResponse.json(
        { error: 'Conversation not found' },
        { status: 404 }
      );
    }

    // Get total message count for metadata
    const { count: totalCount, error: countError } = await supabase
      .from('messages')
      .select('*', { count: 'exact', head: true })
      .eq('conversationId', conversationId);

    if (countError) {
      console.error('Error getting message count:', countError);
      return NextResponse.json(
        { error: 'Failed to get message count' },
        { status: 500 }
      );
    }

    // Fetch messages for this conversation with pagination
    let messagesQuery = supabase
      .from('messages')
      .select('id, content, sender, createdAt')
      .eq('conversationId', conversationId);

    if (latest) {
      // Get most recent messages (default behavior)
      messagesQuery = messagesQuery
        .order('createdAt', { ascending: false })
        .range(offset, offset + limit - 1);
    } else {
      // Get messages from specific offset
      messagesQuery = messagesQuery
        .order('createdAt', { ascending: true })
        .range(offset, offset + limit - 1);
    }

    const { data: messages, error: messagesError } = await messagesQuery;

    if (messagesError) {
      console.error('Error fetching messages:', messagesError);
      return NextResponse.json(
        { error: 'Failed to fetch messages' },
        { status: 500 }
      );
    }

    // If we got latest messages, reverse them for proper display order
    const orderedMessages = latest ? (messages || []).reverse() : (messages || []);

    return NextResponse.json({
      conversationId,
      messages: orderedMessages,
      metadata: {
        total: totalCount || 0,
        limit,
        offset,
        hasMore: (offset + limit) < (totalCount || 0)
      }
    });

  } catch (error) {
    console.error('Error in messages API:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}