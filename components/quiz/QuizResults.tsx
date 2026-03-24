'use client'

import { motion } from 'framer-motion'

interface QuizResultsProps {
  score: number
  totalQuestions: number
  userBestScore: number | null
  onRetry: () => void
  onClose: () => void
}

export function QuizResults({ score, totalQuestions, userBestScore, onRetry, onClose }: QuizResultsProps) {
  const percentage = Math.round((score / totalQuestions) * 100)
  const isNewBest = userBestScore === null || score > userBestScore

  const emoji = percentage === 100 ? '🏆' : percentage >= 80 ? '🌟' : percentage >= 60 ? '👍' : '📖'
  const message =
    percentage === 100 ? 'Perfect score!' :
    percentage >= 80   ? 'Great job!' :
    percentage >= 60   ? 'Good effort!' :
    'Keep reading and try again!'

  return (
    <div className="flex flex-col items-center text-center space-y-6 py-4">

      {/* Score circle */}
      <motion.div
        initial={{ scale: 0 }}
        animate={{ scale: 1 }}
        transition={{ type: 'spring', damping: 15, stiffness: 300, delay: 0.1 }}
        className="relative flex items-center justify-center w-28 h-28 rounded-full border-4"
        style={{ borderColor: 'var(--accent-primary)', background: 'var(--bg-tertiary)' }}
      >
        <div>
          <div
            className="text-3xl font-bold"
            style={{ fontFamily: 'Playfair Display, serif', color: 'var(--text-accent)' }}
          >
            {score}/{totalQuestions}
          </div>
          <div className="text-sm" style={{ color: 'var(--text-secondary)' }}>
            {percentage}%
          </div>
        </div>
      </motion.div>

      {/* Emoji + message */}
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.25 }}
      >
        <div className="text-4xl mb-2">{emoji}</div>
        <p
          className="text-lg font-semibold"
          style={{ fontFamily: 'Playfair Display, serif', color: 'var(--text-accent)' }}
        >
          {message}
        </p>
      </motion.div>

      {/* Personal best badge */}
      {isNewBest && (
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.4 }}
          className="px-4 py-1.5 rounded-full text-sm font-semibold"
          style={{
            background: 'var(--accent-primary)',
            color: 'var(--bg-primary)',
            fontFamily: 'Source Serif Pro, serif'
          }}
        >
          ✨ New personal best!
        </motion.div>
      )}

      {userBestScore !== null && !isNewBest && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.4 }}
          className="text-sm"
          style={{ color: 'var(--text-secondary)', fontFamily: 'Source Serif Pro, serif' }}
        >
          Your best: {userBestScore}/{totalQuestions}
        </motion.div>
      )}

      {/* Actions */}
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.5 }}
        className="flex flex-col gap-3 w-full pt-2"
      >
        <button
          onClick={onRetry}
          className="w-full py-3 rounded-lg font-semibold text-sm transition-all active:scale-95"
          style={{
            background: 'var(--accent-primary)',
            color: 'var(--bg-primary)',
            fontFamily: 'Source Serif Pro, serif'
          }}
        >
          Try Again
        </button>
        <button
          onClick={onClose}
          className="w-full py-3 rounded-lg font-semibold text-sm transition-all active:scale-95"
          style={{
            background: 'var(--bg-tertiary)',
            color: 'var(--text-secondary)',
            border: '1px solid var(--border-light)',
            fontFamily: 'Source Serif Pro, serif'
          }}
        >
          Back to Reading
        </button>
      </motion.div>

    </div>
  )
}
