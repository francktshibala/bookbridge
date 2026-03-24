'use client'

import { useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { CefrLevel, QuizWithQuestions, UserScore } from '@/types/quiz'
import { QuizModal } from './QuizModal'

interface QuizEntryProps {
  bookId: string
  cefrLevel: CefrLevel
}

type FetchState = 'idle' | 'loading' | 'ready' | 'unavailable' | 'error'

export function QuizEntry({ bookId, cefrLevel }: QuizEntryProps) {
  const [fetchState, setFetchState] = useState<FetchState>('idle')
  const [isOpen, setIsOpen] = useState(false)
  const [quiz, setQuiz] = useState<QuizWithQuestions | null>(null)
  const [bestScore, setBestScore] = useState<UserScore | null>(null)

  async function handleOpen() {
    // If quiz already loaded, just open
    if (fetchState === 'ready' && quiz) {
      setIsOpen(true)
      return
    }

    setFetchState('loading')

    try {
      const level = (['A1', 'A2', 'B1'] as CefrLevel[]).includes(cefrLevel) ? cefrLevel : 'A1'
      const res = await fetch(`/api/quiz/${bookId}?level=${level}`)

      if (!res.ok) throw new Error('Failed to fetch quiz')

      const data = await res.json()

      if (!data.quiz) {
        setFetchState('unavailable')
        return
      }

      setQuiz(data.quiz)
      setBestScore(data.userBestScore)
      setFetchState('ready')
      setIsOpen(true)
    } catch {
      setFetchState('error')
    }
  }

  async function handleScoreSubmit(score: number, totalQuestions: number) {
    if (!quiz) return
    try {
      await fetch('/api/quiz/score', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ quizId: quiz.id, score, totalQuestions })
      })
      // Update local best score if this attempt is better
      if (!bestScore || score > bestScore.score) {
        setBestScore(prev => prev
          ? { ...prev, score, total_questions: totalQuestions }
          : null
        )
      }
    } catch {
      console.error('Failed to save quiz score')
    }
  }

  function handleClose() {
    setIsOpen(false)
  }

  const buttonLabel =
    fetchState === 'loading' ? 'Loading...' : 'Start Quiz'

  return (
    <>
      {/* Quiz trigger banner */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
        className="mx-auto mt-10 mb-6 max-w-xl rounded-xl px-6 py-5 flex flex-col items-center gap-3 text-center"
        style={{
          background: 'var(--bg-tertiary)',
          border: '1px solid var(--border-light)',
          boxShadow: '0 4px 20px var(--shadow-soft)'
        }}
      >
        <div className="text-3xl">
          {fetchState === 'unavailable' ? '⏳' : fetchState === 'error' ? '⚠️' : '📝'}
        </div>

        <div>
          <p
            className="text-base font-semibold"
            style={{ fontFamily: 'Playfair Display, serif', color: 'var(--text-accent)' }}
          >
            {fetchState === 'unavailable'
              ? 'Quiz coming soon'
              : fetchState === 'error'
              ? 'Could not load quiz'
              : 'Test your understanding'}
          </p>
          <p
            className="text-sm mt-0.5"
            style={{ fontFamily: 'Source Serif Pro, serif', color: 'var(--text-secondary)' }}
          >
            {fetchState === 'unavailable'
              ? 'Questions for this book are being prepared'
              : fetchState === 'error'
              ? 'Please try again later'
              : `5 questions · Level ${cefrLevel}`}
          </p>
        </div>

        {fetchState !== 'unavailable' && fetchState !== 'error' && (
          <button
            onClick={handleOpen}
            disabled={fetchState === 'loading'}
            className="mt-1 px-6 py-2.5 rounded-lg text-sm font-semibold transition-all active:scale-95 hover:opacity-90 disabled:opacity-60 disabled:cursor-not-allowed"
            style={{
              background: 'var(--accent-primary)',
              color: 'var(--bg-primary)',
              fontFamily: 'Source Serif Pro, serif'
            }}
          >
            {buttonLabel}
          </button>
        )}
      </motion.div>

      {/* Modal */}
      <AnimatePresence>
        {isOpen && quiz && (
          <QuizModal
            quiz={quiz}
            userBestScore={bestScore}
            onClose={handleClose}
            onScoreSubmit={handleScoreSubmit}
          />
        )}
      </AnimatePresence>
    </>
  )
}
