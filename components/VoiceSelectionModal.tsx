'use client';

import React, { useState } from 'react';
import { X } from 'lucide-react';

export interface VoiceOption {
  id: string;
  name: string;
  gender: 'male' | 'female';
  provider: 'openai' | 'elevenlabs';
  previewUrl?: string;
}

interface VoiceSelectionModalProps {
  isOpen: boolean;
  onClose: () => void;
  selectedVoice: string;
  onVoiceSelect: (voiceId: string) => void;
  onPreviewVoice?: (voiceId: string) => void;
}

const voiceOptions: VoiceOption[] = [
  // OpenAI voices
  { id: 'alloy', name: 'Alloy', gender: 'male', provider: 'openai' },
  { id: 'echo', name: 'Echo', gender: 'male', provider: 'openai' },
  { id: 'onyx', name: 'Onyx', gender: 'male', provider: 'openai' },
  { id: 'nova', name: 'Nova', gender: 'female', provider: 'openai' },
  { id: 'shimmer', name: 'Shimmer', gender: 'female', provider: 'openai' },
  { id: 'fable', name: 'Fable', gender: 'female', provider: 'openai' },
  
  // ElevenLabs voices
  { id: 'pNInz6obpgDQGcFmaJgB', name: 'Adam', gender: 'male', provider: 'elevenlabs' },
  { id: 'VR6AewLTigWG4xSOukaG', name: 'Arnold', gender: 'male', provider: 'elevenlabs' },
  { id: 'EXAVITQu4vr4xnSDxMaL', name: 'Bella', gender: 'female', provider: 'elevenlabs' },
  { id: 'ErXwobaYiN019PkySvjV', name: 'Antoni', gender: 'male', provider: 'elevenlabs' },
  { id: 'MF3mGyEYCl7XYWbV9V6O', name: 'Elli', gender: 'female', provider: 'elevenlabs' },
  { id: 'TxGEqnHWrfWFTfGW9XjX', name: 'Josh', gender: 'male', provider: 'elevenlabs' },
];

export function VoiceSelectionModal({
  isOpen,
  onClose,
  selectedVoice,
  onVoiceSelect,
  onPreviewVoice
}: VoiceSelectionModalProps) {
  const [selectedProvider, setSelectedProvider] = useState<'openai' | 'elevenlabs'>('openai');

  if (!isOpen) return null;

  const maleVoices = voiceOptions.filter(voice => voice.gender === 'male' && voice.provider === selectedProvider);
  const femaleVoices = voiceOptions.filter(voice => voice.gender === 'female' && voice.provider === selectedProvider);

  const handleVoiceSelect = (voiceId: string) => {
    onVoiceSelect(voiceId);
    onClose();
  };

  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      backgroundColor: 'rgba(0, 0, 0, 0.7)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 1000,
    }}>
      <div style={{
        backgroundColor: '#1e293b',
        borderRadius: '16px',
        padding: '24px',
        width: '90%',
        maxWidth: '500px',
        maxHeight: '80vh',
        overflowY: 'auto',
        border: '1px solid #334155',
        boxShadow: '0 8px 32px rgba(0,0,0,0.4)',
      }}>
        {/* Header */}
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: '24px',
        }}>
          <h2 style={{
            fontSize: '20px',
            fontWeight: '700',
            color: '#e2e8f0',
            margin: 0,
          }}>
            Select Voice
          </h2>
          <button
            onClick={onClose}
            style={{
              background: 'none',
              border: 'none',
              color: '#94a3b8',
              cursor: 'pointer',
              padding: '4px',
              borderRadius: '4px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <X size={20} />
          </button>
        </div>

        {/* Provider Selector */}
        <div style={{ marginBottom: '24px' }}>
          <div style={{
            display: 'flex',
            gap: '8px',
            backgroundColor: '#0f172a',
            padding: '4px',
            borderRadius: '8px',
          }}>
            <button
              onClick={() => setSelectedProvider('openai')}
              style={{
                flex: 1,
                padding: '8px 16px',
                border: 'none',
                borderRadius: '6px',
                backgroundColor: selectedProvider === 'openai' ? '#667eea' : 'transparent',
                color: selectedProvider === 'openai' ? 'white' : '#94a3b8',
                cursor: 'pointer',
                fontSize: '14px',
                fontWeight: '500',
                transition: 'all 0.2s',
              }}
            >
              OpenAI
            </button>
            <button
              onClick={() => setSelectedProvider('elevenlabs')}
              style={{
                flex: 1,
                padding: '8px 16px',
                border: 'none',
                borderRadius: '6px',
                backgroundColor: selectedProvider === 'elevenlabs' ? '#667eea' : 'transparent',
                color: selectedProvider === 'elevenlabs' ? 'white' : '#94a3b8',
                cursor: 'pointer',
                fontSize: '14px',
                fontWeight: '500',
                transition: 'all 0.2s',
              }}
            >
              ElevenLabs
            </button>
          </div>
        </div>

        {/* Voice Options */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          {/* Male Voices */}
          <div>
            <h3 style={{
              fontSize: '16px',
              fontWeight: '600',
              color: '#667eea',
              marginBottom: '12px',
              margin: '0 0 12px 0',
            }}>
              Male Voices
            </h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {maleVoices.map((voice) => (
                <div
                  key={voice.id}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '12px',
                    borderRadius: '8px',
                    backgroundColor: selectedVoice === voice.id ? 'rgba(102, 126, 234, 0.2)' : '#334155',
                    border: selectedVoice === voice.id ? '1px solid #667eea' : '1px solid transparent',
                    cursor: 'pointer',
                    transition: 'all 0.2s',
                  }}
                  onClick={() => handleVoiceSelect(voice.id)}
                >
                  <span style={{
                    color: selectedVoice === voice.id ? '#667eea' : '#e2e8f0',
                    fontSize: '14px',
                    fontWeight: '500',
                  }}>
                    {voice.name}
                  </span>
                  {onPreviewVoice && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onPreviewVoice(voice.id);
                      }}
                      style={{
                        background: 'none',
                        border: '1px solid #667eea',
                        color: '#667eea',
                        padding: '4px 8px',
                        borderRadius: '4px',
                        cursor: 'pointer',
                        fontSize: '12px',
                        fontWeight: '500',
                      }}
                    >
                      Preview
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Female Voices */}
          <div>
            <h3 style={{
              fontSize: '16px',
              fontWeight: '600',
              color: '#f472b6',
              marginBottom: '12px',
              margin: '0 0 12px 0',
            }}>
              Female Voices
            </h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {femaleVoices.map((voice) => (
                <div
                  key={voice.id}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '12px',
                    borderRadius: '8px',
                    backgroundColor: selectedVoice === voice.id ? 'rgba(244, 114, 182, 0.2)' : '#334155',
                    border: selectedVoice === voice.id ? '1px solid #f472b6' : '1px solid transparent',
                    cursor: 'pointer',
                    transition: 'all 0.2s',
                  }}
                  onClick={() => handleVoiceSelect(voice.id)}
                >
                  <span style={{
                    color: selectedVoice === voice.id ? '#f472b6' : '#e2e8f0',
                    fontSize: '14px',
                    fontWeight: '500',
                  }}>
                    {voice.name}
                  </span>
                  {onPreviewVoice && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onPreviewVoice(voice.id);
                      }}
                      style={{
                        background: 'none',
                        border: '1px solid #f472b6',
                        color: '#f472b6',
                        padding: '4px 8px',
                        borderRadius: '4px',
                        cursor: 'pointer',
                        fontSize: '12px',
                        fontWeight: '500',
                      }}
                    >
                      Preview
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}