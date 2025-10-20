'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { motion } from 'framer-motion';

// A/B Testing variants
type ABTestVariant = 'baseline' | 'enhanced_default' | 'emotional_hook';

const getABTestVariant = (): ABTestVariant => {
  if (typeof window === 'undefined') return 'baseline';

  // Check for URL parameter override (for testing)
  const urlParams = new URLSearchParams(window.location.search);
  const variantOverride = urlParams.get('variant') as ABTestVariant;
  if (variantOverride && ['baseline', 'enhanced_default', 'emotional_hook'].includes(variantOverride)) {
    return variantOverride;
  }

  // Persistent variant assignment based on user session
  let variant = localStorage.getItem('hero_demo_variant') as ABTestVariant;
  if (!variant || !['baseline', 'enhanced_default', 'emotional_hook'].includes(variant)) {
    // Random assignment with equal distribution
    const random = Math.random();
    if (random < 0.33) variant = 'baseline';
    else if (random < 0.66) variant = 'enhanced_default';
    else variant = 'emotional_hook';

    localStorage.setItem('hero_demo_variant', variant);
  }

  return variant;
};

// Analytics tracking for demo events
const trackDemoEvent = (eventName: string, properties: Record<string, any> = {}) => {
  const variant = typeof window !== 'undefined' ? getABTestVariant() : 'baseline';

  const eventData = {
    event: eventName,
    timestamp: new Date().toISOString(),
    ab_test_variant: variant,
    ...properties
  };

  // Log to console for development (replace with actual analytics service)
  console.log('📊 Demo Analytics:', eventData);

  // TODO: Replace with actual analytics service (Mixpanel, GA4, etc.)
  if (typeof window !== 'undefined' && (window as any).gtag) {
    (window as any).gtag('event', eventName, {
      ...properties,
      ab_test_variant: variant
    });
  }
};

interface DemoSentence {
  index: number;
  text: string;
  wordCount: number;
}

interface DemoLevel {
  text: string;
  sentences: DemoSentence[];
}

interface InteractiveReadingDemoProps {
  className?: string;
}

export function InteractiveReadingDemo({ className = '' }: InteractiveReadingDemoProps) {
  const [currentLevel, setCurrentLevel] = useState<'A1' | 'A2' | 'B1' | 'B2' | 'C1' | 'C2'>('A1');
  const [currentVoice, setCurrentVoice] = useState<'daniel' | 'sarah'>('sarah');
  const [isPlaying, setIsPlaying] = useState(false);
  const [demoContent, setDemoContent] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [currentTime, setCurrentTime] = useState(0);
  const [currentSentenceIndex, setCurrentSentenceIndex] = useState<number>(-1);
  const [showProgressiveCTA, setShowProgressiveCTA] = useState(false);
  const [audioPreloaded, setAudioPreloaded] = useState<Set<string>>(new Set());
  const [abTestVariant, setAbTestVariant] = useState<ABTestVariant>('baseline');
  const [showLevelDropdown, setShowLevelDropdown] = useState(false);
  const audioRef = useRef<HTMLAudioElement>(null);
  const timeUpdateRef = useRef<number | undefined>(undefined);
  const preloadCache = useRef<Map<string, HTMLAudioElement>>(new Map());
  const dropdownRef = useRef<HTMLDivElement>(null);

  // All CEFR levels
  const CEFR_LEVELS = ['A1', 'A2', 'B1', 'B2', 'C1', 'C2'] as const;

  // Initialize A/B test variant
  useEffect(() => {
    const variant = getABTestVariant();
    setAbTestVariant(variant);
  }, []);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setShowLevelDropdown(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Load demo content with audio metadata
  useEffect(() => {
    const loadDemoContent = async () => {
      try {
        const response = await fetch('/data/demo/pride-prejudice-demo.json');
        const content = await response.json();
        setDemoContent(content);

        // Track demo impression with A/B variant
        trackDemoEvent('demo_impression', {
          demo_type: 'hero_interactive_reading',
          content_loaded: true,
          variant: abTestVariant
        });
      } catch (error) {
        console.error('Failed to load demo content:', error);
      } finally {
        setIsLoading(false);
      }
    };

    loadDemoContent();
  }, [abTestVariant]);

  // Calculate sentence timings based on audio duration and character count
  const calculateSentenceTimings = useCallback(() => {
    if (!demoContent?.levels?.[currentLevel]?.sentences) return [];

    // Enhanced durations for all levels and voices
    const enhancedDurations: Record<string, Record<string, number>> = {
      'A1': { daniel: 29.388, sarah: 29.388 },
      'A2': { daniel: 40.620, sarah: 38.269 },
      'B1': { daniel: 47.229, sarah: 47.778 },
      'B2': { daniel: 60.865, sarah: 63.138 },
      'C1': { daniel: 71.419, sarah: 70.452 },
      'C2': { daniel: 61.048, sarah: 60.500 }
    };

    const levelDurations = enhancedDurations[currentLevel];
    let measuredDuration = levelDurations?.[currentVoice] || 40;

    const sentences = demoContent.levels[currentLevel].sentences;
    const totalCharacters = sentences.reduce((sum: number, sentence: any) => sum + sentence.text.length, 0);

    let currentTime = 0;
    return sentences.map((sentence: any, index: number) => {
      const sentenceLength = sentence.text.length;
      const proportionalDuration = (sentenceLength / totalCharacters) * measuredDuration;

      const timing = {
        start: currentTime,
        end: currentTime + proportionalDuration,
        duration: proportionalDuration,
        sentence: sentence.text,
        index
      };

      currentTime += proportionalDuration;
      return timing;
    });
  }, [demoContent, currentLevel, currentVoice]);

  // Find current sentence based on audio time
  const findCurrentSentence = useCallback((time: number) => {
    const timings = calculateSentenceTimings();
    for (let i = 0; i < timings.length; i++) {
      if (time >= timings[i].start && time <= timings[i].end) {
        return i;
      }
    }
    return -1;
  }, [calculateSentenceTimings]);

  // Handle level change
  const handleLevelChange = useCallback((newLevel: typeof currentLevel) => {
    if (newLevel === currentLevel) return;

    // Stop current playback
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
    }
    setIsPlaying(false);
    setCurrentSentenceIndex(-1);
    setCurrentTime(0);

    // Update level
    setCurrentLevel(newLevel);

    // Track level switch
    trackDemoEvent('level_switch', {
      from_level: currentLevel,
      to_level: newLevel,
      voice: currentVoice,
      enhanced_mode: true
    });

    console.log(`🔄 Level switched from ${currentLevel} to ${newLevel} with ${currentVoice} voice`);
  }, [currentLevel, currentVoice]);

  // Handle voice change
  const handleVoiceChange = useCallback((newVoice: typeof currentVoice) => {
    if (newVoice === currentVoice) return;

    // Stop current playback
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
    }
    setIsPlaying(false);
    setCurrentSentenceIndex(-1);
    setCurrentTime(0);

    // Update voice
    setCurrentVoice(newVoice);

    // Track voice switch
    trackDemoEvent('voice_switch', {
      from_voice: currentVoice,
      to_voice: newVoice,
      level: currentLevel,
      enhanced_mode: true
    });

    console.log(`🎤 Voice switched from ${currentVoice} to ${newVoice} for ${currentLevel} level`);
  }, [currentVoice, currentLevel]);

  // Preload audio files
  const preloadAudio = useCallback((audioUrl: string) => {
    if (audioPreloaded.has(audioUrl)) return;

    const audio = new Audio();
    audio.preload = 'metadata';
    audio.src = audioUrl;

    // Store in cache for instant switching
    preloadCache.current.set(audioUrl, audio);
    setAudioPreloaded(prev => new Set([...prev, audioUrl]));

    console.log(`🔄 Preloaded: ${audioUrl}`);
  }, [audioPreloaded]);

  // Load and switch audio when level or voice changes
  useEffect(() => {
    if (!demoContent || !currentLevel) return;

    // Enhanced audio URL with voice selection
    const audioUrl = `/audio/demo/pride-prejudice-${currentLevel.toLowerCase()}-${currentVoice}-enhanced.mp3`;

    if (audioRef.current) {
      audioRef.current.src = audioUrl;
      audioRef.current.load();
    }

    // Background preload other combinations after 2s delay
    setTimeout(() => {
      const voices = ['daniel', 'sarah'];
      const levels = CEFR_LEVELS;

      for (const level of levels) {
        for (const voice of voices) {
          if (level !== currentLevel || voice !== currentVoice) {
            const otherUrl = `/audio/demo/pride-prejudice-${level.toLowerCase()}-${voice}-enhanced.mp3`;
            preloadAudio(otherUrl);
          }
        }
      }
    }, 2000);

    console.log(`🎵 Audio loaded: ${audioUrl}`);
  }, [currentLevel, currentVoice, demoContent, preloadAudio, CEFR_LEVELS]);

  // Handle play/pause
  const handlePlayPause = useCallback(() => {
    if (!audioRef.current) return;

    if (isPlaying) {
      audioRef.current.pause();
      setIsPlaying(false);

      trackDemoEvent('pause_clicked', {
        level: currentLevel,
        voice: currentVoice,
        enhanced_mode: true,
        current_time: currentTime.toFixed(1)
      });
    } else {
      audioRef.current.play().catch(console.error);
      setIsPlaying(true);

      trackDemoEvent('play_clicked', {
        level: currentLevel,
        voice: currentVoice,
        enhanced_mode: true,
        current_time: currentTime.toFixed(1)
      });
    }
  }, [isPlaying, currentLevel, currentVoice, currentTime]);

  // Time update and highlighting logic
  const updateTimeAndHighlight = useCallback(() => {
    if (!audioRef.current || !isPlaying) return;

    const time = audioRef.current.currentTime;
    setCurrentTime(time);

    // Update sentence highlighting
    const newSentenceIndex = findCurrentSentence(time);
    if (newSentenceIndex !== currentSentenceIndex) {
      setCurrentSentenceIndex(newSentenceIndex);
    }

    // Progressive CTA trigger at 8 seconds
    if (time >= 8 && !showProgressiveCTA) {
      setShowProgressiveCTA(true);
      trackDemoEvent('retention_8s', {
        level: currentLevel,
        voice: currentVoice,
        enhanced_mode: true,
        engagement_time: time.toFixed(1)
      });
    }

    // Deep engagement milestone at 15 seconds
    if (time >= 15) {
      trackDemoEvent('retention_15s', {
        level: currentLevel,
        voice: currentVoice,
        enhanced_mode: true,
        engagement_time: time.toFixed(1)
      });
    }

    timeUpdateRef.current = requestAnimationFrame(updateTimeAndHighlight);
  }, [isPlaying, findCurrentSentence, currentSentenceIndex, showProgressiveCTA, currentLevel, currentVoice]);

  // Handle audio events
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    const handleEnded = () => {
      setIsPlaying(false);
      setCurrentSentenceIndex(-1);
      setCurrentTime(0);
      // Keep CTA visible after audio ends for conversion opportunity
    };

    const handlePause = () => {
      setIsPlaying(false);
      if (timeUpdateRef.current) {
        cancelAnimationFrame(timeUpdateRef.current);
      }
    };

    const handlePlay = () => {
      setIsPlaying(true);
      updateTimeAndHighlight();
    };

    const handleTimeUpdate = () => {
      setCurrentTime(audio.currentTime);
    };

    audio.addEventListener('ended', handleEnded);
    audio.addEventListener('pause', handlePause);
    audio.addEventListener('play', handlePlay);
    audio.addEventListener('timeupdate', handleTimeUpdate);

    return () => {
      audio.removeEventListener('ended', handleEnded);
      audio.removeEventListener('pause', handlePause);
      audio.removeEventListener('play', handlePlay);
      audio.removeEventListener('timeupdate', handleTimeUpdate);
      if (timeUpdateRef.current) {
        cancelAnimationFrame(timeUpdateRef.current);
      }
    };
  }, [updateTimeAndHighlight]);

  // Start time tracking when playing
  useEffect(() => {
    if (isPlaying) {
      updateTimeAndHighlight();
    } else if (timeUpdateRef.current) {
      cancelAnimationFrame(timeUpdateRef.current);
    }

    return () => {
      if (timeUpdateRef.current) {
        cancelAnimationFrame(timeUpdateRef.current);
      }
    };
  }, [isPlaying, updateTimeAndHighlight]);

  if (isLoading) {
    return (
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className={`interactive-reading-demo ${className}`}
        style={{
          background: 'linear-gradient(135deg, var(--bg-primary), var(--bg-secondary))',
          border: '2px solid var(--accent-secondary)',
          borderRadius: '16px',
          padding: 'clamp(16px, 4vw, 32px)',
          margin: 'clamp(16px, 4vw, 32px) auto',
          maxWidth: '800px',
          textAlign: 'center',
          minHeight: '400px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center'
        }}
      >
        <div style={{
          fontSize: 'clamp(16px, 4vw, 18px)',
          color: 'var(--text-secondary)',
          fontFamily: 'Source Serif Pro, serif'
        }}>
          Loading interactive demo...
        </div>
      </motion.div>
    );
  }

  if (!demoContent) {
    return (
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className={`interactive-reading-demo ${className}`}
        style={{
          background: 'linear-gradient(135deg, var(--bg-primary), var(--bg-secondary))',
          border: '2px solid var(--accent-secondary)',
          borderRadius: '16px',
          padding: 'clamp(16px, 4vw, 32px)',
          margin: 'clamp(16px, 4vw, 32px) auto',
          maxWidth: '800px',
          textAlign: 'center'
        }}
      >
        <div style={{
          fontSize: 'clamp(16px, 4vw, 18px)',
          color: 'var(--text-primary)'
        }}>
          Demo content unavailable
        </div>
      </motion.div>
    );
  }

  const currentLevelData = demoContent.levels[currentLevel];
  const allSentences = currentLevelData?.sentences || [];
  const fullText = currentLevelData?.text || '';

  // Render continuous text with sentence highlighting (like reading page)
  const renderContinuousText = () => {
    return (
      <div style={{
        fontSize: 'clamp(16px, 3.5vw, 19px)',
        lineHeight: '1.8',
        color: 'var(--text-primary)',
        textAlign: 'left',
        fontFamily: 'Source Serif Pro, serif',
        maxHeight: '400px',
        overflowY: 'auto',
        padding: '8px 0'
      }}>
        {allSentences.map((sentence: any, index: number) => {
          const isCurrentSentence = currentSentenceIndex === index;
          return (
            <span
              key={index}
              style={{
                background: isCurrentSentence ? 'var(--accent-primary)' : 'transparent',
                color: isCurrentSentence ? 'var(--bg-primary)' : 'inherit',
                padding: isCurrentSentence ? '2px 6px' : '0',
                borderRadius: isCurrentSentence ? '4px' : '0',
                transition: 'all 0.3s ease',
                fontWeight: isCurrentSentence ? '600' : 'inherit'
              }}
            >
              {sentence.text}
              {index < allSentences.length - 1 ? ' ' : ''}
            </span>
          );
        })}
      </div>
    );
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6 }}
      className={`interactive-reading-demo ${className}`}
      style={{
        background: 'linear-gradient(135deg, var(--bg-primary), var(--bg-secondary))',
        border: '2px solid var(--accent-secondary)',
        borderRadius: '16px',
        padding: 'clamp(16px, 4vw, 32px)',
        margin: 'clamp(16px, 4vw, 32px) auto',
        maxWidth: '800px',
        boxShadow: '0 8px 32px rgba(205, 127, 50, 0.15)',
        position: 'relative'
      }}
    >
      {/* Header - A/B Test Variants */}
      <div style={{ textAlign: 'center', marginBottom: '32px' }}>
        <h2 style={{
          fontSize: 'clamp(20px, 5vw, 28px)',
          fontWeight: '700',
          color: 'var(--text-accent)',
          marginBottom: '8px',
          fontFamily: 'Playfair Display, serif'
        }}>
          {abTestVariant === 'emotional_hook'
            ? "❤️ Fall in love with English through timeless stories"
            : abTestVariant === 'enhanced_default'
            ? "🎨 Experience premium AI-enhanced storytelling"
            : "📖 Hear and see how English becomes easier"
          }
        </h2>
        <p style={{
          fontSize: '16px',
          color: 'var(--text-secondary)',
          margin: '0'
        }}>
          {abTestVariant === 'emotional_hook'
            ? "Start your journey with Jane Austen's masterpiece"
            : `${demoContent.title} by ${demoContent.author}`
          }
        </p>
      </div>

      {/* Text Display - Single Scrollable Container */}
      <div style={{
        background: 'var(--bg-primary)',
        border: '1px solid var(--accent-secondary)',
        borderRadius: '12px',
        padding: '32px',
        marginBottom: '24px',
        minHeight: '300px',
        maxWidth: '100%'
      }}>
        {renderContinuousText()}
      </div>

      {/* Unified Control Bar - Play + Aa Selector */}
      <div
        className="control-bar"
        style={{
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          gap: '12px',
          marginBottom: '24px',
          background: 'rgba(var(--bg-secondary-rgb), 0.8)',
          backdropFilter: 'blur(10px)',
          border: '1px solid var(--accent-secondary)',
          borderRadius: '16px',
          padding: '12px 20px',
          position: 'relative'
        }}
      >
        {/* Play Button */}
        <button
          onClick={handlePlayPause}
          style={{
            background: 'linear-gradient(135deg, var(--accent-primary), var(--accent-secondary))',
            color: 'var(--bg-primary)',
            border: 'none',
            borderRadius: '12px',
            padding: '14px 24px',
            fontSize: '16px',
            fontWeight: '600',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            transition: 'all 0.2s ease',
            minHeight: '44px',
            minWidth: '100px',
            boxShadow: '0 4px 12px rgba(205, 127, 50, 0.3)',
            touchAction: 'manipulation',
            WebkitTapHighlightColor: 'transparent'
          }}
        >
          <span style={{ fontSize: '18px' }}>{isPlaying ? '⏸️' : '▶️'}</span>
          {isPlaying ? 'Pause' : 'Play'}
        </button>

        {/* Aa Level Selector Dropdown */}
        <div
          ref={dropdownRef}
          style={{ position: 'relative' }}
        >
          <button
            onClick={() => setShowLevelDropdown(!showLevelDropdown)}
            style={{
              background: 'var(--bg-primary)',
              color: 'var(--text-primary)',
              border: '1px solid var(--accent-secondary)',
              borderRadius: '12px',
              padding: '14px 20px',
              fontSize: '16px',
              fontWeight: '600',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              transition: 'all 0.2s ease',
              minHeight: '44px',
              minWidth: '80px',
              touchAction: 'manipulation',
              WebkitTapHighlightColor: 'transparent'
            }}
          >
            <span style={{ fontSize: '18px' }}>Aa</span>
            <span style={{ fontSize: '14px', opacity: 0.7 }}>{currentLevel}</span>
            <span style={{
              fontSize: '12px',
              transform: showLevelDropdown ? 'rotate(180deg)' : 'rotate(0deg)',
              transition: 'transform 0.2s ease'
            }}>▼</span>
          </button>

          {/* Dropdown Menu */}
          {showLevelDropdown && (
            <motion.div
              initial={{ opacity: 0, y: -10, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              transition={{ duration: 0.2 }}
              style={{
                position: 'absolute',
                top: '100%',
                left: '0',
                right: '0',
                background: 'var(--bg-primary)',
                border: '1px solid var(--accent-secondary)',
                borderRadius: '12px',
                padding: '8px',
                marginTop: '4px',
                boxShadow: '0 8px 24px rgba(0, 0, 0, 0.15)',
                zIndex: 1000,
                minWidth: '200px'
              }}
            >
              <div style={{
                fontSize: '14px',
                fontWeight: '600',
                color: 'var(--text-secondary)',
                padding: '8px 12px',
                borderBottom: '1px solid var(--accent-secondary)',
                marginBottom: '4px'
              }}>
                Reading Level
              </div>

              {CEFR_LEVELS.map((level) => (
                <button
                  key={level}
                  onClick={() => {
                    handleLevelChange(level);
                    setShowLevelDropdown(false);
                  }}
                  style={{
                    width: '100%',
                    background: currentLevel === level ? 'var(--accent-primary)' : 'transparent',
                    color: currentLevel === level ? 'var(--bg-primary)' : 'var(--text-primary)',
                    border: 'none',
                    borderRadius: '8px',
                    padding: '10px 12px',
                    fontSize: '15px',
                    fontWeight: '500',
                    cursor: 'pointer',
                    transition: 'all 0.2s ease',
                    textAlign: 'left',
                    marginBottom: '2px',
                    touchAction: 'manipulation'
                  }}
                >
                  {level} - {level === 'A1' ? 'Beginner' : level === 'A2' ? 'Elementary' : level === 'B1' ? 'Intermediate' : level === 'B2' ? 'Upper Int.' : level === 'C1' ? 'Advanced' : 'Proficiency'}
                </button>
              ))}

              <div style={{
                fontSize: '14px',
                fontWeight: '600',
                color: 'var(--text-secondary)',
                padding: '8px 12px',
                borderTop: '1px solid var(--accent-secondary)',
                borderBottom: '1px solid var(--accent-secondary)',
                marginTop: '8px',
                marginBottom: '4px'
              }}>
                Voice
              </div>

              {(['sarah', 'daniel'] as const).map((voice) => (
                <button
                  key={voice}
                  onClick={() => {
                    handleVoiceChange(voice);
                  }}
                  style={{
                    width: '100%',
                    background: currentVoice === voice ? 'var(--accent-primary)' : 'transparent',
                    color: currentVoice === voice ? 'var(--bg-primary)' : 'var(--text-primary)',
                    border: 'none',
                    borderRadius: '8px',
                    padding: '10px 12px',
                    fontSize: '15px',
                    fontWeight: '500',
                    cursor: 'pointer',
                    transition: 'all 0.2s ease',
                    textAlign: 'left',
                    marginBottom: '2px',
                    touchAction: 'manipulation'
                  }}
                >
                  {voice === 'sarah' ? '👩 Sarah (Female)' : '👨 Daniel (Male)'}
                </button>
              ))}
            </motion.div>
          )}
        </div>
      </div>

      {/* Progressive CTA - appears at 8s */}
      {showProgressiveCTA && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, ease: "easeOut" }}
          style={{
            textAlign: 'center',
            marginBottom: '16px',
            padding: '20px',
            background: 'linear-gradient(135deg, rgba(205, 127, 50, 0.1), rgba(139, 69, 19, 0.1))',
            border: '2px solid var(--accent-primary)',
            borderRadius: '16px',
            boxShadow: '0 8px 24px rgba(205, 127, 50, 0.2)'
          }}
        >
          <div style={{
            fontSize: '18px',
            fontWeight: '600',
            color: 'var(--text-accent)',
            marginBottom: '12px',
            fontFamily: 'Playfair Display, serif'
          }}>
            🎯 Experience the full story with your perfect reading level
          </div>
          <div style={{
            fontSize: '14px',
            color: 'var(--text-secondary)',
            marginBottom: '16px',
            lineHeight: '1.5'
          }}>
            Join thousands learning English through classic literature
          </div>
          <button
            onClick={() => {
              // Track progressive CTA click (primary conversion event)
              trackDemoEvent('cta_clicked', {
                cta_type: 'progressive',
                level: currentLevel,
                voice: currentVoice,
                enhanced_mode: true,
                engagement_time: currentTime.toFixed(1),
                destination: 'start_reading'
              });

              // TODO: Navigate to sign-up or reading page
              console.log('🎯 Progressive CTA clicked - redirecting to sign-up');
            }}
            style={{
              background: 'linear-gradient(135deg, var(--accent-primary), var(--accent-secondary))',
              color: 'var(--bg-primary)',
              border: 'none',
              borderRadius: '12px',
              padding: 'clamp(14px, 3.5vw, 18px) clamp(24px, 6vw, 32px)',
              fontSize: 'clamp(15px, 4vw, 18px)',
              fontWeight: '600',
              cursor: 'pointer',
              transition: 'all 0.2s ease',
              boxShadow: '0 4px 16px rgba(205, 127, 50, 0.4)',
              transform: 'translateY(0)',
              minHeight: '48px',
              minWidth: '200px',
              touchAction: 'manipulation',
              WebkitTapHighlightColor: 'transparent'
            }}
            onMouseEnter={(e) => {
              (e.target as HTMLElement).style.transform = 'translateY(-2px)';
              (e.target as HTMLElement).style.boxShadow = '0 6px 20px rgba(205, 127, 50, 0.5)';
            }}
            onMouseLeave={(e) => {
              (e.target as HTMLElement).style.transform = 'translateY(0)';
              (e.target as HTMLElement).style.boxShadow = '0 4px 16px rgba(205, 127, 50, 0.4)';
            }}
          >
            📚 Start Reading Now - Free
          </button>
        </motion.div>
      )}

      {/* Static CTA - always visible */}
      <div style={{
        textAlign: 'center',
        paddingBottom: window.innerWidth <= 768 ? '80px' : '0' // Account for sticky controls on mobile
      }}>
        <button
          onClick={() => {
            // Track static CTA click
            trackDemoEvent('cta_clicked', {
              cta_type: 'static',
              level: currentLevel,
              voice: currentVoice,
              enhanced_mode: true,
              engagement_time: currentTime.toFixed(1),
              destination: 'browse_library'
            });

            // TODO: Navigate to library page
            console.log('📖 Browse Library clicked');
          }}
          style={{
            background: 'transparent',
            color: 'var(--text-accent)',
            border: '2px solid var(--accent-secondary)',
            borderRadius: '12px',
            padding: 'clamp(12px, 3vw, 16px) clamp(20px, 5vw, 28px)',
            fontSize: 'clamp(14px, 3.5vw, 17px)',
            fontWeight: '600',
            cursor: 'pointer',
            transition: 'all 0.2s ease',
            minHeight: '44px',
            minWidth: '140px',
            touchAction: 'manipulation',
            WebkitTapHighlightColor: 'transparent'
          }}
        >
          📖 Browse Library
        </button>
      </div>

      {/* Hidden Audio Element */}
      <audio
        ref={audioRef}
        preload="metadata"
        style={{ display: 'none' }}
      />
    </motion.div>
  );
}