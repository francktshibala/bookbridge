import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function GET(request: NextRequest) {
  try {
    // Get user from Supabase auth
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '10');
    const search = searchParams.get('search') || '';

    const skip = (page - 1) * limit;

    // Create service role client to bypass RLS for reading books
    const { createClient: createServiceClient } = require('@supabase/supabase-js');
    const serviceSupabase = createServiceClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    // Build query for Supabase
    let query = serviceSupabase
      .from('books')
      .select('*', { count: 'exact' });

    // Apply search filter if provided
    if (search) {
      query = query.or(`title.ilike.%${search}%,author.ilike.%${search}%,genre.ilike.%${search}%`);
    }

    // Apply pagination
    query = query
      .order('createdAt', { ascending: false })
      .range(skip, skip + limit - 1);

    const { data: books, error: queryError, count } = await query;

    if (queryError) {
      console.error('Query error:', queryError);
      throw queryError;
    }

    const total = count || 0;
    
    console.log(`Books API: Found ${total} total books, returning ${books?.length || 0} books`);

    return NextResponse.json({
      books,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit)
      }
    });

  } catch (error) {
    console.error('Books API error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    // Get user from Supabase auth
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { title, author, description, genre, publishYear, isbn, language = 'en' } = body;

    // Validate required fields
    if (!title || !author) {
      return NextResponse.json(
        { error: 'Title and author are required' },
        { status: 400 }
      );
    }

    // For MVP, only allow public domain books
    const publicDomain = true;

    // Check if book already exists
    const { data: existingBooks } = await supabase
      .from('books')
      .select('id')
      .ilike('title', title)
      .ilike('author', author)
      .limit(1);

    if (existingBooks && existingBooks.length > 0) {
      return NextResponse.json(
        { error: 'Book already exists in the database' },
        { status: 409 }
      );
    }

    // Generate a unique ID
    const crypto = require('crypto');
    const bookId = crypto.randomUUID();

    // Create new book
    const { data: book, error: insertError } = await supabase
      .from('books')
      .insert({
        id: bookId,
        title,
        author,
        description,
        genre,
        publishYear,
        isbn,
        language,
        publicDomain,
        uploadedBy: user.id,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      })
      .select()
      .single();

    if (insertError) {
      console.error('Insert error:', insertError);
      throw insertError;
    }

    return NextResponse.json({ book }, { status: 201 });

  } catch (error) {
    console.error('Create book error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}