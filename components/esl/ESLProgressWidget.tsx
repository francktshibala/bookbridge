'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { useESLMode } from '@/hooks/useESLMode';

export function ESLProgressWidget() {
  const router = useRouter();
  const { eslEnabled, eslLevel } = useESLMode();
  const [stats, setStats] = useState({
    wordsToday: 12,
    streak: 7,
    nextMilestone: 250
  });

  if (!eslEnabled || !eslLevel) {
    return null;
  }

  const getLevelColor = (level: string) => {
    if (level?.startsWith('A')) return '#10b981';
    if (level?.startsWith('B')) return '#3b82f6';
    if (level?.startsWith('C')) return '#8b5cf6';
    return '#6b7280';
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      onClick={() => router.push('/esl-dashboard')}
      style={{
        background: 'rgba(26, 32, 44, 0.8)',
        backdropFilter: 'blur(20px)',
        borderRadius: '16px',
        padding: '20px',
        border: `1px solid ${getLevelColor(eslLevel)}40`,
        cursor: 'pointer',
        transition: 'all 0.2s',
        marginBottom: '24px'
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.transform = 'translateY(-2px)';
        e.currentTarget.style.boxShadow = `0 8px 24px rgba(0, 0, 0, 0.3), 0 0 20px ${getLevelColor(eslLevel)}20`;
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.transform = 'translateY(0)';
        e.currentTarget.style.boxShadow = 'none';
      }}
    >
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: '16px'
      }}>
        <div>
          <p style={{
            fontSize: '12px',
            color: '#a0aec0',
            marginBottom: '4px'
          }}>
            ESL Progress
          </p>
          <h3 style={{
            fontSize: '20px',
            fontWeight: '600',
            color: '#f7fafc'
          }}>
            Level {eslLevel} Journey
          </h3>
        </div>
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '16px'
        }}>
          <div style={{ textAlign: 'center' }}>
            <div style={{
              fontSize: '24px',
              fontWeight: '700',
              color: getLevelColor(eslLevel)
            }}>
              {stats.wordsToday}
            </div>
            <div style={{
              fontSize: '11px',
              color: '#718096'
            }}>
              Words Today
            </div>
          </div>
          <div style={{ textAlign: 'center' }}>
            <div style={{
              fontSize: '24px',
              fontWeight: '700',
              color: '#f59e0b'
            }}>
              {stats.streak}🔥
            </div>
            <div style={{
              fontSize: '11px',
              color: '#718096'
            }}>
              Day Streak
            </div>
          </div>
        </div>
      </div>

      {/* Progress bar to next milestone */}
      <div>
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          marginBottom: '8px'
        }}>
          <span style={{
            fontSize: '12px',
            color: '#a0aec0'
          }}>
            Next milestone
          </span>
          <span style={{
            fontSize: '12px',
            color: getLevelColor(eslLevel),
            fontWeight: '600'
          }}>
            {stats.nextMilestone - stats.wordsToday} words to go
          </span>
        </div>
        <div style={{
          height: '6px',
          background: 'rgba(45, 55, 72, 0.6)',
          borderRadius: '3px',
          overflow: 'hidden'
        }}>
          <motion.div
            initial={{ width: 0 }}
            animate={{ width: `${(stats.wordsToday / stats.nextMilestone) * 100}%` }}
            transition={{ duration: 0.5, delay: 0.2 }}
            style={{
              height: '100%',
              background: `linear-gradient(90deg, ${getLevelColor(eslLevel)} 0%, ${getLevelColor(eslLevel)}cc 100%)`,
              borderRadius: '3px'
            }}
          />
        </div>
      </div>

      <p style={{
        marginTop: '12px',
        fontSize: '13px',
        color: '#a78bfa',
        textAlign: 'center',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: '4px'
      }}>
        View full dashboard
        <span style={{ fontSize: '16px' }}>→</span>
      </p>
    </motion.div>
  );
}