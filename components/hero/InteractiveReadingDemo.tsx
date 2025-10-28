'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { motion } from 'framer-motion';
import {
  type DemoVoiceId,
  type CEFRLevel,
  DEMO_VOICES,
  LEVEL_TO_VOICES,
  getVoiceFor,
  getVoicesForLevel,
  getVoicesByGender
} from '@/lib/config/demo-voices';

// Feature flags for gradual deployment
const isDemoEnabled = process.env.NEXT_PUBLIC_ENABLE_HERO_DEMO === 'true';
const isAudioEnabled = process.env.NEXT_PUBLIC_ENABLE_HERO_AUDIO === 'true';
const isHighlightingEnabled = process.env.NEXT_PUBLIC_ENABLE_HERO_HIGHLIGHTING === 'true';
const isMobileControlsEnabled = process.env.NEXT_PUBLIC_ENABLE_HERO_MOBILE_CONTROLS === 'true';
const isAnalyticsEnabled = process.env.NEXT_PUBLIC_ENABLE_HERO_ANALYTICS === 'true';

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
  if (!isAnalyticsEnabled) return;

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
  // Early return if demo is disabled
  if (!isDemoEnabled) {
    return null;
  }
  const [currentLevel, setCurrentLevel] = useState<CEFRLevel>('A1');
  const [currentVoice, setCurrentVoice] = useState<DemoVoiceId>('sarah');
  const [isPlaying, setIsPlaying] = useState(false);
  const [demoContent, setDemoContent] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [currentTime, setCurrentTime] = useState(0);
  const [currentSentenceIndex, setCurrentSentenceIndex] = useState<number>(-1);
  const [showProgressiveCTA, setShowProgressiveCTA] = useState(false);
  const [audioPreloaded, setAudioPreloaded] = useState<Set<string>>(new Set());
  const [abTestVariant, setAbTestVariant] = useState<ABTestVariant>('baseline');
  const [showLevelDropdown, setShowLevelDropdown] = useState(false);
  const [showSettingsModal, setShowSettingsModal] = useState(false);
  const [dropdownTab, setDropdownTab] = useState<'level' | 'voice'>('level');
  const [voiceGenderTab, setVoiceGenderTab] = useState<'female' | 'male'>('female');
  const [isMobile, setIsMobile] = useState(false);
  const audioRef = useRef<HTMLAudioElement>(null);
  const timeUpdateRef = useRef<number | undefined>(undefined);
  const preloadCache = useRef<Map<string, HTMLAudioElement>>(new Map());
  const dropdownRef = useRef<HTMLDivElement>(null);
  const textContainerRef = useRef<HTMLDivElement>(null);

  // All CEFR levels including Original
  const CEFR_LEVELS: CEFRLevel[] = ['A1', 'A2', 'B1', 'B2', 'C1', 'C2', 'Original'];

  // Initialize A/B test variant and mobile detection
  useEffect(() => {
    const variant = getABTestVariant();
    setAbTestVariant(variant);

    // Mobile detection
    const checkMobile = () => {
      setIsMobile(window.innerWidth <= 768);
    };

    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
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

  // Auto-select gender tab based on current voice
  useEffect(() => {
    const currentVoiceGender = DEMO_VOICES[currentVoice].gender;
    setVoiceGenderTab(currentVoiceGender);
  }, [currentVoice]);

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
    const levelKey = currentLevel === 'Original' ? 'original' : currentLevel;
    if (!demoContent?.levels?.[levelKey]?.sentences) return [];

    // Enhanced durations for all levels and voices
    const enhancedDurations: Record<string, Record<string, number>> = {
      'A1': { daniel: 29.388, sarah: 29.388 },
      'A2': { daniel: 40.620, sarah: 38.269 },
      'B1': { daniel: 47.229, sarah: 47.778 },
      'B2': { daniel: 60.865, sarah: 63.138 },
      'C1': { daniel: 71.419, sarah: 70.452 },
      'C2': { daniel: 61.048, sarah: 60.500 },
      'Original': { daniel: 54.047, sarah: 54.047 }
    };

    const levelDurations = enhancedDurations[currentLevel];
    let measuredDuration = levelDurations?.[currentVoice] || 40;

    const sentences = demoContent.levels[levelKey].sentences;
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

    // Get current voice gender to preserve preference when switching levels
    const currentVoiceGender = DEMO_VOICES[currentVoice].gender;

    // Get the appropriate voice for the new level with same gender
    const newVoiceId = LEVEL_TO_VOICES[newLevel][currentVoiceGender];

    // Update level and voice
    setCurrentLevel(newLevel);
    setCurrentVoice(newVoiceId);

    // Track level switch
    trackDemoEvent('level_switch', {
      from_level: currentLevel,
      to_level: newLevel,
      voice: newVoiceId,
      enhanced_mode: true
    });

    console.log(`🔄 Level switched from ${currentLevel} to ${newLevel}, voice updated to ${DEMO_VOICES[newVoiceId].name} (${currentVoiceGender})`);
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
    if (!isAudioEnabled || audioPreloaded.has(audioUrl)) return;

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
    if (!demoContent || !currentLevel) {
      console.log('❌ No demo content or current level');
      return;
    }

    // Enhanced audio URL with voice selection
    const levelName = currentLevel === 'Original' ? 'original' : currentLevel.toLowerCase();
    const voiceFileId = DEMO_VOICES[currentVoice].fileId;
    const audioUrl = `/audio/demo/pride-prejudice-${levelName}-${voiceFileId}-enhanced.mp3`;

    if (audioRef.current) {
      // Only reload if the src is different to avoid interrupting playback
      const currentSrc = audioRef.current.src;
      const fullUrl = window.location.origin + audioUrl;

      console.log(`📋 Current src: ${currentSrc}`);
      console.log(`📋 Target URL: ${fullUrl}`);

      if (currentSrc !== fullUrl) {
        console.log(`🔄 Loading audio: ${audioUrl}`);
        audioRef.current.src = audioUrl;
        audioRef.current.load();
      } else {
        console.log(`✅ Audio already loaded: ${audioUrl}`);
      }

      // Add event listeners for debugging
      const handleCanPlay = () => console.log('✅ Audio can play');
      const handleCanPlayThrough = () => console.log('✅ Audio can play through');
      const handleError = (e: any) => console.error('❌ Audio error:', e);
      const handleLoadStart = () => console.log('🔄 Audio load started');
      const handleLoadedData = () => console.log('✅ Audio data loaded');

      audioRef.current.addEventListener('canplay', handleCanPlay);
      audioRef.current.addEventListener('canplaythrough', handleCanPlayThrough);
      audioRef.current.addEventListener('error', handleError);
      audioRef.current.addEventListener('loadstart', handleLoadStart);
      audioRef.current.addEventListener('loadeddata', handleLoadedData);

      // Cleanup
      const audioElement = audioRef.current;
      return () => {
        audioElement.removeEventListener('canplay', handleCanPlay);
        audioElement.removeEventListener('canplaythrough', handleCanPlayThrough);
        audioElement.removeEventListener('error', handleError);
        audioElement.removeEventListener('loadstart', handleLoadStart);
        audioElement.removeEventListener('loadeddata', handleLoadedData);
      };
    }

    // Background preload other combinations after 2s delay
    setTimeout(() => {
      const voices = ['daniel', 'sarah'];
      const levels = CEFR_LEVELS;

      for (const level of levels) {
        for (const voice of voices) {
          if (level !== currentLevel || voice !== currentVoice) {
            const otherLevelName = level === 'Original' ? 'original' : level.toLowerCase();
            const otherUrl = `/audio/demo/pride-prejudice-${otherLevelName}-${voice}-enhanced.mp3`;
            preloadAudio(otherUrl);
          }
        }
      }
    }, 2000);

    console.log(`🎵 Audio loaded: ${audioUrl}`);
  }, [currentLevel, currentVoice, demoContent, preloadAudio, CEFR_LEVELS]);

  // Handle play/pause
  const handlePlayPause = useCallback(() => {
    if (!isAudioEnabled) {
      console.log('🔇 Audio disabled by feature flag');
      return;
    }

    if (!audioRef.current) {
      console.log('❌ No audio ref available');
      return;
    }

    console.log(`🎵 Current audio src: ${audioRef.current.src}`);
    console.log(`🎵 Audio ready state: ${audioRef.current.readyState}`);
    console.log(`🎵 Audio network state: ${audioRef.current.networkState}`);

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
      console.log(`🎵 Attempting to play: ${currentLevel} ${currentVoice}`);
      // Ensure volume is set
      audioRef.current.volume = 1.0;
      audioRef.current.muted = false;

      console.log(`🔊 Audio volume: ${audioRef.current.volume}`);
      console.log(`🔇 Audio muted: ${audioRef.current.muted}`);
      console.log(`⏰ Audio duration: ${audioRef.current.duration}`);

      audioRef.current.play().then(() => {
        console.log('✅ Audio playback started successfully');
        console.log(`🎵 Current time: ${audioRef.current?.currentTime}`);
        console.log(`🎵 Paused: ${audioRef.current?.paused}`);
        setIsPlaying(true);
      }).catch((error) => {
        console.error('❌ Audio playback failed:', error);
        console.log('📝 Error details:', {
          name: error.name,
          message: error.message,
          code: error.code
        });
      });

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

    // Update sentence highlighting (only if highlighting is enabled)
    if (isHighlightingEnabled) {
      const newSentenceIndex = findCurrentSentence(time);
      if (newSentenceIndex !== currentSentenceIndex) {
        setCurrentSentenceIndex(newSentenceIndex);

        // Auto-scroll to current sentence
        if (newSentenceIndex >= 0 && textContainerRef.current) {
        const sentenceElements = textContainerRef.current.querySelectorAll('span[data-sentence-index]');
        const currentElement = sentenceElements[newSentenceIndex] as HTMLElement;
        if (currentElement) {
          // Calculate if element is in viewport
          const elementRect = currentElement.getBoundingClientRect();
          const containerRect = textContainerRef.current.getBoundingClientRect();
          const viewportHeight = window.innerHeight;

          // Check if element is below the fold or near bottom where controls are
          const isNearBottom = elementRect.bottom > viewportHeight - (isMobile ? 150 : 120);
          const isAboveView = elementRect.top < containerRect.top;

          if (isNearBottom || isAboveView) {
            currentElement.scrollIntoView({
              behavior: 'smooth',
              block: 'center',
              inline: 'nearest'
            });
          }
        }
        }
      }
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
  }, [isPlaying, findCurrentSentence, currentSentenceIndex, showProgressiveCTA, currentLevel, currentVoice, isMobile]);

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

  // Handle Original level case mapping
  const levelKey = currentLevel === 'Original' ? 'original' : currentLevel;
  const currentLevelData = demoContent.levels[levelKey];
  const allSentences = currentLevelData?.sentences || [];
  const fullText = currentLevelData?.text || '';

  // Render continuous text with sentence highlighting and paragraph rhythm
  const renderContinuousText = () => {
    const sentencesPerParagraph = 4;

    const paragraphs: React.ReactElement[] = [];
    for (let start = 0; start < allSentences.length; start += sentencesPerParagraph) {
      const end = Math.min(start + sentencesPerParagraph, allSentences.length);
      const paraSentences = [] as React.ReactElement[];
      for (let i = start; i < end; i++) {
        const sentence = allSentences[i];
        const isCurrentSentence = currentSentenceIndex === i;
        paraSentences.push(
          <React.Fragment key={i}>
            <span
              data-sentence-index={i}
              style={{
                background: isCurrentSentence ? 'var(--accent-primary)' : 'transparent',
                color: isCurrentSentence ? 'var(--bg-primary)' : 'inherit',
                padding: isCurrentSentence ? '2px 6px' : '0',
                borderRadius: isCurrentSentence ? '4px' : '0',
                transition: 'all 0.3s ease',
                fontWeight: isCurrentSentence ? '500' : '400'
              }}
            >
              {sentence.text}
            </span>
            {i < end - 1 ? ' ' : ''}
          </React.Fragment>
        );
      }

      paragraphs.push(
        <p
          key={`p-${start}`}
          style={{
            margin: start === 0 ? '0 0 20px 0' : isMobile ? '20px 0' : '24px 0'
          }}
        >
          {paraSentences}
        </p>
      );
    }

    return (
      <div
        id="book-reading-text"
        className="reading-text text-[var(--text-primary)]"
        role="main"
        aria-label="Book content"
        tabIndex={0}
      >
        <div
          data-content="true"
          className="whitespace-pre-wrap text-[var(--text-primary)]"
          style={{
            textAlign: 'justify',
            color: 'var(--text-primary)',
            fontSize: isMobile ? '22px' : '28px',
            lineHeight: '1.7',
            fontWeight: '400',
            wordSpacing: 'normal',
            hyphens: 'auto',
            overflowWrap: 'anywhere'
          }}
        >
          {paragraphs}
        </div>
      </div>
    );
  };

  return (
    <>
      <style>{`
        #book-reading-text [data-content="true"] {
          font-size: ${isMobile ? '22px' : '28px'} !important;
          line-height: 1.7 !important;
          font-weight: 400 !important;
          word-spacing: normal !important;
          text-align: justify !important;
          hyphens: auto !important;
          overflow-wrap: anywhere !important;
        }
        #book-reading-text [data-content="true"] span {
          font-size: ${isMobile ? '22px' : '28px'} !important;
          line-height: 1.7 !important;
          font-weight: 400 !important;
          word-spacing: normal !important;
          display: inline !important;
        }
      `}</style>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
      className={`interactive-reading-demo ${className}`}
      style={{
        background: 'transparent',
        border: 'none',
        borderRadius: '0',
        padding: '0',
        paddingBottom: '0',
        margin: '0 auto 0 auto',
        maxWidth: '800px',
        boxShadow: 'none',
        position: 'relative'
      }}
    >
      {/* Header - single concise heading */}
      <div style={{
        textAlign: 'center',
        marginBottom: '24px',
        padding: isMobile ? '0 16px' : '0 24px'
      }}>
        <h1 className="neo-classic-title" style={{
          fontSize: 'clamp(24px, 6vw, 40px)',
          fontWeight: 800,
          color: 'var(--text-accent)',
          margin: '0',
          lineHeight: '1.2',
          letterSpacing: '-0.02em'
        }}>
          Try Our Smart Reading Demo — Find Your Perfect Reading Level
        </h1>
      </div>

      {/* Book Title */}
      <div style={{
        textAlign: 'center',
        marginBottom: '16px',
        padding: '0 16px'
      }}>
        <h3 style={{
          fontSize: 'clamp(18px, 4vw, 24px)',
          fontWeight: '600',
          color: 'var(--text-accent)',
          margin: '0 0 4px 0',
          fontFamily: 'Playfair Display, serif'
        }}>
          {demoContent?.title}
        </h3>
        <p style={{
          fontSize: 'clamp(14px, 3vw, 16px)',
          color: 'var(--text-secondary)',
          margin: '0',
          fontStyle: 'italic'
        }}>
          by {demoContent?.author}
        </p>
        {/* Subtle divider */}
        <div style={{
          height: '1px',
          background: 'var(--border-light)',
          opacity: 0.6,
          margin: '12px auto 0 auto',
          maxWidth: '720px'
        }} />
      </div>

      {/* Text Display - Natural Flow Container */}
      <div
        ref={textContainerRef}
        style={{
          marginBottom: '32px',
          width: '100%',
          minHeight: isMobile ? '200px' : '250px',
          paddingBottom: isMobile ? '120px' : '100px',
          padding: isMobile ? '0 12px' : '0 16px',
          maxWidth: '720px',
          margin: '0 auto'
        }}
      >
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
          marginBottom: '32px',
          background: isMobile ? 'var(--bg-primary)' : 'rgba(var(--bg-primary-rgb), 0.95)',
          backdropFilter: isMobile ? 'none' : 'blur(10px)',
          border: '1px solid var(--accent-secondary)',
          borderRadius: isMobile ? '0' : '16px',
          padding: isMobile ? '16px 20px calc(16px + env(safe-area-inset-bottom))' : '12px 20px',
          position: 'fixed',
          bottom: isMobile ? '0' : '20px',
          left: isMobile ? '0' : '50%',
          right: isMobile ? '0' : 'auto',
          transform: isMobile ? 'none' : 'translateX(-50%)',
          margin: isMobile ? '0' : undefined,
          zIndex: 1000,
          boxShadow: isMobile ? '0 8px 24px rgba(0, 0, 0, 0.2)' : '0 4px 16px rgba(0, 0, 0, 0.15)'
        }}
      >
        {/* Browse Library Button */}
        <button
          onClick={() => {
            // Navigate to featured books (simplified books) page
            window.location.href = '/featured-books';
          }}
          style={{
            background: 'var(--bg-primary)',
            color: 'var(--text-primary)',
            border: '1px solid var(--accent-secondary)',
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
            touchAction: 'manipulation',
            WebkitTapHighlightColor: 'transparent'
          }}
        >
          <span style={{ fontSize: '18px' }}>📖</span>
          Library
        </button>

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
            onClick={() => isMobile ? setShowSettingsModal(true) : setShowLevelDropdown(!showLevelDropdown)}
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
              transform: showLevelDropdown ? 'rotate(0deg)' : 'rotate(180deg)',
              transition: 'transform 0.2s ease'
            }}>▲</span>
          </button>

          {/* Desktop Dropdown Menu */}
          {!isMobile && showLevelDropdown && (
            <motion.div
              initial={{ opacity: 0, y: 10, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              transition={{ duration: 0.2 }}
              style={{
                position: 'absolute',
                bottom: '100%',
                left: '0',
                right: '0',
                background: 'var(--bg-primary)',
                border: '1px solid var(--accent-secondary)',
                borderRadius: '12px',
                padding: '16px 16px 16px 16px',
                marginBottom: '8px',
                boxShadow: '0 -8px 24px rgba(0, 0, 0, 0.15)',
                zIndex: 1000,
                minWidth: '300px'
              }}
            >
              {/* Reading Levels Section */}
              <div style={{ marginBottom: '16px' }}>
                <div style={{
                  fontSize: '13px',
                  fontWeight: '600',
                  color: 'var(--text-secondary)',
                  marginBottom: '8px'
                }}>
                  Reading Level
                </div>
                <div style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(3, 1fr)',
                  gap: '8px'
                }}>
                  {CEFR_LEVELS.map((level) => (
                    <button
                      key={level}
                      onClick={() => {
                        handleLevelChange(level);
                      }}
                      style={{
                        background: currentLevel === level ? 'var(--accent-primary)' : 'transparent',
                        color: currentLevel === level ? 'var(--bg-primary)' : 'var(--text-primary)',
                        border: '1px solid var(--accent-secondary)',
                        borderRadius: '4px',
                        padding: '6px 3px',
                        fontSize: '11px',
                        fontWeight: '500',
                        cursor: 'pointer',
                        transition: 'all 0.2s ease',
                        textAlign: 'center',
                        touchAction: 'manipulation'
                      }}
                    >
                      {level}
                    </button>
                  ))}
                </div>
              </div>

              {/* Voice Selection Section */}
              <div>
                <div style={{
                  fontSize: '13px',
                  fontWeight: '600',
                  color: 'var(--text-secondary)',
                  marginBottom: '8px'
                }}>
                  Voice
                </div>

                {/* Gender Tabs */}
                <div style={{
                  display: 'flex',
                  gap: '8px',
                  marginBottom: '8px'
                }}>
                  <button
                    onClick={() => setVoiceGenderTab('female')}
                    style={{
                      flex: 1,
                      background: voiceGenderTab === 'female' ? 'var(--accent-primary)' : 'transparent',
                      color: voiceGenderTab === 'female' ? 'var(--bg-primary)' : 'var(--text-primary)',
                      border: '1px solid var(--accent-secondary)',
                      borderRadius: '4px',
                      padding: '7px 8px',
                      fontSize: '13px',
                      fontWeight: '600',
                      cursor: 'pointer',
                      transition: 'all 0.2s ease',
                      touchAction: 'manipulation'
                    }}
                  >
                    👩 Female
                  </button>
                  <button
                    onClick={() => setVoiceGenderTab('male')}
                    style={{
                      flex: 1,
                      background: voiceGenderTab === 'male' ? 'var(--accent-primary)' : 'transparent',
                      color: voiceGenderTab === 'male' ? 'var(--bg-primary)' : 'var(--text-primary)',
                      border: '1px solid var(--accent-secondary)',
                      borderRadius: '4px',
                      padding: '7px 8px',
                      fontSize: '13px',
                      fontWeight: '600',
                      cursor: 'pointer',
                      transition: 'all 0.2s ease',
                      touchAction: 'manipulation'
                    }}
                  >
                    👨 Male
                  </button>
                </div>

                {/* Voice Grid */}
                <div style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(2, 1fr)',
                  gap: '6px',
                  padding: '2px'
                }}>
                  {getVoicesByGender(voiceGenderTab).map((voice) => {
                    const voiceId = Object.keys(DEMO_VOICES).find(
                      key => DEMO_VOICES[key as DemoVoiceId].elevenLabsId === voice.elevenLabsId
                    ) as DemoVoiceId;

                    return (
                      <button
                        key={voiceId}
                        onClick={() => {
                          handleVoiceChange(voiceId);
                        }}
                        style={{
                          background: currentVoice === voiceId ? 'var(--accent-primary)' : 'transparent',
                          color: currentVoice === voiceId ? 'var(--bg-primary)' : 'var(--text-primary)',
                          border: '1px solid var(--accent-secondary)',
                          borderRadius: '4px',
                          padding: '8px 6px',
                          fontSize: '13px',
                          fontWeight: '500',
                          cursor: 'pointer',
                          transition: 'all 0.2s ease',
                          textAlign: 'center',
                          touchAction: 'manipulation',
                          whiteSpace: 'nowrap',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis'
                        }}
                      >
                        {voice.name}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Apply Button */}
              <div style={{
                borderTop: '1px solid var(--accent-secondary)',
                paddingTop: '12px',
                marginTop: '12px'
              }}>
                <button
                  onClick={() => setShowLevelDropdown(false)}
                  style={{
                    width: '100%',
                    background: 'var(--accent-primary)',
                    color: 'var(--bg-primary)',
                    border: 'none',
                    borderRadius: '6px',
                    padding: '10px 16px',
                    fontSize: '14px',
                    fontWeight: '600',
                    cursor: 'pointer',
                    transition: 'all 0.2s ease',
                    touchAction: 'manipulation'
                  }}
                >
                  Apply Settings
                </button>
              </div>
            </motion.div>
          )}
        </div>
      </div>

      {/* Progressive CTA - appears at 8s */}
      {false && showProgressiveCTA && (
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


      {/* Mobile Settings Modal */}
      {showSettingsModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-3 sm:p-4">
          <div className="bg-[var(--bg-primary)] rounded-lg shadow-xl max-w-sm w-full border-2 border-[var(--accent-secondary)]/20 max-h-[90vh] overflow-y-auto">

            {/* Modal Header */}
            <div className="flex items-center justify-between p-6 border-b border-[var(--accent-secondary)]">
              <h2 className="text-lg font-semibold text-[var(--text-primary)]" style={{ fontFamily: 'Playfair Display, serif' }}>Reading Settings</h2>
              <button
                onClick={() => setShowSettingsModal(false)}
                className="text-[var(--text-secondary)] hover:text-[var(--accent-primary)] text-xl transition-colors"
              >
                ×
              </button>
            </div>

            {/* Modal Content */}
            <div className="p-6 space-y-6">

              {/* Reading Level Selection */}
              <div>
                <label className="block text-sm font-medium text-[var(--text-secondary)] mb-3">Reading Level</label>
                <div className="grid grid-cols-3 gap-2">
                  {CEFR_LEVELS.map((level) => (
                    <button
                      key={level}
                      onClick={() => {
                        handleLevelChange(level);
                      }}
                      className={`py-2 px-3 rounded-md text-sm font-medium transition-all ${
                        currentLevel === level
                          ? 'bg-[var(--accent-primary)] text-white shadow-sm'
                          : 'bg-[var(--bg-secondary)] text-[var(--text-secondary)] hover:bg-[var(--accent-primary)]/10 border border-[var(--accent-secondary)]'
                      }`}
                    >
                      {level}
                    </button>
                  ))}
                </div>
              </div>

              {/* Voice Selection */}
              <div>
                <label className="block text-sm font-medium text-[var(--text-secondary)] mb-3">Voice</label>
                <div className="flex gap-2">
                  {(['sarah', 'daniel'] as const).map((voice) => (
                    <button
                      key={voice}
                      onClick={() => {
                        handleVoiceChange(voice);
                      }}
                      className={`flex-1 py-2 px-3 rounded-md text-sm font-medium transition-all capitalize ${
                        currentVoice === voice
                          ? 'bg-[var(--accent-primary)] text-white shadow-sm'
                          : 'bg-[var(--bg-secondary)] text-[var(--text-secondary)] hover:bg-[var(--accent-primary)]/10 border border-[var(--accent-secondary)]'
                      }`}
                    >
                      {voice === 'sarah' ? '👩 Sarah' : '👨 Daniel'}
                    </button>
                  ))}
                </div>
              </div>

              {/* Apply Settings Footer */}
              <div className="pt-4 border-t border-[var(--accent-secondary)]">
                <button
                  onClick={() => {
                    setShowSettingsModal(false);
                  }}
                  className="w-full bg-[var(--accent-primary)] text-white py-3 px-4 rounded-md font-medium hover:bg-[var(--accent-secondary)] transition-all shadow-md"
                >
                  Apply Settings
                </button>
              </div>

            </div>
          </div>
        </div>
      )}

      {/* Hidden Audio Element */}
      <audio
        ref={audioRef}
        preload="metadata"
        style={{ display: 'none' }}
      />
    </motion.div>
    </>
  );
}