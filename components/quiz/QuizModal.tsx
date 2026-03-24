'use client'

import { useState, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { QuizWithQuestions, Answer, UserScore } from '@/types/quiz'
import { QuizResults } from './QuizResults'

interface QuizModalProps {
  quiz: QuizWithQuestions
  userBestScore: UserScore | null
  onClose: () => void
  onScoreSubmit: (score: number, totalQuestions: number) => void
}

function shuffleAnswers(answers: Answer[]): Answer[] {
  return [...answers].sort(() => Math.random() - 0.5)
}

export function QuizModal({ quiz, userBestScore, onClose, onScoreSubmit }: QuizModalProps) {
  const [currentIndex, setCurrentIndex] = useState(0)
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [showFeedback, setShowFeedback] = useState(false)
  const [score, setScore] = useState(0)
  const [isFinished, setIsFinished] = useState(false)

  const questions = quiz.questions
  const currentQuestion = questions[currentIndex]

  // Shuffle answers once per question, stable across re-renders
  const shuffledAnswers = useMemo(
    () => questions.map(q => shuffleAnswers(q.answers)),
    [questions]
  )

  function handleSelectAnswer(answer: Answer) {
    if (showFeedback) return
    setSelectedId(answer.id)
    setShowFeedback(true)
    if (answer.is_correct) setScore(prev => prev + 1)
  }

  function handleNext() {
    if (currentIndex + 1 >= questions.length) {
      const finalScore = score + (selectedId && currentQuestion.answers.find(a => a.id === selectedId)?.is_correct ? 0 : 0)
      onScoreSubmit(score, questions.length)
      setIsFinished(true)
    } else {
      setCurrentIndex(prev => prev + 1)
      setSelectedId(null)
      setShowFeedback(false)
    }
  }

  function handleRetry() {
    setCurrentIndex(0)
    setSelectedId(null)
    setShowFeedback(false)
    setScore(0)
    setIsFinished(false)
  }

  function getAnswerStyle(answer: Answer): React.CSSProperties {
    if (!showFeedback || selectedId !== answer.id && !answer.is_correct) {
      return {
        background: selectedId === answer.id ? 'var(--bg-tertiary)' : 'var(--bg-secondary)',
        border: `1px solid ${selectedId === answer.id ? 'var(--accent-primary)' : 'var(--border-light)'}`,
        color: 'var(--text-primary)'
      }
    }
    if (answer.is_correct) {
      return { background: 'rgba(16, 185, 129, 0.15)', border: '1px solid #10b981', color: 'var(--text-primary)' }
    }
    if (selectedId === answer.id) {
      return { background: 'rgba(239, 68, 68, 0.15)', border: '1px solid #ef4444', color: 'var(--text-primary)' }
    }
    return { background: 'var(--bg-secondary)', border: '1px solid var(--border-light)', color: 'var(--text-secondary)' }
  }

  function getAnswerIcon(answer: Answer) {
    if (!showFeedback) return null
    if (answer.is_correct) return <span className="text-green-500 font-bold">✓</span>
    if (selectedId === answer.id) return <span className="text-red-500 font-bold">✗</span>
    return null
  }

  return (
    <div className="fixed inset-0 flex items-center justify-center z-50 p-4"
      style={{ background: 'rgba(0,0,0,0.6)' }}>

      {/* Backdrop */}
      <motion.div
        className="absolute inset-0"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
      />

      {/* Modal card */}
      <motion.div
        initial={{ scale: 0.92, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.92, opacity: 0 }}
        transition={{ type: 'spring', damping: 25, stiffness: 400 }}
        className="relative w-full max-w-md rounded-xl shadow-2xl overflow-hidden"
        style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border-light)' }}
      >
        {/* Header */}
        <div
          className="flex items-center justify-between px-5 py-4 border-b"
          style={{ borderColor: 'var(--border-light)' }}
        >
          <h2
            className="text-lg font-semibold"
            style={{ fontFamily: 'Playfair Display, serif', color: 'var(--text-accent)' }}
          >
            📝 Comprehension Quiz
          </h2>
          <button
            onClick={onClose}
            className="w-8 h-8 flex items-center justify-center rounded-full text-lg transition-colors hover:bg-black/10"
            style={{ color: 'var(--text-secondary)' }}
          >
            ×
          </button>
        </div>

        {/* Body */}
        <div className="p-5" style={{ maxHeight: '75vh', overflowY: 'auto' }}>
          <AnimatePresence mode="wait">
            {isFinished ? (
              <motion.div
                key="results"
                initial={{ opacity: 0, x: 30 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -30 }}
              >
                <QuizResults
                  score={score}
                  totalQuestions={questions.length}
                  userBestScore={userBestScore?.score ?? null}
                  onRetry={handleRetry}
                  onClose={onClose}
                />
              </motion.div>
            ) : (
              <motion.div
                key={currentIndex}
                initial={{ opacity: 0, x: 30 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -30 }}
                transition={{ duration: 0.2 }}
                className="space-y-5"
              >
                {/* Progress */}
                <div className="space-y-1.5">
                  <div className="flex justify-between text-xs" style={{ color: 'var(--text-secondary)', fontFamily: 'Source Serif Pro, serif' }}>
                    <span>Question {currentIndex + 1} of {questions.length}</span>
                    <span>{score} correct</span>
                  </div>
                  <div className="w-full h-1.5 rounded-full" style={{ background: 'var(--border-light)' }}>
                    <div
                      className="h-1.5 rounded-full transition-all duration-300"
                      style={{ width: `${((currentIndex) / questions.length) * 100}%`, background: 'var(--accent-primary)' }}
                    />
                  </div>
                </div>

                {/* Question */}
                <p
                  className="text-base font-semibold leading-snug"
                  style={{ fontFamily: 'Playfair Display, serif', color: 'var(--text-primary)' }}
                >
                  {currentQuestion.question_text}
                </p>

                {/* Answer choices */}
                <div className="space-y-2.5">
                  {shuffledAnswers[currentIndex].map(answer => (
                    <button
                      key={answer.id}
                      onClick={() => handleSelectAnswer(answer)}
                      disabled={showFeedback}
                      className="w-full text-left px-4 py-3 rounded-lg text-sm flex items-center justify-between gap-3 transition-all active:scale-[0.98]"
                      style={{
                        ...getAnswerStyle(answer),
                        fontFamily: 'Source Serif Pro, serif',
                        cursor: showFeedback ? 'default' : 'pointer'
                      }}
                    >
                      <span>{answer.answer_text}</span>
                      {getAnswerIcon(answer)}
                    </button>
                  ))}
                </div>

                {/* Next button */}
                <AnimatePresence>
                  {showFeedback && (
                    <motion.button
                      initial={{ opacity: 0, y: 6 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0 }}
                      onClick={handleNext}
                      className="w-full py-3 rounded-lg font-semibold text-sm transition-all active:scale-95"
                      style={{
                        background: 'var(--accent-primary)',
                        color: 'var(--bg-primary)',
                        fontFamily: 'Source Serif Pro, serif'
                      }}
                    >
                      {currentIndex + 1 >= questions.length ? 'See Results' : 'Next Question →'}
                    </motion.button>
                  )}
                </AnimatePresence>

              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </motion.div>
    </div>
  )
}
