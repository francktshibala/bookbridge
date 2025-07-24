'use client';

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { voiceService, VoiceProvider } from '@/lib/voice-service';
import { ELEVENLABS_VOICES, DEFAULT_ELEVENLABS_VOICE } from '@/lib/elevenlabs-voices';

interface AudioPlayerProps {
  text: string;
  onStart?: () => void;
  onEnd?: () => void;
  onError?: (error: string) => void;
  className?: string;
}

export const AudioPlayer: React.FC<AudioPlayerProps> = ({
  text,
  onStart,
  onEnd,
  onError,
  className = ''
}) => {
  const [isPlaying, setIsPlaying] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [playbackRate, setPlaybackRate] = useState(0.9);
  const [volume, setVolume] = useState(0.8);
  const [progress, setProgress] = useState(0);
  const [duration, setDuration] = useState(0);
  const [currentTime, setCurrentTime] = useState(0);
  const [showControls, setShowControls] = useState(false);
  const [selectedVoice, setSelectedVoice] = useState<SpeechSynthesisVoice | null>(null);
  const [availableVoices, setAvailableVoices] = useState<SpeechSynthesisVoice[]>([]);
  const [voiceProvider, setVoiceProvider] = useState<VoiceProvider>('web-speech');
  const [elevenLabsVoice, setElevenLabsVoice] = useState<string>(DEFAULT_ELEVENLABS_VOICE);
  const [fallbackMessage, setFallbackMessage] = useState<string | null>(null);

  // Load available voices on mount
  useEffect(() => {
    const voices = voiceService.getEnglishVoices();
    setAvailableVoices(voices);
    setSelectedVoice(voiceService.getRecommendedVoice());
  }, []);

  // Estimate reading time (average 200 words per minute)
  useEffect(() => {
    const wordCount = text.split(/\s+/).length;
    const estimatedDuration = (wordCount / 200) * 60; // seconds
    setDuration(estimatedDuration);
  }, [text]);

  const handlePlay = async () => {
    // Always stop current audio first to prevent overlapping
    voiceService.stop();
    setIsPlaying(false);
    setIsPaused(false);
    
    // Small delay to ensure cleanup
    await new Promise(resolve => setTimeout(resolve, 200));

    try {
      setIsPlaying(true);
      setIsPaused(false);
      setProgress(0);
      setCurrentTime(0);
      onStart?.();

      const cleanText = voiceService.cleanTextForSpeech(text);
      
      await voiceService.speak({
        text: cleanText,
        settings: {
          rate: playbackRate,
          volume: volume,
          voice: selectedVoice,
          pitch: 1.0,
          provider: voiceProvider,
          elevenLabsVoice: voiceProvider === 'elevenlabs' ? elevenLabsVoice : undefined
        },
        onStart: () => {
          console.log('Speech started');
          // Start progress simulation
          const progressInterval = setInterval(() => {
            setCurrentTime(prev => {
              const newTime = prev + 0.1;
              setProgress((newTime / duration) * 100);
              if (newTime >= duration) {
                clearInterval(progressInterval);
              }
              return newTime;
            });
          }, 100);
        },
        onEnd: () => {
          setIsPlaying(false);
          setIsPaused(false);
          setProgress(100);
          setCurrentTime(duration);
          onEnd?.();
        },
        onError: (error) => {
          setIsPlaying(false);
          setIsPaused(false);
          setProgress(0);
          setCurrentTime(0);
          if (voiceProvider === 'elevenlabs') {
            setFallbackMessage('Premium voice unavailable, using standard voice');
            setTimeout(() => setFallbackMessage(null), 5000);
          }
          onError?.(error.error);
        },
        onPause: () => {
          setIsPaused(true);
          setIsPlaying(false);
        },
        onResume: () => {
          setIsPaused(false);
          setIsPlaying(true);
        }
      });
    } catch (error) {
      setIsPlaying(false);
      setIsPaused(false);
      onError?.(error instanceof Error ? error.message : 'Speech synthesis failed');
    }
  };

  const handlePause = () => {
    voiceService.stop(); // Use stop instead of pause for cleaner state
    setIsPaused(false);
    setIsPlaying(false);
    setProgress(0);
    setCurrentTime(0);
  };

  const handleStop = () => {
    voiceService.stop();
    setIsPlaying(false);
    setIsPaused(false);
    setProgress(0);
    setCurrentTime(0);
  };

  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const getPlaybackRateLabel = (rate: number): string => {
    if (rate <= 0.7) return 'Slow';
    if (rate <= 0.9) return 'Natural';
    if (rate <= 1.1) return 'Normal';
    if (rate <= 1.3) return 'Fast';
    return 'Very Fast';
  };

  return (
    <div className={`audio-player ${className}`}>
      {/* Fallback Message */}
      {fallbackMessage && (
        <div className="mb-4 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
          <p className="text-sm text-yellow-800">{fallbackMessage}</p>
        </div>
      )}

      {/* Voice Quality Toggle */}
      <div className="mb-4 flex items-center justify-between">
        <span className="text-sm font-medium text-gray-700">Voice Quality</span>
        <div className="flex items-center gap-2">
          <button
            onClick={() => {
              voiceService.stop(); // Stop current audio when switching
              setIsPlaying(false);
              setIsPaused(false);
              setVoiceProvider('web-speech');
            }}
            className={`px-3 py-1 rounded-md text-sm font-medium transition-colors ${
              voiceProvider === 'web-speech'
                ? 'bg-purple-600 text-white'
                : 'bg-gray-200 text-gray-600 hover:bg-gray-300'
            }`}
          >
            Standard
          </button>
          <button
            onClick={() => {
              voiceService.stop(); // Stop current audio when switching
              setIsPlaying(false);
              setIsPaused(false);
              setVoiceProvider('elevenlabs');
            }}
            className={`px-3 py-1 rounded-md text-sm font-medium transition-colors ${
              voiceProvider === 'elevenlabs'
                ? 'bg-purple-600 text-white'
                : 'bg-gray-200 text-gray-600 hover:bg-gray-300'
            }`}
          >
            Premium ✨
          </button>
        </div>
      </div>

      {/* Voice Selection for Premium */}
      {voiceProvider === 'elevenlabs' && (
        <div className="mb-4">
          <label className="text-sm font-medium text-gray-700 block mb-2">
            Select Voice
          </label>
          <select
            value={elevenLabsVoice}
            onChange={(e) => {
              voiceService.stop(); // Stop current audio when changing voice
              setIsPlaying(false);
              setIsPaused(false);
              setElevenLabsVoice(e.target.value);
            }}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
          >
            <optgroup label="Female Voices">
              {ELEVENLABS_VOICES.filter(v => v.category === 'female').map(voice => (
                <option key={voice.voice_id} value={voice.voice_id}>
                  {voice.name} ({voice.accent}) - {voice.description}
                </option>
              ))}
            </optgroup>
            <optgroup label="Male Voices">
              {ELEVENLABS_VOICES.filter(v => v.category === 'male').map(voice => (
                <option key={voice.voice_id} value={voice.voice_id}>
                  {voice.name} ({voice.accent}) - {voice.description}
                </option>
              ))}
            </optgroup>
          </select>
        </div>
      )}

      {/* Main Play Button */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: '12px',
        background: 'white',
        padding: '12px 16px',
        borderRadius: '12px',
        border: '1px solid #e0e7ff',
        boxShadow: '0 2px 8px rgba(0, 0, 0, 0.1)'
      }}>
        {/* Play/Pause/Stop Controls */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <motion.button
            onClick={isPlaying ? handlePause : handlePlay}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            style={{
              padding: '8px 12px',
              background: isPlaying 
                ? 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)'
                : 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
              color: 'white',
              border: 'none',
              borderRadius: '8px',
              fontSize: '12px',
              fontWeight: '600',
              fontFamily: '"Inter", "Segoe UI", system-ui, sans-serif',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              transition: 'all 0.2s ease'
            }}
            aria-label={isPlaying ? 'Pause audio' : 'Play audio'}
          >
            {isPlaying ? (
              <>
                <motion.div
                  animate={{ scale: [1, 1.1, 1] }}
                  transition={{ duration: 1, repeat: Infinity }}
                >
                  ⏸️
                </motion.div>
                Pause
              </>
            ) : isPaused ? (
              <>
                ▶️ Resume
              </>
            ) : (
              <>
                🔊 Listen
              </>
            )}
          </motion.button>

          {(isPlaying || isPaused || progress > 0) && (
            <motion.button
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              onClick={handleStop}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              style={{
                padding: '8px',
                background: '#ef4444',
                color: 'white',
                border: 'none',
                borderRadius: '6px',
                fontSize: '12px',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center'
              }}
              aria-label="Stop audio"
            >
              ⏹️
            </motion.button>
          )}
        </div>

        {/* Progress Bar */}
        {(isPlaying || isPaused || progress > 0) && (
          <motion.div
            initial={{ opacity: 0, width: 0 }}
            animate={{ opacity: 1, width: 'auto' }}
            style={{
              flex: 1,
              display: 'flex',
              alignItems: 'center',
              gap: '8px'
            }}
          >
            <div style={{
              flex: 1,
              height: '4px',
              background: '#e0e7ff',
              borderRadius: '2px',
              overflow: 'hidden'
            }}>
              <motion.div
                style={{
                  height: '100%',
                  background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                  borderRadius: '2px'
                }}
                initial={{ width: 0 }}
                animate={{ width: `${progress}%` }}
                transition={{ duration: 0.1 }}
              />
            </div>
            
            <div style={{
              fontSize: '10px',
              color: '#6b7280',
              fontFamily: '"Inter", "Segoe UI", system-ui, sans-serif',
              fontWeight: '500',
              minWidth: '60px'
            }}>
              {formatTime(currentTime)} / {formatTime(duration)}
            </div>
          </motion.div>
        )}

        {/* Controls Toggle */}
        <motion.button
          onClick={() => setShowControls(!showControls)}
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          style={{
            padding: '6px',
            background: '#f8faff',
            border: '1px solid #e0e7ff',
            borderRadius: '6px',
            cursor: 'pointer',
            fontSize: '12px',
            color: '#667eea'
          }}
          aria-label="Toggle audio controls"
          aria-expanded={showControls}
        >
          ⚙️
        </motion.button>
      </div>

      {/* Advanced Controls */}
      <AnimatePresence>
        {showControls && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            style={{
              marginTop: '8px',
              background: 'white',
              padding: '12px',
              borderRadius: '8px',
              border: '1px solid #e0e7ff',
              boxShadow: '0 2px 8px rgba(0, 0, 0, 0.05)'
            }}
          >
            {/* Speed Control */}
            <div style={{ marginBottom: '12px' }}>
              <label style={{
                fontSize: '11px',
                fontWeight: '600',
                color: '#374151',
                fontFamily: '"Inter", "Segoe UI", system-ui, sans-serif',
                display: 'block',
                marginBottom: '4px'
              }}>
                Speed: {getPlaybackRateLabel(playbackRate)} ({playbackRate}x)
              </label>
              <input
                type="range"
                min="0.5"
                max="2.0"
                step="0.1"
                value={playbackRate}
                onChange={(e) => setPlaybackRate(parseFloat(e.target.value))}
                style={{
                  width: '100%',
                  height: '4px',
                  background: '#e0e7ff',
                  borderRadius: '2px',
                  outline: 'none',
                  cursor: 'pointer'
                }}
              />
              <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                fontSize: '9px',
                color: '#9ca3af',
                marginTop: '2px'
              }}>
                <span>0.5x</span>
                <span>1.0x</span>
                <span>2.0x</span>
              </div>
            </div>

            {/* Volume Control */}
            <div style={{ marginBottom: '12px' }}>
              <label style={{
                fontSize: '11px',
                fontWeight: '600',
                color: '#374151',
                fontFamily: '"Inter", "Segoe UI", system-ui, sans-serif',
                display: 'block',
                marginBottom: '4px'
              }}>
                Volume: {Math.round(volume * 100)}%
              </label>
              <input
                type="range"
                min="0"
                max="1"
                step="0.1"
                value={volume}
                onChange={(e) => setVolume(parseFloat(e.target.value))}
                style={{
                  width: '100%',
                  height: '4px',
                  background: '#e0e7ff',
                  borderRadius: '2px',
                  outline: 'none',
                  cursor: 'pointer'
                }}
              />
            </div>

            {/* Voice Selection */}
            {availableVoices.length > 0 && (
              <div>
                <label style={{
                  fontSize: '11px',
                  fontWeight: '600',
                  color: '#374151',
                  fontFamily: '"Inter", "Segoe UI", system-ui, sans-serif',
                  display: 'block',
                  marginBottom: '4px'
                }}>
                  Voice: {selectedVoice?.name || 'Default'}
                </label>
                <select
                  value={selectedVoice?.name || ''}
                  onChange={(e) => {
                    const voice = availableVoices.find(v => v.name === e.target.value);
                    setSelectedVoice(voice || null);
                    voiceService.updateSettings({ voice: voice || null });
                  }}
                  style={{
                    width: '100%',
                    padding: '4px 8px',
                    border: '1px solid #d1d5db',
                    borderRadius: '4px',
                    fontSize: '11px',
                    fontFamily: '"Inter", "Segoe UI", system-ui, sans-serif',
                    background: 'white'
                  }}
                >
                  {availableVoices.map((voice) => (
                    <option key={voice.name} value={voice.name}>
                      {voice.name} ({voice.lang})
                    </option>
                  ))}
                </select>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};