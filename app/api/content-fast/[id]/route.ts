import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    console.log('Test route - Fast content fetch for book ID:', id)
    
    return NextResponse.json({
      message: 'Test route working!',
      id,
      timestamp: new Date().toISOString(),
      source: 'alternative-route-structure'
    })
    
  } catch (error) {
    return NextResponse.json(
      { error: 'Test route error', message: String(error) },
      { status: 500 }
    )
  }
}