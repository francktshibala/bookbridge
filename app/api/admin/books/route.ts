import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET() {
  try {
    const contents = await prisma.bookContent.findMany({
      select: { bookId: true, title: true, author: true, totalChunks: true }
    });
    return NextResponse.json({ books: contents });
  } catch (error) {
    console.error('books list error', error);
    return NextResponse.json({ error: 'Failed to fetch books' }, { status: 500 });
  }
}


