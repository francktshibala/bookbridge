'use client';

import { useState, useEffect } from 'react';
import { AIChat } from '@/components/AIChat';
import { useESLMode } from '@/hooks/useESLMode';

export default function TestESLAIChat() {
  const { eslEnabled, eslLevel, nativeLanguage } = useESLMode();

  return (
    <div style={{
      minHeight: '100vh',
      background: 'linear-gradient(135deg, #1a1a2e 0%, #16213e 50%, #0f1419 100%)',
      padding: '20px'
    }}>
      <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
        <div style={{
          background: 'rgba(26, 32, 44, 0.95)',
          backdropFilter: 'blur(20px)',
          borderRadius: '16px',
          padding: '24px',
          marginBottom: '24px',
          border: '1px solid rgba(102, 126, 234, 0.3)'
        }}>
          <h1 style={{
            fontSize: '24px',
            fontWeight: '700',
            color: '#f7fafc',
            marginBottom: '16px'
          }}>
            🤖 ESL-Enhanced AI Chat Test
          </h1>
          
          <div style={{
            fontSize: '14px',
            color: '#cbd5e0',
            marginBottom: '16px'
          }}>
            <p><strong>Current ESL Status:</strong></p>
            <ul>
              <li>ESL Enabled: {eslEnabled ? '✅ Yes' : '❌ No'}</li>
              <li>CEFR Level: {eslLevel || 'Not set'}</li>
              <li>Native Language: {nativeLanguage || 'Not specified'}</li>
            </ul>
            
            {!eslEnabled && (
              <div style={{
                padding: '12px',
                background: 'rgba(251, 191, 36, 0.1)',
                border: '1px solid rgba(251, 191, 36, 0.3)',
                borderRadius: '8px',
                color: '#fbbf24',
                marginTop: '12px'
              }}>
                💡 To test ESL features, first enable ESL mode in your settings or reading page
              </div>
            )}
          </div>

          <div style={{
            fontSize: '12px',
            color: '#9ca3af',
            fontStyle: 'italic'
          }}>
            Try asking questions like: "What does symbolism mean in literature?" or "Explain the theme of Romeo and Juliet"
          </div>
        </div>

        <div style={{ height: '700px' }}>
          <AIChat
            bookId="gutenberg-100"
            bookTitle="Romeo and Juliet"
            bookContext="Romeo and Juliet by William Shakespeare - A tragic love story about two young star-crossed lovers whose deaths ultimately unite their feuding families."
          />
        </div>
      </div>
    </div>
  );
}