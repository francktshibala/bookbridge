import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    
    const book = await prisma.featuredBook.findUnique({
      where: { id },
      select: {
        id: true,
        slug: true,
        title: true,
        author: true
      }
    });
    
    if (!book) {
      return NextResponse.json(
        { error: 'Book not found' },
        { status: 404 }
      );
    }
    
    return NextResponse.json(book);
  } catch (error) {
    console.error('Error fetching featured book by ID:', error);
    return NextResponse.json(
      { error: 'Failed to fetch book' },
      { status: 500 }
    );
  }
}

