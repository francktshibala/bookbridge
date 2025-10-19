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
  const [currentLevel, setCurrentLevel] = useState<'A1' | 'B1' | 'original'>('A1');
  const [isPlaying, setIsPlaying] = useState(false);
  const [demoContent, setDemoContent] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [visibleSentenceStart, setVisibleSentenceStart] = useState(0);
  const [currentTime, setCurrentTime] = useState(0);
  const [currentSentenceIndex, setCurrentSentenceIndex] = useState<number>(-1);
  // Enhanced voices always enabled for premium experience
  const [showProgressiveCTA, setShowProgressiveCTA] = useState(false);
  const [audioPreloaded, setAudioPreloaded] = useState<Set<string>>(new Set());
  const [abTestVariant, setAbTestVariant] = useState<ABTestVariant>('baseline');
  const audioRef = useRef<HTMLAudioElement>(null);
  const timeUpdateRef = useRef<number | undefined>(undefined);
  const preloadCache = useRef<Map<string, HTMLAudioElement>>(new Map());

  // Progressive display settings
  const VISIBLE_SENTENCE_COUNT = 3;

  // Initialize A/B test variant
  useEffect(() => {
    const variant = getABTestVariant();
    setAbTestVariant(variant);

    // Enhanced voices enabled by default for all variants
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
        // Fallback to static content
        setDemoContent(staticDemoContent);

        trackDemoEvent('demo_impression', {
          demo_type: 'hero_interactive_reading',
          content_loaded: false,
          fallback_used: true
        });
      } finally {
        setIsLoading(false);
      }
    };

    loadDemoContent();
  }, []);

  // Performance optimization: Preload audio files lazily
  const preloadAudio = useCallback((audioUrl: string) => {
    if (audioPreloaded.has(audioUrl) || preloadCache.current.has(audioUrl)) {
      return Promise.resolve();
    }

    return new Promise<void>((resolve, reject) => {
      const audio = new Audio();
      audio.preload = 'metadata';

      const onCanPlay = () => {
        preloadCache.current.set(audioUrl, audio);
        setAudioPreloaded(prev => new Set(prev).add(audioUrl));
        audio.removeEventListener('canplaythrough', onCanPlay);
        audio.removeEventListener('error', onError);
        resolve();
      };

      const onError = () => {
        audio.removeEventListener('canplaythrough', onCanPlay);
        audio.removeEventListener('error', onError);
        reject(new Error(`Failed to preload audio: ${audioUrl}`));
      };

      audio.addEventListener('canplaythrough', onCanPlay);
      audio.addEventListener('error', onError);
      audio.src = audioUrl;
    });
  }, [audioPreloaded]);

  // Preload current and adjacent audio files on demo impression
  useEffect(() => {
    if (!demoContent) return;

    const preloadCurrentAndAdjacent = async () => {
      const levels = ['A1', 'B1', 'original'] as const;
      const voiceMap = { 'A1': 'daniel', 'B1': 'sarah', 'original': 'daniel' };

      // Preload current level first (priority) - always enhanced
      const currentVoice = voiceMap[currentLevel];
      const currentUrls = [
        `/audio/demo/pride-prejudice-${currentLevel.toLowerCase()}-${currentVoice}-enhanced.mp3`
      ];

      for (const url of currentUrls) {
        try {
          await preloadAudio(url);
        } catch (error) {
          console.warn('Failed to preload current audio:', error);
        }
      }

      // Preload other levels in background (lower priority)
      setTimeout(async () => {
        for (const level of levels) {
          if (level === currentLevel) continue;

          const voice = voiceMap[level];
          const urls = [
            `/audio/demo/pride-prejudice-${level.toLowerCase()}-${voice}-enhanced.mp3`
          ];

          for (const url of urls) {
            try {
              await preloadAudio(url);
            } catch (error) {
              console.warn('Failed to preload background audio:', error);
            }
          }
        }
      }, 2000); // Delay background preloading
    };

    preloadCurrentAndAdjacent();
  }, [demoContent, currentLevel, preloadAudio]);

  // Static fallback demo content
  const staticDemoContent = {
    title: "Pride and Prejudice",
    author: "Jane Austen",
    chapter: "Chapter 1: The Invitation",
    levels: {
      A1: {
        sentences: [
          { index: 0, text: "People think that rich men who are not married want to find a wife.", wordCount: 14 },
          { index: 1, text: "When a rich man comes to a new place, families want him to marry their daughters.", wordCount: 16 }
        ]
      },
      B1: {
        sentences: [
          { index: 0, text: "Everyone knows that a rich single man must want to find a wife.", wordCount: 13 },
          { index: 1, text: "When such a man moves to a new place, the families around him believe that he should marry one of their daughters, even if they don't know anything about his feelings or opinions.", wordCount: 32 }
        ]
      },
      original: {
        sentences: [
          { index: 0, text: "It is a truth universally acknowledged, that a single man in possession of a good fortune, must be in want of a wife.", wordCount: 22 },
          { index: 1, text: "However little known the feelings or views of such a man may be on his first entering a neighbourhood, this truth is so well fixed in the minds of the surrounding families, that he is considered the rightful property of some one or other of their daughters.", wordCount: 44 }
        ]
      }
    }
  };

  // Audio playback handlers
  const handlePlayPause = () => {
    if (!audioRef.current || !demoContent) return;

    if (isPlaying) {
      audioRef.current.pause();
      setIsPlaying(false);
    } else {
      // Load correct audio for current level (dual-track: baseline/enhanced)
      const voiceMap = {
        'A1': 'daniel',     // Daniel for A1 (male voice for beginners)
        'B1': 'sarah',      // Sarah for B1 (female voice for intermediate)
        'original': 'daniel' // Daniel for Original (male voice for advanced)
      };
      const voice = voiceMap[currentLevel] || 'daniel';

      // Always use enhanced voices for premium experience (GPT-5 + post-processing)
      const audioUrl = `/audio/demo/pride-prejudice-${currentLevel.toLowerCase()}-${voice}-enhanced.mp3`;

      if (audioUrl && audioRef.current.src !== audioUrl) {
        audioRef.current.src = audioUrl;
      }

      audioRef.current.play().catch(error => {
        console.error('Audio playback failed:', error);
      });
      setIsPlaying(true);

      // Track play clicked (always enhanced)
      trackDemoEvent('play_clicked', {
        level: currentLevel,
        voice: voiceMap[currentLevel] || 'daniel',
        enhanced_mode: true
      });
    }
  };

  const handleLevelChange = (level: 'A1' | 'B1' | 'original') => {
    // Pause current audio
    if (audioRef.current && isPlaying) {
      audioRef.current.pause();
      setIsPlaying(false);
    }

    setCurrentLevel(level);
    setVisibleSentenceStart(0); // Reset to first sentences when switching levels

    // Track level switch (always enhanced)
    trackDemoEvent('level_switch', {
      from_level: currentLevel,
      to_level: level,
      enhanced_mode: true
    });
  };

  // Progressive sentence scrolling
  const handleNextSentences = () => {
    if (!demoContent) return;
    const totalSentences = demoContent.levels[currentLevel]?.sentences?.length || 0;
    const maxStart = Math.max(0, totalSentences - VISIBLE_SENTENCE_COUNT);

    setVisibleSentenceStart(prev => Math.min(prev + 1, maxStart));
  };

  const handlePrevSentences = () => {
    setVisibleSentenceStart(prev => Math.max(prev - 1, 0));
  };

  // Calculate sentence-level timing using Solution 1 approach
  const calculateSentenceTimings = useCallback(() => {
    if (!demoContent?.levels?.[currentLevel]?.sentences) return [];

    const sentences = demoContent.levels[currentLevel].sentences;

    // Use enhanced file duration if in enhanced mode for Daniel voice
    const voiceMap = { 'A1': 'daniel', 'B1': 'sarah', 'original': 'daniel' };
    const voice = voiceMap[currentLevel] || 'daniel';

    let measuredDuration = demoContent.levels[currentLevel]?.audio?.duration || 29.152625;

    // Always use enhanced audio durations (validated with ffprobe)
    const enhancedDurations = {
      // Daniel enhanced files
      'A1': 29.388,        // A1 Daniel enhanced: 0.00% drift
      'original': 54.047,  // Original Daniel enhanced: 0.98% drift
      // Sarah enhanced files
      'B1': 47.778         // B1 Sarah enhanced: 4.28% drift
    };
    measuredDuration = enhancedDurations[currentLevel] || measuredDuration;

    // Calculate total characters for proportional distribution
    const totalChars = sentences.reduce((sum: number, sentence: any) => sum + sentence.text.length, 0);

    let currentStart = 0;
    return sentences.map((sentence: any, index: number) => {
      const sentenceChars = sentence.text.length;
      const duration = (sentenceChars / totalChars) * measuredDuration;

      const timing = {
        index,
        start: currentStart,
        end: currentStart + duration,
        duration
      };

      currentStart += duration;
      return timing;
    });
  }, [demoContent, currentLevel]);

  // Find current sentence based on audio time
  const findCurrentSentence = useCallback((time: number) => {
    const timings = calculateSentenceTimings();

    for (const timing of timings) {
      if (time >= timing.start && time <= timing.end) {
        return timing.index;
      }
    }
    return -1;
  }, [calculateSentenceTimings]);

  // Audio time tracking with sentence-level highlighting
  const updateTimeAndHighlight = useCallback(() => {
    const audio = audioRef.current;
    if (!audio || !isPlaying) return;

    const time = audio.currentTime;
    setCurrentTime(time);

    const sentenceIndex = findCurrentSentence(time);
    setCurrentSentenceIndex(sentenceIndex);

    // Progressive CTA appears at 8 seconds (engagement sweet spot)
    if (time >= 8 && !showProgressiveCTA) {
      setShowProgressiveCTA(true);

      // Track 8-second retention milestone (always enhanced)
      trackDemoEvent('retention_8s', {
        level: currentLevel,
        enhanced_mode: true,
        sentence_index: sentenceIndex,
        engagement_time: time.toFixed(1)
      });
    }

    // Track 15-second deep engagement (always enhanced)
    if (time >= 15) {
      trackDemoEvent('retention_15s', {
        level: currentLevel,
        enhanced_mode: true,
        deep_engagement: true
      });
    }

    // Auto-scroll every 8-10 seconds (progressive display)
    if (sentenceIndex >= 0) {
      const totalSentences = demoContent?.levels?.[currentLevel]?.sentences?.length || 0;

      // Calculate which group of 3 sentences should be visible based on current sentence
      const targetGroup = Math.floor(sentenceIndex / VISIBLE_SENTENCE_COUNT);
      const maxStart = Math.max(0, totalSentences - VISIBLE_SENTENCE_COUNT);
      const newStart = Math.min(targetGroup * VISIBLE_SENTENCE_COUNT, maxStart);

      if (newStart !== visibleSentenceStart && newStart >= 0) {
        setVisibleSentenceStart(newStart);
      }
    }

    timeUpdateRef.current = requestAnimationFrame(updateTimeAndHighlight);
  }, [isPlaying, findCurrentSentence, demoContent, currentLevel, visibleSentenceStart]);

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
  const visibleSentences = currentLevelData?.sentences?.slice(
    visibleSentenceStart,
    visibleSentenceStart + VISIBLE_SENTENCE_COUNT
  ) || [];

  const totalSentences = currentLevelData?.sentences?.length || 0;
  const canGoNext = visibleSentenceStart + VISIBLE_SENTENCE_COUNT < totalSentences;
  const canGoPrev = visibleSentenceStart > 0;

  // Render sentence with sentence-level highlighting
  const renderSentence = (sentence: any, sentenceIndex: number) => {
    const globalSentenceIndex = visibleSentenceStart + sentenceIndex;
    const isCurrentSentence = currentSentenceIndex === globalSentenceIndex;

    return (
      <span
        style={{
          background: isCurrentSentence ? 'var(--accent-primary)' : 'transparent',
          color: isCurrentSentence ? 'var(--bg-primary)' : 'inherit',
          padding: isCurrentSentence ? '4px 8px' : '0',
          borderRadius: isCurrentSentence ? '6px' : '0',
          transition: 'all 0.3s ease',
          fontWeight: isCurrentSentence ? '600' : 'inherit',
          boxShadow: isCurrentSentence ? '0 4px 12px rgba(var(--accent-primary-rgb), 0.4)' : 'none',
          display: 'inline-block'
        }}
      >
        {sentence.text}
      </span>
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

      {/* Text Display */}
      <div style={{
        background: 'var(--bg-primary)',
        border: '1px solid var(--accent-secondary)',
        borderRadius: '12px',
        padding: '32px',
        marginBottom: '24px',
        minHeight: '200px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center'
      }}>
        <div style={{
          fontSize: 'clamp(16px, 3.5vw, 19px)',
          lineHeight: '1.75',
          color: 'var(--text-primary)',
          textAlign: 'left',
          maxWidth: '650px',
          width: '100%',
          fontFamily: 'Source Serif Pro, serif'
        }}>
          {visibleSentences.map((sentence: any, index: number) => (
            <motion.p
              key={`${visibleSentenceStart}-${index}`}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1, duration: 0.3 }}
              style={{
                marginBottom: index < visibleSentences.length - 1 ? '18px' : '0',
                padding: '12px 20px',
                background: 'rgba(var(--accent-primary-rgb), 0.03)',
                border: '1px solid rgba(var(--accent-secondary-rgb), 0.15)',
                borderRadius: '8px',
                textAlign: 'left',
                fontSize: 'inherit',
                lineHeight: 'inherit',
                transition: 'all 0.2s ease'
              }}
            >
              {renderSentence(sentence, index)}
            </motion.p>
          ))}
        </div>

      </div>

      {/* Controls */}
      <div style={{
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        gap: '16px',
        flexWrap: 'wrap',
        marginBottom: '24px'
      }}>
        {/* Play Button - Mobile Optimized */}
        <button
          onClick={handlePlayPause}
          style={{
            background: 'linear-gradient(135deg, var(--accent-primary), var(--accent-secondary))',
            color: 'var(--bg-primary)',
            border: 'none',
            borderRadius: '12px',
            padding: 'clamp(14px, 3vw, 18px) clamp(28px, 6vw, 36px)',
            fontSize: 'clamp(16px, 4vw, 18px)',
            fontWeight: '600',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: 'clamp(6px, 2vw, 10px)',
            transition: 'all 0.2s ease',
            minHeight: '44px',
            minWidth: '120px',
            boxShadow: '0 4px 12px rgba(205, 127, 50, 0.3)',
            // Mobile touch optimization
            touchAction: 'manipulation',
            WebkitTapHighlightColor: 'transparent'
          }}
        >
          <span style={{ fontSize: '18px' }}>{isPlaying ? '⏸️' : '▶️'}</span>
          {isPlaying ? 'Pause' : 'Play'}
        </button>

        {/* Level Switcher */}
        <div style={{
          display: 'flex',
          background: 'var(--bg-secondary)',
          border: '1px solid var(--accent-secondary)',
          borderRadius: '12px',
          padding: '4px',
          gap: '4px'
        }}>
          {(['A1', 'B1', 'original'] as const).map((level) => (
            <button
              key={level}
              onClick={() => handleLevelChange(level)}
              style={{
                background: currentLevel === level ? 'var(--accent-primary)' : 'transparent',
                color: currentLevel === level ? 'var(--bg-primary)' : 'var(--text-secondary)',
                border: 'none',
                borderRadius: '8px',
                padding: 'clamp(10px, 2.5vw, 14px) clamp(16px, 4vw, 20px)',
                fontSize: 'clamp(13px, 3.5vw, 15px)',
                fontWeight: '600',
                cursor: 'pointer',
                transition: 'all 0.2s ease',
                minHeight: '44px',
                minWidth: '44px',
                // Mobile touch optimization
                touchAction: 'manipulation',
                WebkitTapHighlightColor: 'transparent'
              }}
            >
              {level === 'original' ? 'Original' : level.toUpperCase()}
            </button>
          ))}
        </div>

        {/* Enhanced voices always enabled - no toggle needed */}
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
              // Track progressive CTA click (primary conversion event, always enhanced)
              trackDemoEvent('cta_clicked', {
                cta_type: 'progressive',
                level: currentLevel,
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
              // Mobile touch optimization
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
        textAlign: 'center'
      }}>
        <button
          onClick={() => {
            // Track static CTA click (always enhanced)
            trackDemoEvent('cta_clicked', {
              cta_type: 'static',
              level: currentLevel,
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
            // Mobile touch optimization
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