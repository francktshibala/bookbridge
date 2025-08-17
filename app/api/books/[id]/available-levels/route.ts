import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params

    // Get all available CEFR levels for this book from simplifications
    const availableLevels = await prisma.bookSimplification.findMany({
      where: { bookId: id },
      select: { targetLevel: true },
      distinct: ['targetLevel']
    })

    const levels = availableLevels.map(l => l.targetLevel).sort()
    
    // Also check if this is an enhanced book (has significant simplifications)
    const simplificationCount = await prisma.bookSimplification.count({
      where: { bookId: id }
    })

    const isEnhanced = simplificationCount >= 50 // Threshold for "enhanced" status

    return NextResponse.json({
      bookId: id,
      availableLevels: levels,
      simplificationCount,
      isEnhanced,
      hasAnySimplifications: levels.length > 0
    })

  } catch (error) {
    console.error('Error fetching available levels:', error)
    const { id } = await params
    return NextResponse.json(
      { 
        bookId: id,
        availableLevels: [],
        simplificationCount: 0,
        isEnhanced: false,
        hasAnySimplifications: false,
        error: 'Failed to fetch available levels'
      },
      { status: 500 }
    )
  }
}