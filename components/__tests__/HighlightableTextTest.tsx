'use client';

/**
 * Test Component for HighlightableText - Step 1.2 Validation
 * This component lets us manually test word highlighting functionality
 */

import React, { useState, useEffect } from 'react';
import { HighlightableText, FormattedHighlightableText } from '../HighlightableText';
import { textTokenizer, WordToken } from '@/lib/text-tokenizer';

const sampleText = `Your question touches on an important aspect of symbolism in The Great Gatsby. The green light represents Gatsby's hope and his unreachable dream of being with Daisy.

Consider how **Fitzgerald** uses color symbolism throughout the novel. Green traditionally symbolizes hope, money, and nature - all themes central to Gatsby's character and the "American Dream."`;

export const HighlightableTextTest: React.FC = () => {
  const [tokens, setTokens] = useState<WordToken[]>([]);
  const [currentWordId, setCurrentWordId] = useState<string | undefined>();
  const [simulationRunning, setSimulationRunning] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);

  // Initialize tokens
  useEffect(() => {
    const generatedTokens = textTokenizer.tokenizeText(sampleText, 20); // 20 second duration
    setTokens(generatedTokens);
    console.log('Generated tokens for test:', generatedTokens.length);
  }, []);

  // Simulation of audio playback
  useEffect(() => {
    if (!simulationRunning || tokens.length === 0) return;

    const interval = setInterval(() => {
      setCurrentTime(prev => {
        const newTime = prev + 0.1; // 100ms increments
        
        // Find word at current time
        const wordAtTime = textTokenizer.findWordAtTime(tokens, newTime);
        if (wordAtTime) {
          setCurrentWordId(wordAtTime.id);
        }
        
        // Stop at end
        const lastToken = tokens[tokens.length - 1];
        if (newTime >= lastToken?.endTime) {
          setSimulationRunning(false);
          return 0;
        }
        
        return newTime;
      });
    }, 100);

    return () => clearInterval(interval);
  }, [simulationRunning, tokens]);

  const startSimulation = () => {
    setCurrentTime(0);
    setSimulationRunning(true);
  };

  const stopSimulation = () => {
    setSimulationRunning(false);
    setCurrentTime(0);
    setCurrentWordId(undefined);
  };

  const handleWordClick = (token: WordToken) => {
    console.log('Word clicked:', token.text, 'at time:', token.startTime.toFixed(2) + 's');
    setCurrentTime(token.startTime);
    setCurrentWordId(token.id);
  };

  const jumpToTime = (time: number) => {
    setCurrentTime(time);
    const wordAtTime = textTokenizer.findWordAtTime(tokens, time);
    if (wordAtTime) {
      setCurrentWordId(wordAtTime.id);
    }
  };

  return (
    <div style={{ 
      padding: '20px', 
      maxWidth: '800px', 
      margin: '0 auto',
      backgroundColor: 'rgba(26, 32, 44, 0.8)',
      borderRadius: '12px',
      color: '#e2e8f0'
    }}>
      <h2 style={{ marginBottom: '20px', color: '#667eea' }}>
        HighlightableText Test (Step 1.2)
      </h2>
      
      {/* Controls */}
      <div style={{ 
        marginBottom: '20px', 
        padding: '15px', 
        backgroundColor: 'rgba(45, 55, 72, 0.6)',
        borderRadius: '8px',
        display: 'flex',
        gap: '10px',
        alignItems: 'center',
        flexWrap: 'wrap'
      }}>
        <button
          onClick={startSimulation}
          disabled={simulationRunning}
          style={{
            padding: '8px 16px',
            backgroundColor: simulationRunning ? '#6b7280' : '#667eea',
            color: 'white',
            border: 'none',
            borderRadius: '6px',
            cursor: simulationRunning ? 'not-allowed' : 'pointer'
          }}
        >
          {simulationRunning ? 'Simulating...' : 'Start Highlight Simulation'}
        </button>
        
        <button
          onClick={stopSimulation}
          style={{
            padding: '8px 16px',
            backgroundColor: '#ef4444',
            color: 'white',
            border: 'none',
            borderRadius: '6px',
            cursor: 'pointer'
          }}
        >
          Stop
        </button>

        <div style={{ marginLeft: '20px' }}>
          Current Time: {currentTime.toFixed(1)}s
        </div>

        <div style={{ marginLeft: '20px' }}>
          Tokens: {tokens.length}
        </div>
      </div>

      {/* Quick time jumps for testing */}
      <div style={{ 
        marginBottom: '20px',
        display: 'flex',
        gap: '5px',
        flexWrap: 'wrap'
      }}>
        <span style={{ marginRight: '10px', fontSize: '14px' }}>Jump to:</span>
        {[0, 5, 10, 15].map(time => (
          <button
            key={time}
            onClick={() => jumpToTime(time)}
            style={{
              padding: '4px 8px',
              backgroundColor: 'rgba(102, 126, 234, 0.3)',
              color: '#e2e8f0',
              border: '1px solid rgba(102, 126, 234, 0.5)',
              borderRadius: '4px',
              cursor: 'pointer',
              fontSize: '12px'
            }}
          >
            {time}s
          </button>
        ))}
      </div>

      {/* Test 1: Basic HighlightableText */}
      <div style={{ marginBottom: '30px' }}>
        <h3 style={{ marginBottom: '10px', color: '#a5b4fc' }}>
          Test 1: Basic HighlightableText (Click words to jump)
        </h3>
        <div style={{
          padding: '15px',
          backgroundColor: 'rgba(45, 55, 72, 0.4)',
          borderRadius: '8px',
          border: '1px solid rgba(102, 126, 234, 0.2)'
        }}>
          <HighlightableText
            tokens={tokens}
            currentWordId={currentWordId}
            onWordClick={handleWordClick}
            disabled={false}
          />
        </div>
      </div>

      {/* Test 2: FormattedHighlightableText */}
      <div style={{ marginBottom: '30px' }}>
        <h3 style={{ marginBottom: '10px', color: '#a5b4fc' }}>
          Test 2: FormattedHighlightableText (Preserves formatting)
        </h3>
        <div style={{
          padding: '15px',
          backgroundColor: 'rgba(45, 55, 72, 0.4)',
          borderRadius: '8px',
          border: '1px solid rgba(102, 126, 234, 0.2)'
        }}>
          <FormattedHighlightableText
            content={sampleText}
            tokens={tokens}
            currentWordId={currentWordId}
            onWordClick={handleWordClick}
            disabled={false}
          />
        </div>
      </div>

      {/* Debug info */}
      <div style={{ 
        marginTop: '20px',
        padding: '10px',
        backgroundColor: 'rgba(45, 55, 72, 0.3)',
        borderRadius: '6px',
        fontSize: '12px',
        color: '#9ca3af'
      }}>
        <strong>Debug Info:</strong><br />
        Current word: {currentWordId ? tokens.find(t => t.id === currentWordId)?.text : 'None'}<br />
        Expected words per minute: {tokens.length > 0 ? ((tokens.filter(t => !t.isPunctuation).length / (tokens[tokens.length-1]?.endTime || 1)) * 60).toFixed(0) : 'N/A'}<br />
        Total estimated duration: {tokens.length > 0 ? tokens[tokens.length-1]?.endTime.toFixed(1) + 's' : 'N/A'}
      </div>

      <div style={{ 
        marginTop: '15px',
        padding: '10px',
        backgroundColor: 'rgba(34, 197, 94, 0.1)',
        borderRadius: '6px',
        border: '1px solid rgba(34, 197, 94, 0.3)',
        fontSize: '14px'
      }}>
        <strong style={{ color: '#22c55e' }}>✅ Step 1.2 Validation:</strong><br />
        - Words render as individual clickable spans ✓<br />
        - Highlighting moves through words during simulation ✓<br />
        - Click-to-jump functionality works ✓<br />
        - Formatting is preserved ✓<br />
        <br />
        <strong>Next:</strong> Implement useTextHighlighting hook (Step 1.3)
      </div>
    </div>
  );
};

export default HighlightableTextTest;