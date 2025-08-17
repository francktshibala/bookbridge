'use client';

import React, { useState, useRef, useEffect } from 'react';
import { ChevronDown, Play, Pause, Volume2, ChevronLeft, ChevronRight } from 'lucide-react';
import { VoiceSelectionModal } from '../VoiceSelectionModal';
import { AudioSyncManager, VoiceSettings } from '../../lib/audio-sync-manager';

interface WireframeAudioControlsProps {
  enableWordHighlighting: boolean;
  text: string;
  voiceProvider: 'standard' | 'openai' | 'elevenlabs';
  isPlaying: boolean;
  onPlayStateChange: (playing: boolean) => void;
  onEnd?: () => void;
  bookId?: string;
  chunkIndex?: number;
  cefrLevel?: string;
  onCefrLevelChange?: (level: string) => void;
  currentChunk?: number;
  totalChunks?: number;
  onNavigate?: (direction: 'prev' | 'next') => void;
  selectedVoice?: string;
  onVoiceChange?: (voiceId: string) => void;
  onPreviewVoice?: (voiceId: string) => void;
  currentMode?: 'original' | 'simplified';
  onModeChange?: (mode: 'original' | 'simplified') => void;
  onWordHighlight?: (wordIndex: number) => void;
  autoAdvanceEnabled?: boolean;
  onToggleAutoAdvance?: () => void;
}

export function WireframeAudioControls({
  enableWordHighlighting,
  text,
  voiceProvider,
  isPlaying,
  onPlayStateChange,
  onEnd,
  bookId,
  chunkIndex,
  cefrLevel = 'B1',
  onCefrLevelChange,
  currentChunk = 0,
  totalChunks = 0,
  onNavigate,
  selectedVoice = 'alloy',
  onVoiceChange,
  onPreviewVoice,
  currentMode = 'original',
  onModeChange,
  onWordHighlight,
  autoAdvanceEnabled = false,
  onToggleAutoAdvance
}: WireframeAudioControlsProps) {
  const [speed, setSpeed] = useState(1.0);
  const [showCefrModal, setShowCefrModal] = useState(false);
  const [showVoiceModal, setShowVoiceModal] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const audioSyncManager = useRef<AudioSyncManager | null>(null);

  const speeds = [0.5, 1.0, 1.5, 2.0];
  const cefrLevels = ['A1', 'A2', 'B1', 'B2', 'C1', 'C2'];

  // Initialize AudioSyncManager
  useEffect(() => {
    if (!audioSyncManager.current) {
      audioSyncManager.current = new AudioSyncManager();
    }

    return () => {
      if (audioSyncManager.current) {
        audioSyncManager.current.destroy();
        audioSyncManager.current = null;
      }
    };
  }, []);

  // Update speed when changed
  useEffect(() => {
    if (audioSyncManager.current) {
      audioSyncManager.current.setSpeed(speed);
    }
  }, [speed]);

  // Stop audio when component unmounts or text changes
  useEffect(() => {
    if (audioSyncManager.current) {
      audioSyncManager.current.stop();
      onPlayStateChange(false);
    }
  }, [text]);

  // Auto-play when isPlaying becomes true (for auto-advance)
  useEffect(() => {
    if (isPlaying && audioSyncManager.current && !audioSyncManager.current.isCurrentlyPlaying() && !isProcessing) {
      console.log('🎵 Auto-triggering playback due to isPlaying prop change');
      handlePlayPause();
    }
  }, [isPlaying]);

  const handleSpeedToggle = () => {
    const currentIndex = speeds.indexOf(speed);
    const nextIndex = (currentIndex + 1) % speeds.length;
    const newSpeed = speeds[nextIndex];
    setSpeed(newSpeed);
  };

  const handlePlayPause = async () => {
    if (!audioSyncManager.current || isProcessing) return;

    try {
      setIsProcessing(true);

      if (isPlaying) {
        // Pause immediately
        audioSyncManager.current.pause();
        onPlayStateChange(false);
      } else {
        // Play
        if (audioSyncManager.current.isCurrentlyPlaying()) {
          // Resume existing audio
          audioSyncManager.current.resume();
          onPlayStateChange(true);
        } else {
          // Start new audio
          const actualProvider = voiceProvider === 'standard' ? 'openai' : voiceProvider;
          const voiceSettings: VoiceSettings = {
            voiceId: selectedVoice,
            provider: actualProvider as 'openai' | 'elevenlabs',
            speed: speed
          };

          // Show loading state
          onPlayStateChange(true);

          await audioSyncManager.current.startSyncedPlayback(text, voiceSettings, {
            enableHighlighting: enableWordHighlighting,
            onWordChange: onWordHighlight,
            onComplete: () => {
              setIsProcessing(false);
              onPlayStateChange(false);
              onEnd?.();
            },
            onError: (error) => {
              console.error('Audio playback error:', error);
              setIsProcessing(false);
              onPlayStateChange(false);
              
              // Handle autoplay policy violations gracefully
              if (error.message.includes('browser autoplay policy')) {
                console.log('💡 Browser blocked autoplay - user should try clicking play again');
              }
            }
          });
        }
      }
    } catch (error) {
      console.error('Error in handlePlayPause:', error);
      setIsProcessing(false);
      onPlayStateChange(false);
    } finally {
      // Always clear processing state after a short delay
      setTimeout(() => setIsProcessing(false), 500);
    }
  };

  const handleModeToggle = () => {
    const newMode = currentMode === 'original' ? 'simplified' : 'original';
    onModeChange?.(newMode);
  };

  const cefrColors = {
    A1: '#10B981',
    A2: '#059669', 
    B1: '#2563EB',
    B2: '#1D4ED8',
    C1: '#DC2626',
    C2: '#991B1B'
  };

  return (
    <div 
      className="flex items-center justify-center gap-8 bg-slate-800 border-2 border-slate-600 rounded-3xl p-6 mb-12 mx-auto max-w-3xl shadow-2xl"
      style={{
        backgroundColor: '#1e293b',
        border: '2px solid #475569',
        borderRadius: '24px',
        padding: '24px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: '32px',
        maxWidth: '768px',
        margin: '0 auto 48px auto',
        boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)'
      }}
    >
      {/* CEFR Level (only for enhanced books) */}
      {enableWordHighlighting && (
        <div className="relative">
          <button
            onClick={() => setShowCefrModal(!showCefrModal)}
            className="w-16 h-16 rounded-full text-white font-bold text-xl flex items-center justify-center transition-colors shadow-lg"
            style={{ 
              backgroundColor: cefrColors[cefrLevel as keyof typeof cefrColors],
              width: '64px',
              height: '64px',
              borderRadius: '50%',
              border: 'none',
              color: 'white',
              fontSize: '18px',
              fontWeight: 'bold',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
              boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1)'
            }}
          >
            {cefrLevel}
          </button>

          {showCefrModal && (
            <div 
              className="absolute top-full mt-2 left-0 bg-white border border-gray-200 rounded-lg shadow-lg p-4 w-48 z-10"
              style={{
                position: 'absolute',
                top: '100%',
                marginTop: '8px',
                left: '0',
                backgroundColor: '#1e293b',
                border: '2px solid #475569',
                borderRadius: '12px',
                boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.3)',
                zIndex: 50,
                minWidth: '80px',
                padding: '16px'
              }}
            >
              <h3 
                className="font-medium mb-3"
                style={{
                  color: 'white',
                  fontSize: '16px',
                  fontWeight: '600',
                  marginBottom: '12px'
                }}
              >
                Reading Level
              </h3>
              <div className="space-y-1" style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                {cefrLevels.map((level) => (
                  <button
                    key={level}
                    onClick={() => {
                      onCefrLevelChange?.(level);
                      setShowCefrModal(false);
                    }}
                    className="w-full text-left px-3 py-2 rounded-lg hover:bg-gray-100 font-medium transition-colors"
                    style={{ 
                      color: 'white',
                      width: '100%',
                      padding: '12px 16px',
                      backgroundColor: level === cefrLevel ? '#6366f1' : 'transparent',
                      fontSize: '16px',
                      fontWeight: '600',
                      border: 'none',
                      cursor: 'pointer',
                      textAlign: 'left',
                      borderRadius: '8px',
                      transition: 'background-color 0.2s'
                    }}
                    onMouseEnter={(e) => {
                      if (level !== cefrLevel) {
                        e.currentTarget.style.backgroundColor = '#6366f1';
                        e.currentTarget.style.opacity = '0.7';
                      }
                    }}
                    onMouseLeave={(e) => {
                      if (level !== cefrLevel) {
                        e.currentTarget.style.backgroundColor = 'transparent';
                        e.currentTarget.style.opacity = '1';
                      }
                    }}
                  >
                    {level}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Simplified/Original Toggle */}
      <button 
        onClick={handleModeToggle}
        className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-full text-base font-medium transition-colors shadow-lg"
        style={{
          padding: '16px 40px',
          borderRadius: '32px',
          backgroundColor: currentMode === 'simplified' ? '#10b981' : '#6366f1',
          color: 'white',
          fontSize: '16px',
          fontWeight: '600',
          border: 'none',
          cursor: 'pointer',
          minHeight: '64px',
          boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1)',
          transition: 'background-color 0.2s'
        }}
      >
        {currentMode === 'simplified' ? 'Simplified' : 'Original'}
      </button>

      {/* Play/Pause */}
      <button
        onClick={handlePlayPause}
        disabled={isProcessing}
        className="w-16 h-16 bg-blue-600 hover:bg-blue-700 text-white rounded-full flex items-center justify-center transition-colors shadow-lg"
        style={{
          width: '64px',
          height: '64px',
          borderRadius: '50%',
          backgroundColor: isProcessing ? '#9ca3af' : '#6366f1',
          color: 'white',
          fontSize: '24px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          border: 'none',
          cursor: isProcessing ? 'not-allowed' : 'pointer',
          boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1)',
          opacity: isProcessing ? 0.7 : 1
        }}
      >
        {isProcessing ? (
          <div style={{
            width: '20px',
            height: '20px',
            border: '2px solid transparent',
            borderTop: '2px solid white',
            borderRadius: '50%',
            animation: 'spin 1s linear infinite'
          }} />
        ) : (
          isPlaying ? <Pause size={20} /> : <Play size={20} />
        )}
      </button>

      <style jsx>{`
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
      `}</style>

      {/* Speed Control */}
      <button
        onClick={handleSpeedToggle}
        className="px-4 py-3 bg-slate-700 hover:bg-slate-600 text-white rounded-lg text-base font-medium transition-colors shadow-lg"
        style={{
          color: '#cbd5e1',
          fontSize: '18px',
          fontWeight: '600',
          padding: '12px 16px',
          backgroundColor: '#475569',
          border: 'none',
          cursor: 'pointer',
          borderRadius: '8px'
        }}
      >
        {speed}x
      </button>

      {/* Voice/Audio Button (only for enhanced books) */}
      {enableWordHighlighting && (
        <button 
          onClick={() => setShowVoiceModal(true)}
          className="w-12 h-12 bg-slate-700 hover:bg-slate-600 text-white rounded-full flex items-center justify-center transition-colors shadow-lg"
          style={{
            width: '64px',
            height: '64px',
            borderRadius: '50%',
            backgroundColor: '#6366f1',
            color: 'white',
            fontSize: '20px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            border: 'none',
            cursor: 'pointer',
            boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1)'
          }}
        >
          🎤
        </button>
      )}

      {/* Auto-advance toggle (only for enhanced books) */}
      {enableWordHighlighting && (
        <button
          onClick={onToggleAutoAdvance}
          style={{
            width: '48px',
            height: '48px',
            borderRadius: '8px',
            backgroundColor: autoAdvanceEnabled ? '#10b981' : '#475569',
            color: 'white',
            fontSize: '20px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            border: 'none',
            cursor: 'pointer',
            boxShadow: '0 4px 8px rgba(0, 0, 0, 0.1)',
            transition: 'background-color 0.2s'
          }}
          title={autoAdvanceEnabled ? 'Auto-advance: Navigate to next page when audio ends' : 'Auto-advance disabled'}
        >
          {autoAdvanceEnabled ? '🔄' : '⏭️'}
        </button>
      )}

      {/* Navigation with arrows */}
      <div className="flex items-center gap-2" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
        <button 
          onClick={() => onNavigate?.('prev')}
          disabled={currentChunk <= 0}
          className="text-white"
          style={{
            backgroundColor: 'transparent',
            color: currentChunk <= 0 ? '#6b7280' : '#94a3b8',
            border: 'none',
            cursor: currentChunk <= 0 ? 'not-allowed' : 'pointer',
            fontSize: '24px',
            fontWeight: 'bold',
            padding: '0',
            margin: '0'
          }}
        >
          ‹
        </button>
        
        <span 
          className="text-slate-300 font-medium px-2"
          style={{
            color: '#cbd5e1',
            fontSize: '16px',
            fontWeight: '500',
            padding: '0 16px',
            minWidth: '60px',
            textAlign: 'center'
          }}
        >
          {currentChunk + 1}/{totalChunks}
        </span>
        
        <button 
          onClick={() => onNavigate?.('next')}
          disabled={currentChunk >= totalChunks - 1}
          className="text-white"
          style={{
            backgroundColor: 'transparent',
            color: currentChunk >= totalChunks - 1 ? '#6b7280' : '#94a3b8',
            border: 'none',
            cursor: currentChunk >= totalChunks - 1 ? 'not-allowed' : 'pointer',
            fontSize: '24px',
            fontWeight: 'bold',
            padding: '0',
            margin: '0'
          }}
        >
          ›
        </button>
      </div>

      {/* Click outside handler */}
      {showCefrModal && (
        <div
          className="fixed inset-0 z-0"
          onClick={() => setShowCefrModal(false)}
        />
      )}

      {/* Voice Selection Modal */}
      <VoiceSelectionModal
        isOpen={showVoiceModal}
        onClose={() => setShowVoiceModal(false)}
        selectedVoice={selectedVoice}
        onVoiceSelect={(voiceId) => onVoiceChange?.(voiceId)}
        onPreviewVoice={onPreviewVoice}
      />
    </div>
  );
}