import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { UserScore } from '@/types/quiz'

// POST /api/quiz/score
// Body: { quizId: string, score: number, totalQuestions: number }
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { quizId, score, totalQuestions } = await request.json()

    if (!quizId || score === undefined || !totalQuestions) {
      return NextResponse.json({ error: 'quizId, score, and totalQuestions are required' }, { status: 400 })
    }

    if (score < 0 || score > totalQuestions) {
      return NextResponse.json({ error: 'Score must be between 0 and totalQuestions' }, { status: 400 })
    }

    const { data: saved, error } = await supabase
      .from('user_scores')
      .insert({
        user_id: user.id,
        quiz_id: quizId,
        score,
        total_questions: totalQuestions
      })
      .select()
      .single()

    if (error) throw error

    return NextResponse.json({ score: saved as UserScore })

  } catch (error) {
    console.error('Error saving quiz score:', error)
    return NextResponse.json({ error: 'Failed to save score' }, { status: 500 })
  }
}
