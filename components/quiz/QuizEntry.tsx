'use client'

import { useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { CefrLevel } from '@/types/quiz'
import { QuizModal } from './QuizModal'
import { sampleQuiz, sampleBestScore } from './__mocks__/sampleQuiz'

interface QuizEntryProps {
  bookId: string
  cefrLevel: CefrLevel
}

export function QuizEntry({ bookId, cefrLevel }: QuizEntryProps) {
  const [isOpen, setIsOpen] = useState(false)

  function handleScoreSubmit(score: number, totalQuestions: number) {
    // Phase 3: swap this for POST /api/quiz/score
    console.log('Score submitted:', { bookId, cefrLevel, score, totalQuestions })
  }

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
        <div className="text-3xl">📝</div>
        <div>
          <p
            className="text-base font-semibold"
            style={{ fontFamily: 'Playfair Display, serif', color: 'var(--text-accent)' }}
          >
            Test your understanding
          </p>
          <p
            className="text-sm mt-0.5"
            style={{ fontFamily: 'Source Serif Pro, serif', color: 'var(--text-secondary)' }}
          >
            5 questions · Level {cefrLevel}
          </p>
        </div>
        <button
          onClick={() => setIsOpen(true)}
          className="mt-1 px-6 py-2.5 rounded-lg text-sm font-semibold transition-all active:scale-95 hover:opacity-90"
          style={{
            background: 'var(--accent-primary)',
            color: 'var(--bg-primary)',
            fontFamily: 'Source Serif Pro, serif'
          }}
        >
          Start Quiz
        </button>
      </motion.div>

      {/* Modal */}
      <AnimatePresence>
        {isOpen && (
          <QuizModal
            quiz={sampleQuiz}
            userBestScore={sampleBestScore}
            onClose={() => setIsOpen(false)}
            onScoreSubmit={handleScoreSubmit}
          />
        )}
      </AnimatePresence>
    </>
  )
}
