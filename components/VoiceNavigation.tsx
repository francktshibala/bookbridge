'use client';

import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { AccessibleWrapper } from '@/components/AccessibleWrapper';
import { useAccessibility } from '@/contexts/AccessibilityContext';

interface VoiceNavigationProps {
  onVoiceCommand?: (command: string, transcript: string) => void;
  disabled?: boolean;
  className?: string;
}

interface SpeechRecognitionEvent extends Event {
  results: SpeechRecognitionResultList;
  resultIndex: number;
}

interface SpeechRecognitionErrorEvent extends Event {
  error: string;
  message: string;
}

interface SpeechRecognition extends EventTarget {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  start(): void;
  stop(): void;
  abort(): void;
  addEventListener(type: 'result', listener: (event: SpeechRecognitionEvent) => void): void;
  addEventListener(type: 'error', listener: (event: SpeechRecognitionErrorEvent) => void): void;
  addEventListener(type: 'start' | 'end', listener: () => void): void;
}

declare global {
  interface Window {
    SpeechRecognition: new () => SpeechRecognition;
    webkitSpeechRecognition: new () => SpeechRecognition;
  }
}

const VOICE_COMMANDS = {
  'go home': { action: 'navigate-home', description: 'Navigate to home page' },
  'go to library': { action: 'navigate-library', description: 'Navigate to library' },
  'start reading': { action: 'start-reading', description: 'Begin reading current book' },
  'ask question': { action: 'open-chat', description: 'Open AI chat interface' },
  'next page': { action: 'next-page', description: 'Go to next page' },
  'previous page': { action: 'prev-page', description: 'Go to previous page' },
  'increase text size': { action: 'text-larger', description: 'Make text larger' },
  'decrease text size': { action: 'text-smaller', description: 'Make text smaller' },
  'high contrast': { action: 'toggle-contrast', description: 'Toggle high contrast mode' },
  'stop listening': { action: 'stop-voice', description: 'Stop voice navigation' },
};

export const VoiceNavigation: React.FC<VoiceNavigationProps> = ({
  onVoiceCommand,
  disabled = false,
  className = ''
}) => {
  const { announceToScreenReader } = useAccessibility();
  const [isListening, setIsListening] = useState(false);
  const [isSupported, setIsSupported] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [confidence, setConfidence] = useState(0);
  const [showCommands, setShowCommands] = useState(false);
  
  const recognitionRef = useRef<SpeechRecognition | null>(null);
  const animationRef = useRef<number>(0);

  // Check for speech recognition support
  useEffect(() => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (SpeechRecognition) {
      setIsSupported(true);
      recognitionRef.current = new SpeechRecognition();
      
      // Configure recognition
      const recognition = recognitionRef.current;
      recognition.continuous = true;
      recognition.interimResults = true;
      recognition.lang = 'en-US';

      // Handle results
      recognition.addEventListener('result', (event: SpeechRecognitionEvent) => {
        let finalTranscript = '';
        let interimTranscript = '';

        for (let i = event.resultIndex; i < event.results.length; i++) {
          const transcript = event.results[i][0].transcript;
          const confidence = event.results[i][0].confidence;
          
          if (event.results[i].isFinal) {
            finalTranscript += transcript;
            setConfidence(confidence);
          } else {
            interimTranscript += transcript;
          }
        }

        const fullTranscript = finalTranscript || interimTranscript;
        setTranscript(fullTranscript);

        // Process voice commands
        if (finalTranscript) {
          processVoiceCommand(finalTranscript.toLowerCase().trim());
        }
      });

      // Handle errors
      recognition.addEventListener('error', (event: SpeechRecognitionErrorEvent) => {
        console.error('Speech recognition error:', event.error);
        setError(`Voice recognition error: ${event.error}`);
        setIsListening(false);
        announceToScreenReader(`Voice recognition error: ${event.error}`, 'assertive');
      });

      // Handle start/end
      recognition.addEventListener('start', () => {
        setIsListening(true);
        setError(null);
        announceToScreenReader('Voice navigation started. Speak a command.', 'polite');
      });

      recognition.addEventListener('end', () => {
        setIsListening(false);
        setTranscript('');
        announceToScreenReader('Voice navigation stopped.', 'polite');
      });
    }

    return () => {
      if (recognitionRef.current) {
        recognitionRef.current.abort();
      }
    };
  }, [announceToScreenReader]);

  const processVoiceCommand = (transcript: string) => {
    // Find matching command
    const matchedCommand = Object.entries(VOICE_COMMANDS).find(([command]) => 
      transcript.includes(command)
    );

    if (matchedCommand) {
      const [commandText, commandInfo] = matchedCommand;
      announceToScreenReader(`Command recognized: ${commandInfo.description}`, 'assertive');
      
      if (onVoiceCommand) {
        onVoiceCommand(commandInfo.action, transcript);
      }

      // Auto-stop after command
      setTimeout(() => {
        stopListening();
      }, 1000);
    } else {
      announceToScreenReader(`Command not recognized: "${transcript}". Say "show commands" to see available options.`, 'assertive');
    }
  };

  const startListening = () => {
    if (!isSupported || disabled) return;
    
    try {
      recognitionRef.current?.start();
    } catch (error) {
      console.error('Failed to start speech recognition:', error);
      setError('Failed to start voice navigation');
    }
  };

  const stopListening = () => {
    if (recognitionRef.current) {
      recognitionRef.current.stop();
    }
  };

  const toggleListening = () => {
    if (isListening) {
      stopListening();
    } else {
      startListening();
    }
  };

  // Wave animation for listening state
  const WaveAnimation = () => (
    <div style={{ 
      display: 'flex', 
      alignItems: 'center', 
      gap: '4px',
      height: '32px',
      justifyContent: 'center'
    }}>
      {[...Array(5)].map((_, index) => (
        <motion.div
          key={index}
          animate={{
            scaleY: isListening ? [1, 2, 1] : 1,
            opacity: isListening ? [0.5, 1, 0.5] : 0.3
          }}
          transition={{
            duration: 1,
            repeat: isListening ? Infinity : 0,
            delay: index * 0.1,
            ease: "easeInOut"
          }}
          style={{
            width: '4px',
            height: '16px',
            borderRadius: '2px',
            background: isListening 
              ? 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)'
              : '#e0e7ff',
            transformOrigin: 'center'
          }}
        />
      ))}
    </div>
  );

  if (!isSupported) {
    return null; // Don't render if not supported
  }

  return (
    <AccessibleWrapper
      as="div"
      className={className}
      aria-live="polite"
      style={{
        position: 'fixed',
        bottom: '24px',
        right: '24px',
        zIndex: 1000
      }}
    >
      <motion.div
        initial={{ scale: 0, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ duration: 0.3, ease: "easeOut" }}
        style={{
          background: 'rgba(255, 255, 255, 0.95)',
          backdropFilter: 'blur(10px)',
          borderRadius: '20px',
          padding: '16px',
          boxShadow: '0 8px 32px rgba(0, 0, 0, 0.12)',
          border: '1px solid rgba(255, 255, 255, 0.2)',
          minWidth: '200px'
        }}
      >
        {/* Main Voice Button */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '12px' }}>
          <motion.button
            onClick={toggleListening}
            disabled={disabled}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            style={{
              padding: '12px',
              borderRadius: '12px',
              border: 'none',
              background: isListening
                ? 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)'
                : '#f0f4ff',
              color: isListening ? 'white' : '#667eea',
              cursor: disabled ? 'not-allowed' : 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              fontSize: '14px',
              fontWeight: '600',
              fontFamily: '"Inter", "Segoe UI", system-ui, sans-serif',
              opacity: disabled ? 0.5 : 1,
              transition: 'all 0.2s ease'
            }}
            aria-label={isListening ? 'Stop voice navigation' : 'Start voice navigation'}
            aria-pressed={isListening}
          >
            <span style={{ fontSize: '16px' }}>
              {isListening ? '🛑' : '🎤'}
            </span>
            {isListening ? 'Listening...' : 'Voice Nav'}
          </motion.button>

          <motion.button
            onClick={() => setShowCommands(!showCommands)}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            style={{
              padding: '8px',
              borderRadius: '8px',
              border: '1px solid #e0e7ff',
              background: 'white',
              color: '#667eea',
              cursor: 'pointer',
              fontSize: '12px',
              fontWeight: '500',
              fontFamily: '"Inter", "Segoe UI", system-ui, sans-serif'
            }}
            aria-label="Show voice commands"
            aria-expanded={showCommands}
          >
            ❓
          </motion.button>
        </div>

        {/* Wave Animation */}
        <WaveAnimation />

        {/* Current Transcript */}
        <AnimatePresence>
          {transcript && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              style={{
                marginTop: '12px',
                padding: '8px 12px',
                background: '#f8faff',
                borderRadius: '8px',
                border: '1px solid #e0e7ff',
                fontSize: '12px',
                color: '#374151',
                fontFamily: '"Inter", "Segoe UI", system-ui, sans-serif',
                minHeight: '20px'
              }}
            >
              <div style={{ 
                fontSize: '10px', 
                color: '#667eea', 
                marginBottom: '4px',
                textTransform: 'uppercase',
                letterSpacing: '0.5px',
                fontWeight: '600'
              }}>
                {isListening ? 'Listening' : 'Heard'}:
              </div>
              "{transcript}"
              {confidence > 0 && (
                <div style={{ 
                  fontSize: '10px', 
                  color: '#9ca3af', 
                  marginTop: '4px' 
                }}>
                  Confidence: {Math.round(confidence * 100)}%
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>

        {/* Error Display */}
        <AnimatePresence>
          {error && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              style={{
                marginTop: '8px',
                padding: '8px 12px',
                background: '#fef2f2',
                borderRadius: '8px',
                border: '1px solid #fca5a5',
                fontSize: '12px',
                color: '#dc2626',
                fontFamily: '"Inter", "Segoe UI", system-ui, sans-serif'
              }}
              role="alert"
            >
              {error}
            </motion.div>
          )}
        </AnimatePresence>

        {/* Voice Commands List */}
        <AnimatePresence>
          {showCommands && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              style={{
                marginTop: '12px',
                padding: '12px',
                background: '#f8faff',
                borderRadius: '12px',
                border: '1px solid #e0e7ff',
                overflow: 'hidden'
              }}
            >
              <div style={{
                fontSize: '12px',
                fontWeight: '600',
                color: '#667eea',
                marginBottom: '8px',
                fontFamily: '"Inter", "Segoe UI", system-ui, sans-serif',
                textTransform: 'uppercase',
                letterSpacing: '0.5px'
              }}>
                Available Commands:
              </div>
              <div style={{ maxHeight: '200px', overflowY: 'auto' }}>
                {Object.entries(VOICE_COMMANDS).map(([command, info]) => (
                  <div
                    key={command}
                    style={{
                      padding: '4px 0',
                      borderBottom: '1px solid rgba(224, 231, 255, 0.5)',
                      fontSize: '11px',
                      fontFamily: '"Inter", "Segoe UI", system-ui, sans-serif'
                    }}
                  >
                    <div style={{ 
                      fontWeight: '600', 
                      color: '#374151',
                      marginBottom: '2px'
                    }}>
                      "{command}"
                    </div>
                    <div style={{ color: '#6b7280', fontSize: '10px' }}>
                      {info.description}
                    </div>
                  </div>
                ))}
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Keyboard Shortcut Hint */}
        <div style={{
          marginTop: '8px',
          fontSize: '10px',
          color: '#9ca3af',
          textAlign: 'center',
          fontFamily: '"Inter", "Segoe UI", system-ui, sans-serif'
        }}>
          Press <kbd style={{
            background: '#f3f4f6',
            border: '1px solid #d1d5db',
            borderRadius: '3px',
            padding: '1px 4px',
            fontSize: '9px'
          }}>V</kbd> to toggle voice navigation
        </div>
      </motion.div>
    </AccessibleWrapper>
  );
};