import { NextRequest, NextResponse } from 'next/server';
import { BookProcessor } from '../../../../lib/precompute/book-processor';

export async function POST(request: NextRequest) {
  try {
    const processor = BookProcessor.getInstance();
    
    console.log('🚀 Starting priority books initialization...');
    await processor.initializePriorityBooks();
    
    const stats = await processor.getProcessingStats();
    
    return NextResponse.json({
      success: true,
      message: 'Priority books initialization started',
      stats
    });

  } catch (error) {
    console.error('❌ Initialization failed:', error);
    
    return NextResponse.json(
      { 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error' 
      },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    const processor = BookProcessor.getInstance();
    const stats = await processor.getProcessingStats();
    
    return NextResponse.json({
      success: true,
      stats
    });

  } catch (error) {
    console.error('❌ Stats fetch failed:', error);
    
    return NextResponse.json(
      { 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error' 
      },
      { status: 500 }
    );
  }
}