import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    console.log('Fetching content from BookContent DB for ID:', id);

    // Read from database first (GPT-5 fix)
    const bookContent = await prisma.bookContent.findFirst({
      where: { bookId: id }
    });

    if (bookContent) {
      console.log('✅ Found content in BookContent DB');
      return NextResponse.json({
        id,
        title: bookContent.title,
        author: bookContent.author,
        content: bookContent.fullText,
        contentType: 'text',
        language: 'en'
      });
    }

    // Fallback to Book table if BookContent doesn't exist
    const book = await prisma.book.findFirst({
      where: { id: id }
    });

    if (book) {
      console.log('✅ Found content in Book table');
      return NextResponse.json({
        id,
        title: book.title,
        author: book.author,
        content: book.description || 'No content available',
        contentType: 'text',
        language: 'en'
      });
    }

    console.log('❌ Book not found in database, returning 404');
    return NextResponse.json(
      { error: `Book not found in database: ${id}` },
      { status: 404 }
    );

  } catch (error) {
    console.error('Content API error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  } finally {
    await prisma.$disconnect();
  }
}