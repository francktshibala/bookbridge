import { NextRequest, NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'
import { createClient } from '@/lib/supabase/server'
import { CefrLevel, QuizWithQuestions } from '@/types/quiz'

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

const VALID_LEVELS: CefrLevel[] = ['A1', 'A2', 'B1']

interface GeneratedQuestion {
  question_text: string
  correct_answer: string
  wrong_answers: [string, string, string]
}

// POST /api/quiz/generate
// Body: { bookId: string, level: CefrLevel, bookText: string }
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { bookId, level, bookText } = await request.json()

    if (!bookId || !level || !bookText) {
      return NextResponse.json({ error: 'bookId, level, and bookText are required' }, { status: 400 })
    }

    if (!VALID_LEVELS.includes(level)) {
      return NextResponse.json({ error: 'Invalid level. Must be A1, A2, or B1' }, { status: 400 })
    }

    // Check if a quiz already exists for this book + level
    const { data: existing } = await supabase
      .from('quizzes')
      .select('id')
      .eq('book_id', bookId)
      .eq('cefr_level', level)
      .single()

    if (existing) {
      return NextResponse.json({ error: 'Quiz already exists for this book and level' }, { status: 409 })
    }

    // Ask Claude to generate 5 multiple-choice questions
    const message = await anthropic.messages.create({
      model: 'claude-3-5-haiku-20241022',
      max_tokens: 1024,
      messages: [
        {
          role: 'user',
          content: `You are an ESL quiz generator. Generate exactly 5 multiple-choice reading comprehension questions at the ${level} CEFR level based on the text below.

Rules:
- Questions must be answerable from the text only
- Use simple vocabulary appropriate for ${level} learners
- Each question must have exactly 3 wrong answers that are plausible but clearly incorrect
- Return ONLY a valid JSON array, no extra text

Format:
[
  {
    "question_text": "...",
    "correct_answer": "...",
    "wrong_answers": ["...", "...", "..."]
  }
]

Text:
${bookText.slice(0, 3000)}`
        }
      ]
    })

    const rawContent = message.content[0].type === 'text' ? message.content[0].text : ''

    let questions: GeneratedQuestion[]
    try {
      questions = JSON.parse(rawContent)
    } catch {
      console.error('Claude returned invalid JSON:', rawContent)
      return NextResponse.json({ error: 'Failed to parse AI response' }, { status: 500 })
    }

    if (!Array.isArray(questions) || questions.length === 0) {
      return NextResponse.json({ error: 'AI returned no questions' }, { status: 500 })
    }

    // Insert quiz
    const { data: quiz, error: quizError } = await supabase
      .from('quizzes')
      .insert({ book_id: bookId, cefr_level: level })
      .select()
      .single()

    if (quizError) throw quizError

    // Insert questions and answers
    const insertedQuestions = []

    for (let i = 0; i < questions.length; i++) {
      const q = questions[i]

      const { data: question, error: questionError } = await supabase
        .from('questions')
        .insert({
          quiz_id: quiz.id,
          question_text: q.question_text,
          correct_answer: q.correct_answer,
          position: i
        })
        .select()
        .single()

      if (questionError) throw questionError

      const allAnswers = [
        { question_id: question.id, answer_text: q.correct_answer, is_correct: true },
        ...q.wrong_answers.map((a: string) => ({ question_id: question.id, answer_text: a, is_correct: false }))
      ]

      const { data: answers, error: answersError } = await supabase
        .from('answers')
        .insert(allAnswers)
        .select()

      if (answersError) throw answersError

      insertedQuestions.push({ ...question, answers: answers || [] })
    }

    const result: QuizWithQuestions = { ...quiz, questions: insertedQuestions }

    return NextResponse.json({ quiz: result })

  } catch (error) {
    console.error('Error generating quiz:', error)
    return NextResponse.json({ error: 'Failed to generate quiz' }, { status: 500 })
  }
}
