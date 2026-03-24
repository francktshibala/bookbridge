export type CefrLevel = 'A1' | 'A2' | 'B1'

export interface Quiz {
  id: string
  book_id: string
  cefr_level: CefrLevel
  created_at: string
}

export interface Answer {
  id: string
  question_id: string
  answer_text: string
  is_correct: boolean
}

export interface Question {
  id: string
  quiz_id: string
  question_text: string
  correct_answer: string
  position: number
  answers: Answer[]
}

export interface QuizWithQuestions extends Quiz {
  questions: Question[]
}

export interface UserScore {
  id: string
  user_id: string
  quiz_id: string
  score: number
  total_questions: number
  completed_at: string
}

// Shape returned by GET /api/quiz/[bookId]
export interface QuizApiResponse {
  quiz: QuizWithQuestions | null
  userBestScore: UserScore | null
}
