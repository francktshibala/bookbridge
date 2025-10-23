'use client';

import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence, PanInfo } from 'framer-motion';
import { playWordPronunciation } from '@/lib/audio/PronunciationPlayer';

interface Definition {
  word: string;
  phonetic?: string;
  pronunciation?: string;
  definition: string;
  example?: string;
  partOfSpeech?: string;
  cefrLevel?: string;
  source?: string;
  audioUrl?: string; // Add audio URL support
}

interface DefinitionBottomSheetProps {
  word: string | null;
  definition: Definition | null;
  isOpen: boolean;
  onClose: () => void;
  loading?: boolean;
}

export function DefinitionBottomSheet({
  word,
  definition,
  isOpen,
  onClose,
  loading = false
}: DefinitionBottomSheetProps) {
  const [dragConstraints, setDragConstraints] = useState({ top: 0, bottom: 0 });
  const sheetRef = useRef<HTMLDivElement>(null);

  // Update drag constraints when sheet opens
  useEffect(() => {
    if (isOpen && sheetRef.current) {
      const sheetHeight = sheetRef.current.offsetHeight;
      setDragConstraints({
        top: -50, // Allow slight upward drag
        bottom: sheetHeight * 0.7 // Allow dragging down 70% to dismiss
      });
    }
  }, [isOpen]);

  const handleDragEnd = (event: MouseEvent | TouchEvent | PointerEvent, info: PanInfo) => {
    // If dragged down more than 100px or with significant velocity, close
    if (info.offset.y > 100 || info.velocity.y > 300) {
      onClose();
    }
  };

  const triggerHaptic = () => {
    if ('vibrate' in navigator) {
      navigator.vibrate(5); // Short vibration
    }
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50">
        {/* Backdrop */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="absolute inset-0 bg-black/30"
          onClick={onClose}
        />

        {/* Bottom Sheet */}
        <motion.div
          ref={sheetRef}
          initial={{ y: '100%' }}
          animate={{ y: '0%' }}
          exit={{ y: '100%' }}
          drag="y"
          dragConstraints={dragConstraints}
          dragElastic={0.1}
          onDragEnd={handleDragEnd}
          className="absolute bottom-0 left-0 right-0 bg-[var(--bg-secondary)] rounded-t-2xl shadow-2xl border-2 border-[var(--accent-primary)]/20 border-b-0"
          style={{
            maxHeight: '70vh',
            minHeight: loading ? '200px' : '250px'
          }}
          transition={{
            type: 'spring',
            damping: 30,
            stiffness: 300
          }}
        >
          {/* Drag Handle */}
          <div className="flex justify-center pt-3 pb-2">
            <div
              className="w-12 h-1.5 bg-[var(--text-secondary)]/30 rounded-full cursor-grab active:cursor-grabbing"
              onTouchStart={triggerHaptic}
            />
          </div>

          {/* Content */}
          <div className="px-6 pb-6 overflow-y-auto" style={{ maxHeight: 'calc(70vh - 40px)' }}>
            {loading ? (
              <LoadingSkeleton />
            ) : definition ? (
              <DefinitionContent definition={definition} onClose={onClose} />
            ) : (
              <ErrorState word={word} onClose={onClose} />
            )}
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}

function LoadingSkeleton() {
  return (
    <div className="space-y-4 animate-pulse">
      {/* Word header skeleton */}
      <div className="flex items-center justify-between">
        <div className="h-8 w-32 bg-[var(--accent-primary)]/20 rounded"></div>
        <div className="h-6 w-12 bg-[var(--accent-primary)]/20 rounded-full"></div>
      </div>

      {/* Pronunciation skeleton */}
      <div className="h-4 w-24 bg-[var(--text-secondary)]/20 rounded"></div>

      {/* Definition skeleton */}
      <div className="space-y-2">
        <div className="h-4 w-full bg-[var(--text-secondary)]/20 rounded"></div>
        <div className="h-4 w-5/6 bg-[var(--text-secondary)]/20 rounded"></div>
        <div className="h-4 w-4/6 bg-[var(--text-secondary)]/20 rounded"></div>
      </div>

      {/* Example skeleton */}
      <div className="mt-4 space-y-2">
        <div className="h-4 w-20 bg-[var(--text-secondary)]/20 rounded"></div>
        <div className="h-4 w-full bg-[var(--text-secondary)]/20 rounded"></div>
      </div>
    </div>
  );
}

function DefinitionContent({ definition, onClose }: { definition: Definition; onClose: () => void }) {
  const [isPlayingAudio, setIsPlayingAudio] = useState(false);

  const playPronunciation = async () => {
    if (isPlayingAudio) return; // Prevent multiple clicks

    setIsPlayingAudio(true);

    try {
      // Haptic feedback
      if ('vibrate' in navigator) {
        navigator.vibrate(10);
      }

      console.log('🔊 Playing pronunciation for:', definition.word);

      // Try to play pronunciation with audio URL or fallback to TTS
      const success = await playWordPronunciation(
        definition.word,
        definition.audioUrl,
        definition.pronunciation || definition.phonetic
      );

      if (success) {
        console.log('🔊 Pronunciation played successfully');
      } else {
        console.log('🔊 Pronunciation failed, no audio available');
        // Additional haptic feedback for failure
        if ('vibrate' in navigator) {
          navigator.vibrate([50, 50, 50]); // Triple vibration for error
        }
      }

    } catch (error) {
      console.error('🔊 Error playing pronunciation:', error);
    } finally {
      // Reset button state after a delay
      setTimeout(() => {
        setIsPlayingAudio(false);
      }, 2000);
    }
  };

  const getCefrColor = (level?: string) => {
    switch (level) {
      case 'A1': return 'bg-green-100 text-green-800 border-green-200';
      case 'A2': return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'B1': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'B2': return 'bg-orange-100 text-orange-800 border-orange-200';
      case 'C1': return 'bg-red-100 text-red-800 border-red-200';
      case 'C2': return 'bg-purple-100 text-purple-800 border-purple-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  return (
    <div className="space-y-4">
      {/* Word Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <h2 className="text-2xl font-semibold text-[var(--text-accent)]" style={{ fontFamily: 'Playfair Display, serif' }}>
            {definition.word}
          </h2>
          {(definition.pronunciation || definition.phonetic || definition.audioUrl) && (
            <button
              onClick={playPronunciation}
              disabled={isPlayingAudio}
              className={`flex items-center justify-center w-10 h-10 rounded-full transition-all ${
                isPlayingAudio
                  ? 'bg-[var(--accent-primary)] text-white animate-pulse cursor-not-allowed'
                  : 'text-[var(--accent-primary)] hover:bg-[var(--accent-primary)]/10 hover:scale-110 active:scale-95'
              }`}
              title={isPlayingAudio ? 'Playing pronunciation...' : 'Play pronunciation'}
            >
              {isPlayingAudio ? (
                <span className="text-lg animate-pulse">🎵</span>
              ) : (
                <span className="text-lg">🔊</span>
              )}
            </button>
          )}
        </div>

        {definition.cefrLevel && (
          <div className={`px-2 py-1 rounded-full text-xs font-semibold border ${getCefrColor(definition.cefrLevel)}`}>
            {definition.cefrLevel}
          </div>
        )}
      </div>

      {/* Pronunciation */}
      {(definition.phonetic || definition.pronunciation) && (
        <div className="text-[var(--text-secondary)]" style={{ fontFamily: 'Source Serif Pro, serif' }}>
          /{definition.phonetic || definition.pronunciation}/
        </div>
      )}

      {/* Part of Speech */}
      {definition.partOfSpeech && (
        <div className="text-sm text-[var(--text-secondary)] italic">
          {definition.partOfSpeech}
        </div>
      )}

      {/* Definition */}
      <div className="border-l-4 border-[var(--accent-primary)]/30 pl-4 py-2">
        <p className="text-[var(--text-primary)] leading-relaxed" style={{ fontFamily: 'Source Serif Pro, serif' }}>
          {definition.definition}
        </p>
      </div>

      {/* Example */}
      {definition.example && (
        <div className="bg-[var(--bg-primary)]/50 rounded-lg p-4 border border-[var(--border-light)]">
          <div className="text-sm font-medium text-[var(--text-secondary)] mb-2">💭 Example:</div>
          <p className="text-[var(--text-primary)] italic" style={{ fontFamily: 'Source Serif Pro, serif' }}>
            "{definition.example}"
          </p>
        </div>
      )}

      {/* Actions */}
      <div className="flex gap-3 pt-2">
        <button
          className="flex-1 py-3 px-4 bg-[var(--accent-primary)] text-white rounded-lg hover:bg-[var(--accent-secondary)] transition-colors font-medium"
          style={{ fontFamily: 'Source Serif Pro, serif' }}
          onClick={() => {
            // TODO: Implement "Add to My Words" in later increment
            console.log('📚 Adding to My Words:', definition.word);
            if ('vibrate' in navigator) {
              navigator.vibrate(15);
            }
          }}
        >
          + Add to My Words
        </button>

        <button
          onClick={onClose}
          className="px-6 py-3 bg-[var(--bg-primary)] text-[var(--text-secondary)] rounded-lg hover:bg-[var(--accent-primary)]/10 hover:text-[var(--accent-primary)] transition-colors font-medium border border-[var(--border-light)]"
          style={{ fontFamily: 'Source Serif Pro, serif' }}
        >
          Close
        </button>
      </div>

      {/* Source */}
      {definition.source && (
        <div className="text-xs text-[var(--text-secondary)]/70 text-center pt-2">
          Source: {definition.source}
        </div>
      )}
    </div>
  );
}

function ErrorState({ word, onClose }: { word: string | null; onClose: () => void }) {
  return (
    <div className="text-center space-y-4 py-8">
      <div className="text-4xl mb-4">📖</div>
      <h3 className="text-lg font-semibold text-[var(--text-accent)]" style={{ fontFamily: 'Playfair Display, serif' }}>
        Definition not found
      </h3>
      <p className="text-[var(--text-secondary)]" style={{ fontFamily: 'Source Serif Pro, serif' }}>
        {word ? `Sorry, we couldn't find a definition for "${word}".` : 'No word selected.'}
      </p>
      <button
        onClick={onClose}
        className="px-6 py-3 bg-[var(--accent-primary)] text-white rounded-lg hover:bg-[var(--accent-secondary)] transition-colors font-medium"
        style={{ fontFamily: 'Source Serif Pro, serif' }}
      >
        Close
      </button>
    </div>
  );
}