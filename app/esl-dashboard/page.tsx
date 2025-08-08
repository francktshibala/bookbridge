'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { motion } from 'framer-motion';
import { useESLMode } from '@/hooks/useESLMode';

interface LearningStats {
  totalWordsLearned: number;
  booksCompleted: number;
  readingStreak: number;
  currentLevel: string;
  hoursRead: number;
  vocabularyGrowth: number;
  comprehensionScore: number;
}

interface RecentActivity {
  date: string;
  type: 'reading' | 'vocabulary' | 'completion';
  description: string;
  bookTitle?: string;
}

export default function ESLDashboard() {
  const router = useRouter();
  const { eslLevel, nativeLanguage } = useESLMode();
  const [user, setUser] = useState<any>(null);
  const [stats, setStats] = useState<LearningStats>({
    totalWordsLearned: 0,
    booksCompleted: 0,
    readingStreak: 0,
    currentLevel: eslLevel || 'B2',
    hoursRead: 0,
    vocabularyGrowth: 0,
    comprehensionScore: 0
  });
  const [recentActivity, setRecentActivity] = useState<RecentActivity[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    checkAuthAndLoadData();
  }, []);

  const checkAuthAndLoadData = async () => {
    const supabase = createClient();
    const { data: { user }, error } = await supabase.auth.getUser();
    
    if (error || !user) {
      router.push('/auth/login');
      return;
    }
    
    setUser(user);
    await loadDashboardData(user.id);
  };

  const loadDashboardData = async (userId: string) => {
    try {
      // For now, using mock data - in production this would fetch from database
      setStats({
        totalWordsLearned: 247,
        booksCompleted: 3,
        readingStreak: 7,
        currentLevel: eslLevel || 'B2',
        hoursRead: 12.5,
        vocabularyGrowth: 35,
        comprehensionScore: 78
      });

      setRecentActivity([
        {
          date: 'Today',
          type: 'vocabulary',
          description: 'Learned 12 new words',
          bookTitle: 'Shakespeare\'s Works'
        },
        {
          date: 'Yesterday',
          type: 'reading',
          description: 'Read Chapter 3',
          bookTitle: 'Pride and Prejudice'
        },
        {
          date: '3 days ago',
          type: 'completion',
          description: 'Completed book',
          bookTitle: 'Romeo and Juliet'
        }
      ]);
    } catch (error) {
      console.error('Error loading dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  const getLevelColor = (level: string) => {
    switch (level) {
      case 'A1':
      case 'A2':
        return '#10b981';
      case 'B1':
      case 'B2':
        return '#3b82f6';
      case 'C1':
      case 'C2':
        return '#8b5cf6';
      default:
        return '#6b7280';
    }
  };

  const getActivityIcon = (type: string) => {
    switch (type) {
      case 'vocabulary': return '📖';
      case 'reading': return '📚';
      case 'completion': return '🎉';
      default: return '📝';
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{
        background: 'linear-gradient(135deg, #1a1a2e 0%, #16213e 50%, #0f1419 100%)'
      }}>
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
          style={{
            width: '48px',
            height: '48px',
            borderRadius: '50%',
            border: '3px solid #e2e8f0',
            borderTop: '3px solid #667eea'
          }}
        />
      </div>
    );
  }

  return (
    <div className="min-h-screen" style={{
      background: 'linear-gradient(135deg, #1a1a2e 0%, #16213e 50%, #0f1419 100%)',
      backgroundAttachment: 'fixed'
    }}>
      {/* Header */}
      <motion.div
        initial={{ y: -20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        style={{
          background: 'rgba(26, 32, 44, 0.95)',
          backdropFilter: 'blur(20px)',
          borderBottom: '1px solid rgba(102, 126, 234, 0.2)',
          padding: '24px'
        }}
      >
        <div className="max-w-6xl mx-auto">
          <div className="flex items-center justify-between">
            <div>
              <h1 style={{
                fontSize: '28px',
                fontWeight: '700',
                color: '#f7fafc',
                marginBottom: '8px'
              }}>
                ESL Learning Dashboard
              </h1>
              <p style={{
                fontSize: '14px',
                color: '#a0aec0'
              }}>
                Track your English learning progress
              </p>
            </div>
            
            <button
              onClick={() => router.push('/library')}
              style={{
                padding: '10px 20px',
                background: 'rgba(45, 55, 72, 0.8)',
                border: '2px solid rgba(102, 126, 234, 0.3)',
                borderRadius: '12px',
                color: '#e2e8f0',
                fontSize: '14px',
                fontWeight: '600',
                cursor: 'pointer',
                transition: 'all 0.2s'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.borderColor = '#667eea';
                e.currentTarget.style.backgroundColor = 'rgba(102, 126, 234, 0.1)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.borderColor = 'rgba(102, 126, 234, 0.3)';
                e.currentTarget.style.backgroundColor = 'rgba(45, 55, 72, 0.8)';
              }}
            >
              Back to Library
            </button>
          </div>
        </div>
      </motion.div>

      <div className="max-w-6xl mx-auto px-6 py-8">
        {/* Current Level Card */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          style={{
            background: 'rgba(26, 32, 44, 0.8)',
            backdropFilter: 'blur(20px)',
            borderRadius: '20px',
            padding: '24px',
            marginBottom: '24px',
            border: `2px solid ${getLevelColor(stats.currentLevel)}40`,
            boxShadow: `0 8px 32px rgba(0, 0, 0, 0.4), 0 0 40px ${getLevelColor(stats.currentLevel)}20`
          }}
        >
          <div className="flex items-center justify-between">
            <div>
              <p style={{ color: '#a0aec0', fontSize: '14px', marginBottom: '8px' }}>
                Current CEFR Level
              </p>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <h2 style={{
                  fontSize: '36px',
                  fontWeight: '700',
                  color: getLevelColor(stats.currentLevel)
                }}>
                  {stats.currentLevel}
                </h2>
                <span style={{
                  padding: '4px 12px',
                  background: `${getLevelColor(stats.currentLevel)}20`,
                  border: `1px solid ${getLevelColor(stats.currentLevel)}40`,
                  borderRadius: '8px',
                  color: getLevelColor(stats.currentLevel),
                  fontSize: '14px',
                  fontWeight: '600'
                }}>
                  Upper Intermediate
                </span>
              </div>
              {nativeLanguage && (
                <p style={{ color: '#718096', fontSize: '13px', marginTop: '8px' }}>
                  Native Language: {nativeLanguage}
                </p>
              )}
            </div>
            
            <div style={{
              width: '120px',
              height: '120px',
              borderRadius: '50%',
              background: `conic-gradient(${getLevelColor(stats.currentLevel)} 0deg ${stats.comprehensionScore * 3.6}deg, rgba(45, 55, 72, 0.4) ${stats.comprehensionScore * 3.6}deg)`,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              position: 'relative'
            }}>
              <div style={{
                width: '100px',
                height: '100px',
                borderRadius: '50%',
                background: 'rgba(26, 32, 44, 0.95)',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center'
              }}>
                <span style={{
                  fontSize: '24px',
                  fontWeight: '700',
                  color: '#e2e8f0'
                }}>
                  {stats.comprehensionScore}%
                </span>
                <span style={{
                  fontSize: '11px',
                  color: '#a0aec0'
                }}>
                  Comprehension
                </span>
              </div>
            </div>
          </div>
        </motion.div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          {/* Words Learned */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            style={{
              background: 'rgba(26, 32, 44, 0.8)',
              backdropFilter: 'blur(20px)',
              borderRadius: '16px',
              padding: '20px',
              border: '1px solid rgba(102, 126, 234, 0.2)'
            }}
          >
            <div className="flex items-center justify-between mb-3">
              <span style={{ fontSize: '24px' }}>📚</span>
              <span style={{
                fontSize: '12px',
                padding: '2px 8px',
                background: 'rgba(16, 185, 129, 0.2)',
                borderRadius: '4px',
                color: '#10b981'
              }}>
                +{stats.vocabularyGrowth}% this week
              </span>
            </div>
            <h3 style={{
              fontSize: '32px',
              fontWeight: '700',
              color: '#f7fafc',
              marginBottom: '4px'
            }}>
              {stats.totalWordsLearned}
            </h3>
            <p style={{
              fontSize: '14px',
              color: '#a0aec0'
            }}>
              Words Learned
            </p>
          </motion.div>

          {/* Books Completed */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            style={{
              background: 'rgba(26, 32, 44, 0.8)',
              backdropFilter: 'blur(20px)',
              borderRadius: '16px',
              padding: '20px',
              border: '1px solid rgba(102, 126, 234, 0.2)'
            }}
          >
            <div className="flex items-center justify-between mb-3">
              <span style={{ fontSize: '24px' }}>📖</span>
              <span style={{
                fontSize: '12px',
                padding: '2px 8px',
                background: 'rgba(59, 130, 246, 0.2)',
                borderRadius: '4px',
                color: '#3b82f6'
              }}>
                Level {stats.currentLevel}
              </span>
            </div>
            <h3 style={{
              fontSize: '32px',
              fontWeight: '700',
              color: '#f7fafc',
              marginBottom: '4px'
            }}>
              {stats.booksCompleted}
            </h3>
            <p style={{
              fontSize: '14px',
              color: '#a0aec0'
            }}>
              Books Completed
            </p>
          </motion.div>

          {/* Reading Streak */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
            style={{
              background: 'rgba(26, 32, 44, 0.8)',
              backdropFilter: 'blur(20px)',
              borderRadius: '16px',
              padding: '20px',
              border: '1px solid rgba(102, 126, 234, 0.2)'
            }}
          >
            <div className="flex items-center justify-between mb-3">
              <span style={{ fontSize: '24px' }}>🔥</span>
              <span style={{
                fontSize: '12px',
                padding: '2px 8px',
                background: 'rgba(245, 158, 11, 0.2)',
                borderRadius: '4px',
                color: '#f59e0b'
              }}>
                Active
              </span>
            </div>
            <h3 style={{
              fontSize: '32px',
              fontWeight: '700',
              color: '#f7fafc',
              marginBottom: '4px'
            }}>
              {stats.readingStreak}
            </h3>
            <p style={{
              fontSize: '14px',
              color: '#a0aec0'
            }}>
              Day Streak
            </p>
          </motion.div>
        </div>

        {/* Recent Activity */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
          style={{
            background: 'rgba(26, 32, 44, 0.8)',
            backdropFilter: 'blur(20px)',
            borderRadius: '20px',
            padding: '24px',
            border: '1px solid rgba(102, 126, 234, 0.2)'
          }}
        >
          <h3 style={{
            fontSize: '20px',
            fontWeight: '600',
            color: '#f7fafc',
            marginBottom: '20px'
          }}>
            Recent Activity
          </h3>
          
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {recentActivity.map((activity, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.6 + index * 0.1 }}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '16px',
                  padding: '16px',
                  background: 'rgba(45, 55, 72, 0.4)',
                  borderRadius: '12px',
                  borderLeft: '3px solid #667eea'
                }}
              >
                <span style={{ fontSize: '24px' }}>
                  {getActivityIcon(activity.type)}
                </span>
                <div style={{ flex: 1 }}>
                  <p style={{
                    fontSize: '14px',
                    color: '#e2e8f0',
                    marginBottom: '4px'
                  }}>
                    {activity.description}
                  </p>
                  {activity.bookTitle && (
                    <p style={{
                      fontSize: '12px',
                      color: '#a0aec0'
                    }}>
                      {activity.bookTitle}
                    </p>
                  )}
                </div>
                <span style={{
                  fontSize: '12px',
                  color: '#718096'
                }}>
                  {activity.date}
                </span>
              </motion.div>
            ))}
          </div>
        </motion.div>

        {/* Progress Tips */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.8 }}
          style={{
            marginTop: '24px',
            padding: '20px',
            background: 'linear-gradient(135deg, rgba(102, 126, 234, 0.1) 0%, rgba(118, 75, 162, 0.1) 100%)',
            borderRadius: '16px',
            border: '1px solid rgba(102, 126, 234, 0.3)'
          }}
        >
          <p style={{
            fontSize: '14px',
            color: '#a78bfa',
            textAlign: 'center'
          }}>
            💡 <strong>Tip:</strong> Reading for just 15 minutes daily can improve your vocabulary by 1000+ words per year!
          </p>
        </motion.div>
      </div>
    </div>
  );
}