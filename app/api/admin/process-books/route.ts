import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { bookProcessorService } from '@/lib/book-processor'

export async function POST(request: NextRequest) {
  try {
    // Get user from Supabase auth
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      )
    }

    const { action } = await request.json()

    switch (action) {
      case 'process-all':
        // Start background processing of all books
        bookProcessorService.processAllBooks().catch(error => {
          console.error('Background processing error:', error)
        })
        
        return NextResponse.json({ 
          success: true, 
          message: 'Background processing started for all books' 
        })

      case 'stats':
        const stats = bookProcessorService.getStats()
        return NextResponse.json(stats)

      default:
        return NextResponse.json(
          { error: 'Invalid action' },
          { status: 400 }
        )
    }

  } catch (error) {
    console.error('Error in admin process-books:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}