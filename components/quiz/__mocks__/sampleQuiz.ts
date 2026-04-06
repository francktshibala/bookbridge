// Sample quiz data for The Necklace - used during UI development
import { QuizWithQuestions, UserScore } from '@/types/quiz'

export const sampleQuiz: QuizWithQuestions = {
  id: 'mock-quiz-1',
  book_id: 'the-necklace-a1',
  cefr_level: 'A1',
  created_at: new Date().toISOString(),
  questions: [
    {
      id: 'mock-q-1',
      quiz_id: 'mock-quiz-1',
      question_text: 'What does Mathilde want most in life?',
      correct_answer: 'To be rich and admired',
      position: 0,
      created_at: new Date().toISOString(),
      answers: [
        { id: 'a1', question_id: 'mock-q-1', answer_text: 'To be rich and admired', is_correct: true },
        { id: 'a2', question_id: 'mock-q-1', answer_text: 'To travel the world', is_correct: false },
        { id: 'a3', question_id: 'mock-q-1', answer_text: 'To become a teacher', is_correct: false },
        { id: 'a4', question_id: 'mock-q-1', answer_text: 'To live in the country', is_correct: false },
      ]
    },
    {
      id: 'mock-q-2',
      quiz_id: 'mock-quiz-1',
      question_text: 'What does Mathilde borrow from her friend?',
      correct_answer: 'A necklace',
      position: 1,
      created_at: new Date().toISOString(),
      answers: [
        { id: 'a5', question_id: 'mock-q-2', answer_text: 'A necklace', is_correct: true },
        { id: 'a6', question_id: 'mock-q-2', answer_text: 'A dress', is_correct: false },
        { id: 'a7', question_id: 'mock-q-2', answer_text: 'A ring', is_correct: false },
        { id: 'a8', question_id: 'mock-q-2', answer_text: 'A bracelet', is_correct: false },
      ]
    },
    {
      id: 'mock-q-3',
      quiz_id: 'mock-quiz-1',
      question_text: 'What happens to the borrowed item?',
      correct_answer: 'Mathilde loses it',
      position: 2,
      created_at: new Date().toISOString(),
      answers: [
        { id: 'a9',  question_id: 'mock-q-3', answer_text: 'Mathilde loses it', is_correct: true },
        { id: 'a10', question_id: 'mock-q-3', answer_text: 'She returns it the next day', is_correct: false },
        { id: 'a11', question_id: 'mock-q-3', answer_text: 'Her husband breaks it', is_correct: false },
        { id: 'a12', question_id: 'mock-q-3', answer_text: 'It is stolen at the party', is_correct: false },
      ]
    },
    {
      id: 'mock-q-4',
      quiz_id: 'mock-quiz-1',
      question_text: 'How do Mathilde and her husband pay for a replacement?',
      correct_answer: 'They borrow money and work for many years',
      position: 3,
      created_at: new Date().toISOString(),
      answers: [
        { id: 'a13', question_id: 'mock-q-4', answer_text: 'They borrow money and work for many years', is_correct: true },
        { id: 'a14', question_id: 'mock-q-4', answer_text: 'Her friend forgives the debt', is_correct: false },
        { id: 'a15', question_id: 'mock-q-4', answer_text: 'They sell their house', is_correct: false },
        { id: 'a16', question_id: 'mock-q-4', answer_text: 'They find the original necklace', is_correct: false },
      ]
    },
    {
      id: 'mock-q-5',
      quiz_id: 'mock-quiz-1',
      question_text: 'What does Mathilde learn at the end of the story?',
      correct_answer: 'The original necklace was fake',
      position: 4,
      created_at: new Date().toISOString(),
      answers: [
        { id: 'a17', question_id: 'mock-q-5', answer_text: 'The original necklace was fake', is_correct: true },
        { id: 'a18', question_id: 'mock-q-5', answer_text: 'Her friend was very angry', is_correct: false },
        { id: 'a19', question_id: 'mock-q-5', answer_text: 'The necklace was found in the street', is_correct: false },
        { id: 'a20', question_id: 'mock-q-5', answer_text: 'Her husband had lied to her', is_correct: false },
      ]
    }
  ]
}

export const sampleBestScore: UserScore = {
  id: 'mock-score-1',
  user_id: 'mock-user-1',
  quiz_id: 'mock-quiz-1',
  score: 3,
  total_questions: 5,
  completed_at: new Date().toISOString()
}
