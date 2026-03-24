import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { CefrLevel, QuizApiResponse } from '@/types/quiz'

const VALID_LEVELS: CefrLevel[] = ['A1', 'A2', 'B1']

// GET /api/quiz/[bookId]?level=A1
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ bookId: string }> }
) {
  try {
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { bookId } = await params
    const level = (request.nextUrl.searchParams.get('level') || 'A1') as CefrLevel

    if (!VALID_LEVELS.includes(level)) {
      return NextResponse.json({ error: 'Invalid level. Must be A1, A2, or B1' }, { status: 400 })
    }

    // Fetch quiz for this book + level
    const { data: quiz, error: quizError } = await supabase
      .from('quizzes')
      .select('*')
      .eq('book_id', bookId)
      .eq('cefr_level', level)
      .single()

    if (quizError && quizError.code !== 'PGRST116') {
      throw quizError
    }

    if (!quiz) {
      const response: QuizApiResponse = { quiz: null, userBestScore: null }
      return NextResponse.json(response)
    }

    // Fetch questions with answers
    const { data: questions, error: questionsError } = await supabase
      .from('questions')
      .select('*, answers(*)')
      .eq('quiz_id', quiz.id)
      .order('position', { ascending: true })

    if (questionsError) throw questionsError

    // Fetch user's best score for this quiz
    const { data: scores, error: scoresError } = await supabase
      .from('user_scores')
      .select('*')
      .eq('user_id', user.id)
      .eq('quiz_id', quiz.id)
      .order('score', { ascending: false })
      .limit(1)

    if (scoresError) throw scoresError

    const response: QuizApiResponse = {
      quiz: { ...quiz, questions: questions || [] },
      userBestScore: scores?.[0] || null
    }

    return NextResponse.json(response)

  } catch (error) {
    console.error('Error fetching quiz:', error)
    return NextResponse.json({ error: 'Failed to fetch quiz' }, { status: 500 })
  }
}
