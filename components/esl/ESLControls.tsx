'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { createClient } from '@/lib/supabase/client';

interface ESLControlsProps {
  userId?: string;
  onESLModeChange?: (enabled: boolean, level?: string) => void;
  variant?: 'floating' | 'inline';
}

export function ESLControls({ userId, onESLModeChange, variant = 'floating' }: ESLControlsProps) {
  const [eslEnabled, setESLEnabled] = useState(false);
  const [userESLLevel, setUserESLLevel] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [showLevelInfo, setShowLevelInfo] = useState(false);

  // DEBUG: Log when component mounts
  useEffect(() => {
    console.log('🔍 ESL CONTROLS MOUNTED:', { userId, variant });
  }, []);

  // DEBUG: Log state changes
  useEffect(() => {
    console.log('🔍 ESL STATE CHANGE:', { eslEnabled, userESLLevel, isLoading });
  }, [eslEnabled, userESLLevel, isLoading]);

  useEffect(() => {
    // Load ESL preference from localStorage
    const savedESLMode = localStorage.getItem('esl-mode-enabled');
    if (savedESLMode === 'true') {
      setESLEnabled(true);
    }

    // Fetch user's ESL profile
    fetchUserESLProfile();
  }, [userId]);

  const fetchUserESLProfile = async () => {
    try {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      
      if (user) {
        // Fetch user's ESL data from the users table
        const { data, error } = await supabase
          .from('users')
          .select('esl_level, native_language, learning_goals')
          .eq('id', user.id)
          .single();

        if (data && data.esl_level) {
          setUserESLLevel(data.esl_level);
        }
      }
    } catch (error) {
      console.error('Error fetching ESL profile:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const toggleESLMode = () => {
    const newState = !eslEnabled;
    setESLEnabled(newState);
    localStorage.setItem('esl-mode-enabled', newState.toString());
    
    if (onESLModeChange) {
      onESLModeChange(newState, userESLLevel || undefined);
    }
  };

  const getLevelColor = (level: string) => {
    switch (level) {
      case 'A1':
      case 'A2':
        return '#10b981'; // Green for beginners
      case 'B1':
      case 'B2':
        return '#3b82f6'; // Blue for intermediate
      case 'C1':
      case 'C2':
        return '#8b5cf6'; // Purple for advanced
      default:
        return '#6b7280'; // Gray for unknown
    }
  };

  const getLevelDescription = (level: string) => {
    const descriptions: Record<string, string> = {
      'A1': 'Beginner - Basic phrases and expressions',
      'A2': 'Elementary - Simple everyday language',
      'B1': 'Intermediate - Can understand main points',
      'B2': 'Upper Intermediate - Can understand complex texts',
      'C1': 'Advanced - Can understand demanding texts',
      'C2': 'Proficient - Near-native understanding'
    };
    return descriptions[level] || 'Custom learning level';
  };

  if (isLoading) {
    return null;
  }

  // Don't show controls if user doesn't have an ESL profile
  if (!userESLLevel) {
    return null;
  }

  if (variant === 'inline') {
    return (
      <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: '12px',
        padding: '8px 16px',
        background: 'rgba(45, 55, 72, 0.8)',
        borderRadius: '12px',
        border: '1px solid rgba(102, 126, 234, 0.2)'
      }}>
        <button
          onClick={toggleESLMode}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            padding: '6px 12px',
            background: eslEnabled ? 
              'linear-gradient(135deg, #10b981 0%, #059669 100%)' : 
              'rgba(107, 114, 128, 0.3)',
            color: 'white',
            border: 'none',
            borderRadius: '8px',
            fontSize: '14px',
            fontWeight: '600',
            cursor: 'pointer',
            transition: 'all 0.2s ease'
          }}
        >
          <span>{eslEnabled ? '📚' : '📖'}</span>
          <span>ESL Mode</span>
        </button>

        {eslEnabled && userESLLevel && (
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            padding: '6px 12px',
            background: `${getLevelColor(userESLLevel)}20`,
            border: `2px solid ${getLevelColor(userESLLevel)}`,
            borderRadius: '8px',
            color: getLevelColor(userESLLevel),
            fontSize: '14px',
            fontWeight: '600'
          }}>
            <span>Level {userESLLevel}</span>
          </div>
        )}
      </div>
    );
  }

  // Floating variant (default)
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      style={{
        position: 'fixed',
        bottom: '80px',
        right: '24px',
        zIndex: 50
      }}
    >
      <div style={{
        background: 'rgba(26, 32, 44, 0.95)',
        backdropFilter: 'blur(20px)',
        borderRadius: '16px',
        padding: '16px',
        boxShadow: '0 8px 32px rgba(0, 0, 0, 0.4)',
        border: '1px solid rgba(102, 126, 234, 0.2)',
        minWidth: '200px'
      }}>
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: eslEnabled ? '12px' : '0'
        }}>
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px'
          }}>
            <span style={{ fontSize: '18px' }}>{eslEnabled ? '📚' : '📖'}</span>
            <span style={{
              fontSize: '16px',
              fontWeight: '600',
              color: '#e2e8f0'
            }}>
              ESL Mode
            </span>
          </div>

          <button
            onClick={toggleESLMode}
            style={{
              width: '48px',
              height: '24px',
              borderRadius: '12px',
              background: eslEnabled ? 
                'linear-gradient(135deg, #10b981 0%, #059669 100%)' : 
                'rgba(107, 114, 128, 0.3)',
              border: 'none',
              cursor: 'pointer',
              position: 'relative',
              transition: 'background 0.3s ease'
            }}
          >
            <motion.div
              animate={{ x: eslEnabled ? 24 : 0 }}
              transition={{ type: 'spring', stiffness: 500, damping: 30 }}
              style={{
                position: 'absolute',
                top: '2px',
                left: '2px',
                width: '20px',
                height: '20px',
                borderRadius: '10px',
                background: 'white',
                boxShadow: '0 2px 4px rgba(0, 0, 0, 0.2)'
              }}
            />
          </button>
        </div>

        <AnimatePresence>
          {eslEnabled && userESLLevel && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.2 }}
            >
              <div 
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  padding: '8px 12px',
                  background: `${getLevelColor(userESLLevel)}20`,
                  border: `2px solid ${getLevelColor(userESLLevel)}`,
                  borderRadius: '10px',
                  cursor: 'pointer'
                }}
                onClick={() => setShowLevelInfo(!showLevelInfo)}
              >
                <div style={{
                  width: '8px',
                  height: '8px',
                  borderRadius: '50%',
                  background: getLevelColor(userESLLevel),
                  animation: 'pulse 2s infinite'
                }} />
                <span style={{
                  color: getLevelColor(userESLLevel),
                  fontSize: '14px',
                  fontWeight: '600'
                }}>
                  CEFR Level {userESLLevel}
                </span>
                <span style={{
                  marginLeft: 'auto',
                  fontSize: '12px',
                  opacity: 0.8
                }}>
                  {showLevelInfo ? '▼' : '▶'}
                </span>
              </div>

              <AnimatePresence>
                {showLevelInfo && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    style={{
                      marginTop: '8px',
                      padding: '8px 12px',
                      background: 'rgba(45, 55, 72, 0.6)',
                      borderRadius: '8px',
                      fontSize: '12px',
                      color: '#cbd5e0',
                      lineHeight: '1.5'
                    }}
                  >
                    {getLevelDescription(userESLLevel)}
                  </motion.div>
                )}
              </AnimatePresence>

              <div style={{
                marginTop: '12px',
                padding: '8px',
                background: 'rgba(45, 55, 72, 0.4)',
                borderRadius: '8px',
                fontSize: '12px',
                color: '#a0aec0',
                textAlign: 'center'
              }}>
                Content will be adapted to your level
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <style jsx>{`
        @keyframes pulse {
          0% {
            box-shadow: 0 0 0 0 currentColor;
          }
          70% {
            box-shadow: 0 0 0 6px transparent;
          }
          100% {
            box-shadow: 0 0 0 0 transparent;
          }
        }
      `}</style>
    </motion.div>
  );
}