'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { voiceService, VoiceProvider } from '@/lib/voice-service';
import { eslVoiceService, ESLAudioOptions, PronunciationGuide, CEFRLevel, asCEFRLevel } from '@/lib/voice-service-esl';
import { useESLMode } from '@/hooks/useESLMode';
import { ELEVENLABS_VOICES, DEFAULT_ELEVENLABS_VOICE } from '@/lib/elevenlabs-voices';
import { Volume2, Play, Pause, Settings, BookOpen, Mic, ChevronDown, Speaker } from 'lucide-react';

interface ESLAudioPlayerProps {
  text: string;
  bookId?: string;
  onStart?: () => void;
  onEnd?: () => void;
  onWordHighlight?: (wordIndex: number) => void;
  className?: string;
  // When true, uses text prop directly (for SplitScreenView)
  useExternalText?: boolean;
}

export const ESLAudioPlayer: React.FC<ESLAudioPlayerProps> = ({
  text,
  bookId,
  onStart,
  onEnd,
  onWordHighlight,
  className = '',
  useExternalText = false
}) => {
  const { eslLevel, nativeLanguage, simplifyText } = useESLMode();
  const [isPlaying, setIsPlaying] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [showPronunciationGuide, setShowPronunciationGuide] = useState(false);
  const [currentWord, setCurrentWord] = useState<string>('');
  const [pronunciationGuide, setPronunciationGuide] = useState<PronunciationGuide | null>(null);
  
  // Text choice functionality
  const [textMode, setTextMode] = useState<'original' | 'simplified'>('original');
  const [simplifiedText, setSimplifiedText] = useState<string>('');
  const [isSimplifying, setIsSimplifying] = useState(false);
  
  // Voice provider settings
  const [voiceProvider, setVoiceProvider] = useState<VoiceProvider>('web-speech');
  const [selectedVoice, setSelectedVoice] = useState<SpeechSynthesisVoice | null>(null);
  const [availableVoices, setAvailableVoices] = useState<SpeechSynthesisVoice[]>([]);
  const [elevenLabsVoice, setElevenLabsVoice] = useState<string>(DEFAULT_ELEVENLABS_VOICE);
  const [openAIVoice, setOpenAIVoice] = useState<string>('alloy');

  // OpenAI voice options
  const openAIVoices = [
    { id: 'alloy', name: 'Alloy (Neutral)' },
    { id: 'echo', name: 'Echo (Male)' },
    { id: 'fable', name: 'Fable (British Male)' },
    { id: 'onyx', name: 'Onyx (Deep Male)' },
    { id: 'nova', name: 'Nova (Female)' },
    { id: 'shimmer', name: 'Shimmer (Female)' }
  ];

  // ESL-specific settings
  const [audioSettings, setAudioSettings] = useState<ESLAudioOptions>({
    eslLevel: (asCEFRLevel(eslLevel) as CEFRLevel) || 'B1',
    nativeLanguage: nativeLanguage || undefined,
    emphasizeDifficultWords: true,
    pauseAfterSentences: false,
    pronunciationGuide: false,
    provider: 'web-speech',
    rate: 1.0, // Will be adjusted based on ESL level
    pitch: 1.0,
    volume: 0.8,
    voice: null
  });
  
  // Progress tracking
  const [progress, setProgress] = useState(0);
  const [duration, setDuration] = useState(0);
  const [currentTime, setCurrentTime] = useState(0);
  const [wordsPerMinute, setWordsPerMinute] = useState(0);
  
  // Load available voices on mount and cleanup on unmount
  useEffect(() => {
    const voices = voiceService.getEnglishVoices();
    setAvailableVoices(voices);
    setSelectedVoice(voiceService.getRecommendedVoice());
    
    return () => {
      // Cleanup: Stop any ongoing speech synthesis
      voiceService.stop();
    };
  }, []);

  // Simplify text when needed
  useEffect(() => {
    if (textMode === 'simplified' && bookId && !simplifiedText && !isSimplifying) {
      handleSimplifyText();
    }
  }, [textMode, text, bookId]);

  const handleSimplifyText = async () => {
    if (!bookId || !eslLevel) return;
    
    setIsSimplifying(true);
    try {
      const simplified = await simplifyText(bookId, text);
      setSimplifiedText(simplified);
    } catch (error) {
      console.error('Error simplifying text:', error);
      setSimplifiedText(text); // Fallback to original
    } finally {
      setIsSimplifying(false);
    }
  };

  // Get recommended settings based on ESL level
  useEffect(() => {
    if (eslLevel) {
      const level = asCEFRLevel(eslLevel);
      if (!level) return;
      const recommendations = eslVoiceService.getRecommendedReadingSpeed(level);
      setAudioSettings(prev => ({
        ...prev,
        eslLevel: level,
        provider: voiceProvider,
        voice: selectedVoice,
        elevenLabsVoice,
        openAIVoice,
        rate: recommendations.audioRate
      }));
      setWordsPerMinute(recommendations.wpm);
      
      // Enable helpful features for beginners
      if (['A1', 'A2'].includes(level)) {
        setAudioSettings(prev => ({
          ...prev,
          pauseAfterSentences: true,
          emphasizeDifficultWords: true,
          pronunciationGuide: true
        }));
      }
    }
  }, [eslLevel, voiceProvider, selectedVoice, elevenLabsVoice, openAIVoice]);
  
  // Estimate duration based on word count and ESL level
  useEffect(() => {
    const wordCount = text.split(/\s+/).length;
    const wpm = wordsPerMinute || 150; // Default if not set
    const estimatedDuration = (wordCount / wpm) * 60; // seconds
    setDuration(estimatedDuration);
  }, [text, wordsPerMinute]);
  
  const handlePlay = async () => {
    if (isLoading) return;
    
    setIsLoading(true);
    setIsPlaying(false);
    setIsPaused(false);
    
    try {
      // Stop any existing playback
      voiceService.stop();
      
      setProgress(0);
      setCurrentTime(0);
      onStart?.();
      
      // Use external text (from SplitScreenView) or internal text mode selection
      const textToRead = useExternalText ? text : (textMode === 'simplified' && simplifiedText ? simplifiedText : text);
      
      // Process text for ESL enhancements
      let enhancedText = textToRead;
      
      // Add pauses for beginners
      if (audioSettings.pauseAfterSentences) {
        enhancedText = textToRead.replace(/([.!?])\s+/g, '$1 ... ');
      }
      
      // Use the base voice service with ESL-adapted settings
      await voiceService.speak({
        text: enhancedText,
        settings: {
          provider: voiceProvider,
          voice: selectedVoice,
          elevenLabsVoice,
          openAIVoice,
          rate: audioSettings.rate || 1.0,
          pitch: 1.0,
          volume: audioSettings.volume
        },
        onStart: () => {
          setIsLoading(false);
          setIsPlaying(true);
          console.log('🎓 ESL Audio: Started playing with level', audioSettings.eslLevel, 'using', voiceProvider);
        },
        onEnd: () => {
          setIsPlaying(false);
          setIsPaused(false);
          setProgress(100);
          onEnd?.();
          console.log('🎓 ESL Audio: Playbook completed');
        },
        onWordBoundary: async (info) => {
          // Update progress
          const progressPercent = (info.elapsedTime / duration) * 100;
          setProgress(progressPercent);
          setCurrentTime(info.elapsedTime);
          
          // Highlight word in text
          onWordHighlight?.(info.wordIndex);
          
          // Show pronunciation guide for difficult words
          if (audioSettings.pronunciationGuide) {
            const guide = await eslVoiceService.generatePronunciationGuide(info.word);
            if (guide.difficulty !== 'easy') {
              setCurrentWord(info.word);
              setPronunciationGuide(guide);
            }
          }
        },
        onError: (error) => {
          console.error('🎓 ESL Audio Error:', error);
          setIsLoading(false);
          setIsPlaying(false);
        }
      });
      
    } catch (error) {
      console.error('🎓 ESL Audio Error:', error);
      setIsLoading(false);
      setIsPlaying(false);
    }
  };
  
  const handlePause = () => {
    voiceService.pause();
    setIsPaused(true);
    setIsPlaying(false);
  };
  
  const handleResume = () => {
    voiceService.resume();
    setIsPaused(false);
    setIsPlaying(true);
  };
  
  const handleStop = () => {
    voiceService.stop();
    setIsPlaying(false);
    setIsPaused(false);
    setProgress(0);
    setCurrentTime(0);
  };
  
  const toggleSetting = (setting: keyof ESLAudioOptions) => {
    setAudioSettings(prev => ({
      ...prev,
      [setting]: !prev[setting]
    }));
  };
  
  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };
  
  const getSpeedLabel = (rate: number): string => {
    if (rate <= 0.6) return 'Very Slow';
    if (rate <= 0.7) return 'Slow';
    if (rate <= 0.8) return 'Moderate';
    if (rate <= 0.9) return 'Normal';
    if (rate <= 1.0) return 'Fast';
    return 'Very Fast';
  };
  
  return (
    <div className={`bg-white rounded-lg shadow-lg p-6 ${className}`}>
      {/* ESL Level Indicator */}
      {eslLevel && (
        <div className="mb-4 flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <BookOpen className="w-4 h-4 text-blue-600" />
            <span className="text-sm font-medium text-gray-700">
              ESL Mode: {eslLevel}
            </span>
            <span className="text-xs text-gray-500">
              ({wordsPerMinute} WPM)
            </span>
            {!useExternalText && (
              <span className={`text-xs px-2 py-1 rounded-full ${
                textMode === 'simplified' 
                  ? 'bg-green-100 text-green-700' 
                  : 'bg-blue-100 text-blue-700'
              }`}>
                {textMode === 'simplified' ? '📚 Simplified' : '📖 Original'}
              </span>
            )}
          </div>
          <button
            onClick={() => setShowSettings(!showSettings)}
            className="p-2 rounded-lg hover:bg-gray-100 transition-colors"
            aria-label="Audio settings"
          >
            <Settings className="w-4 h-4 text-gray-600" />
          </button>
        </div>
      )}
      
      {/* Settings Panel */}
      <AnimatePresence>
        {showSettings && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="mb-4 overflow-hidden"
          >
            <div className="bg-gray-50 rounded-lg p-4 space-y-4">
              <h3 className="text-sm font-semibold text-gray-700 mb-2">
                ESL Audio Settings
              </h3>
              
              {/* Text Mode Selection - only show when not using external text */}
              {!useExternalText && (
                <div className="space-y-2">
                  <label className="text-xs text-gray-600">Text Version:</label>
                  <div className="flex gap-2">
                    <button
                      onClick={() => setTextMode('original')}
                      className={`flex-1 px-3 py-2 text-sm rounded-lg transition-colors ${
                        textMode === 'original' 
                          ? 'bg-blue-600 text-white' 
                          : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                      }`}
                    >
                      📖 Original
                    </button>
                    <button
                      onClick={() => setTextMode('simplified')}
                      disabled={isSimplifying}
                      className={`flex-1 px-3 py-2 text-sm rounded-lg transition-colors ${
                        textMode === 'simplified' 
                          ? 'bg-green-600 text-white' 
                          : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                      } ${isSimplifying ? 'opacity-50 cursor-not-allowed' : ''}`}
                    >
                      {isSimplifying ? '⏳' : '📚'} Simplified
                    </button>
                  </div>
                </div>
              )}
              
              {/* Voice Provider Selection */}
              <div className="space-y-2">
                <label className="text-xs text-gray-600">Voice Provider:</label>
                <select
                  value={voiceProvider}
                  onChange={(e) => setVoiceProvider(e.target.value as VoiceProvider)}
                  className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="web-speech">🔊 Standard Voice (Free)</option>
                  <option value="openai">🎤 OpenAI Voice (Premium)</option>
                  <option value="elevenlabs">✨ ElevenLabs (Premium)</option>
                  <option value="elevenlabs-websocket">⚡ ElevenLabs WebSocket (Premium)</option>
                </select>
              </div>

              {/* Voice Selection for each provider */}
              {voiceProvider === 'web-speech' && availableVoices.length > 0 && (
                <div className="space-y-2">
                  <label className="text-xs text-gray-600">Voice:</label>
                  <select
                    value={selectedVoice?.name || ''}
                    onChange={(e) => {
                      const voice = availableVoices.find(v => v.name === e.target.value);
                      setSelectedVoice(voice || null);
                    }}
                    className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    {availableVoices.map(voice => (
                      <option key={voice.name} value={voice.name}>
                        {voice.name}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {voiceProvider === 'openai' && (
                <div className="space-y-2">
                  <label className="text-xs text-gray-600">OpenAI Voice:</label>
                  <select
                    value={openAIVoice}
                    onChange={(e) => setOpenAIVoice(e.target.value)}
                    className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    {openAIVoices.map(voice => (
                      <option key={voice.id} value={voice.id}>
                        {voice.name}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {(voiceProvider === 'elevenlabs' || voiceProvider === 'elevenlabs-websocket') && (
                <div className="space-y-2">
                  <label className="text-xs text-gray-600">ElevenLabs Voice:</label>
                  <select
                    value={elevenLabsVoice}
                    onChange={(e) => setElevenLabsVoice(e.target.value)}
                    className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    {ELEVENLABS_VOICES.map(voice => (
                      <option key={voice.voice_id} value={voice.voice_id}>
                        {voice.name}
                      </option>
                    ))}
                  </select>
                </div>
              )}
              
              {/* Speed Control */}
              <div className="space-y-2">
                <label className="text-xs text-gray-600">
                  Speed: {getSpeedLabel(audioSettings.rate || 1.0)}
                </label>
                <input
                  type="range"
                  min="0.5"
                  max="1.2"
                  step="0.1"
                  value={audioSettings.rate || 1.0}
                  onChange={(e) => setAudioSettings(prev => ({
                    ...prev,
                    rate: parseFloat(e.target.value)
                  }))}
                  className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
                />
              </div>
              
              {/* Feature Toggles */}
              <div className="space-y-2">
                <label className="flex items-center space-x-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={audioSettings.pauseAfterSentences}
                    onChange={() => toggleSetting('pauseAfterSentences')}
                    className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
                  />
                  <span className="text-sm text-gray-700">
                    Pause after sentences
                  </span>
                </label>
                
                <label className="flex items-center space-x-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={audioSettings.emphasizeDifficultWords}
                    onChange={() => toggleSetting('emphasizeDifficultWords')}
                    className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
                  />
                  <span className="text-sm text-gray-700">
                    Emphasize difficult words
                  </span>
                </label>
                
                <label className="flex items-center space-x-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={audioSettings.pronunciationGuide}
                    onChange={() => toggleSetting('pronunciationGuide')}
                    className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
                  />
                  <span className="text-sm text-gray-700">
                    Show pronunciation guide
                  </span>
                </label>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
      
      {/* Main Controls */}
      <div className="space-y-4">
        {/* Play/Pause Button */}
        <div className="flex items-center justify-center">
          {isLoading ? (
            <button
              disabled
              className="p-4 bg-gray-100 rounded-full cursor-not-allowed"
            >
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            </button>
          ) : isPlaying ? (
            <button
              onClick={handlePause}
              className="p-4 bg-blue-600 hover:bg-blue-700 text-white rounded-full transition-colors"
              aria-label="Pause"
            >
              <Pause className="w-8 h-8" />
            </button>
          ) : isPaused ? (
            <button
              onClick={handleResume}
              className="p-4 bg-green-600 hover:bg-green-700 text-white rounded-full transition-colors"
              aria-label="Resume"
            >
              <Play className="w-8 h-8" />
            </button>
          ) : (
            <button
              onClick={handlePlay}
              className="p-4 bg-blue-600 hover:bg-blue-700 text-white rounded-full transition-colors"
              aria-label="Play"
            >
              <Play className="w-8 h-8" />
            </button>
          )}
        </div>
        
        {/* Progress Bar */}
        <div className="space-y-1">
          <div className="w-full bg-gray-200 rounded-full h-2.5">
            <motion.div
              className="bg-blue-600 h-2.5 rounded-full"
              initial={{ width: 0 }}
              animate={{ width: `${progress}%` }}
              transition={{ duration: 0.3 }}
            />
          </div>
          <div className="flex justify-between text-xs text-gray-500">
            <span>{formatTime(currentTime)}</span>
            <span>{formatTime(duration)}</span>
          </div>
        </div>
        
        {/* Stop Button */}
        {(isPlaying || isPaused) && (
          <div className="flex justify-center">
            <button
              onClick={handleStop}
              className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors text-sm"
            >
              Stop
            </button>
          </div>
        )}
      </div>
      
      {/* Pronunciation Guide Popup */}
      <AnimatePresence>
        {pronunciationGuide && audioSettings.pronunciationGuide && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 20 }}
            className="mt-4 p-4 bg-yellow-50 border border-yellow-200 rounded-lg"
          >
            <div className="flex items-start justify-between">
              <div className="space-y-2">
                <div className="flex items-center space-x-2">
                  <Mic className="w-4 h-4 text-yellow-600" />
                  <span className="font-semibold text-gray-800">
                    {pronunciationGuide.word}
                  </span>
                  <span className="text-sm text-gray-600">
                    {pronunciationGuide.phonetic}
                  </span>
                </div>
                <div className="text-sm text-gray-700">
                  Syllables: {pronunciationGuide.syllables.join(' • ')}
                </div>
                <div className="text-xs text-gray-500">
                  Difficulty: {pronunciationGuide.difficulty}
                </div>
                {nativeLanguage && (
                  <div className="text-xs text-gray-600 italic">
                    {eslVoiceService.getPronunciationTips(pronunciationGuide.word, nativeLanguage).map((tip, i) => (
                      <div key={i}>{tip}</div>
                    ))}
                  </div>
                )}
              </div>
              <button
                onClick={() => setPronunciationGuide(null)}
                className="text-gray-400 hover:text-gray-600"
              >
                ×
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
      
      {/* ESL Tips */}
      {eslLevel && ['A1', 'A2'].includes(eslLevel) && (
        <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
          <p className="text-xs text-blue-700">
            💡 Tip: Audio is playing at {getSpeedLabel(audioSettings.rate || 1.0).toLowerCase()} speed 
            to help you understand better. You can adjust the speed in settings.
          </p>
        </div>
      )}
    </div>
  );
};

export default ESLAudioPlayer;