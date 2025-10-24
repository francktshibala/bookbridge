'use client';

import { useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
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
  const sheetRef = useRef<HTMLDivElement>(null);

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
        {/* Backdrop - clicking anywhere closes */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="absolute inset-0"
          onClick={onClose}
        />

        {/* Centered Compact Dictionary Modal */}
        <motion.div
          ref={sheetRef}
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.9, opacity: 0 }}
          className="relative bg-[var(--bg-secondary)] rounded-lg shadow-xl border-2 border-[var(--accent-primary)]/20 max-w-sm w-full"
          style={{
            maxHeight: '80vh',
            minHeight: loading ? '240px' : '280px'
          }}
          transition={{
            type: 'spring',
            damping: 25,
            stiffness: 400
          }}
        >
          {/* Modal Header */}
          <div className="flex items-center justify-between p-4 border-b border-[var(--border-light)]">
            <h2 className="text-lg font-semibold text-[var(--text-accent)]" style={{ fontFamily: 'Playfair Display, serif' }}>
              📖 Dictionary
            </h2>
            <button
              onClick={onClose}
              className="text-[var(--text-secondary)] hover:text-[var(--accent-primary)] text-xl transition-colors w-8 h-8 flex items-center justify-center rounded-full hover:bg-[var(--accent-primary)]/10"
            >
              ×
            </button>
          </div>

          {/* Modal Content */}
          <div className="p-4 overflow-y-auto" style={{ maxHeight: 'calc(80vh - 80px)' }}>
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


  return (
    <div className="space-y-2">
      {/* Clean Word Header */}
      <div className="flex items-center gap-2 mb-3">
        <h2 className="text-xl font-bold text-[var(--text-accent)]" style={{ fontFamily: 'Playfair Display, serif' }}>
          {definition.word}
        </h2>
        <button
            onClick={playPronunciation}
            disabled={isPlayingAudio}
            className={`flex items-center justify-center w-8 h-8 rounded-full transition-all ${
              isPlayingAudio
                ? 'bg-[var(--accent-primary)] text-white animate-pulse cursor-not-allowed'
                : 'text-[var(--accent-primary)] hover:bg-[var(--accent-primary)]/10 hover:scale-110 active:scale-95'
            }`}
            title={isPlayingAudio ? 'Playing pronunciation...' : 'Play pronunciation'}
          >
            {isPlayingAudio ? (
              <span className="text-sm animate-pulse">🎵</span>
            ) : (
              <span className="text-sm">🔊</span>
            )}
          </button>
      </div>

      {/* Pronunciation & Part of Speech */}
      <div className="flex items-center gap-3 text-sm">
        {(definition.phonetic || definition.pronunciation) && (
          <div className="text-[var(--text-secondary)]" style={{ fontFamily: 'Source Serif Pro, serif' }}>
            /{definition.phonetic || definition.pronunciation}/
          </div>
        )}
        {definition.partOfSpeech && (
          <div className="text-[var(--text-secondary)] italic font-medium">
            {definition.partOfSpeech}
          </div>
        )}
      </div>

      {/* Definition */}
      <div className="border-l-4 border-[var(--accent-primary)]/30 pl-3 py-1">
        <div className="flex items-start gap-2 mb-1">
          <span className="text-[var(--accent-primary)] mt-0.5">📖</span>
          <p className="text-[var(--text-primary)] leading-snug text-sm font-medium" style={{ fontFamily: 'Source Serif Pro, serif' }}>
            {definition.definition}
          </p>
        </div>
      </div>

      {/* Examples */}
      {definition.example && (
        <div className="bg-[var(--bg-primary)]/30 rounded-lg p-3 border border-[var(--border-light)]">
          <div className="flex items-start gap-2">
            <span className="text-[var(--accent-primary)] mt-0.5">💭</span>
            <div>
              <div className="text-xs font-semibold text-[var(--text-secondary)] mb-1">Examples:</div>
              <div className="space-y-1">
                {definition.example.split(' | ').map((example, index) => (
                  <p key={index} className="text-[var(--text-primary)] italic text-sm leading-snug" style={{ fontFamily: 'Source Serif Pro, serif' }}>
                    "{example.trim()}"
                  </p>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Action */}
      <div className="pt-2">
        <button
          className="w-full py-2 px-3 bg-[var(--accent-primary)] text-white rounded-md hover:bg-[var(--accent-secondary)] transition-colors font-medium text-sm"
          style={{ fontFamily: 'Source Serif Pro, serif' }}
          onClick={() => {
            // TODO: Implement "Add to My Words" in later increment
            console.log('📚 Adding to My Words:', definition.word);
            if ('vibrate' in navigator) {
              navigator.vibrate(15);
            }
          }}
        >
          📌 Add to My Words
        </button>
      </div>

    </div>
  );
}

function ErrorState({ word, onClose }: { word: string | null; onClose: () => void }) {
  return (
    <div className="text-center space-y-4 py-6">
      <div className="text-4xl mb-4">📖</div>
      <h3 className="text-lg font-semibold text-[var(--text-accent)]" style={{ fontFamily: 'Playfair Display, serif' }}>
        Definition not found
      </h3>
      <p className="text-[var(--text-secondary)]" style={{ fontFamily: 'Source Serif Pro, serif' }}>
        {word ? `Sorry, we couldn't find a definition for "${word}".` : 'No word selected.'}
      </p>
    </div>
  );
}