import { NextRequest, NextResponse } from 'next/server';
import { BookProcessor } from '../../../../lib/precompute/book-processor';

export async function POST(request: NextRequest) {
  try {
    const processor = BookProcessor.getInstance();
    
    console.log('🔄 Starting queue processing...');
    await processor.processQueue();
    
    const stats = await processor.getProcessingStats();
    
    return NextResponse.json({
      success: true,
      message: 'Queue processing completed',
      stats
    });

  } catch (error) {
    console.error('❌ Queue processing failed:', error);
    
    return NextResponse.json(
      { 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error' 
      },
      { status: 500 }
    );
  }
}