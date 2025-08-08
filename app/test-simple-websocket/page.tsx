'use client';

import React, { useState } from 'react';

export default function TestSimpleWebSocket() {
  const [results, setResults] = useState<string[]>([]);
  const [isRunning, setIsRunning] = useState(false);
  
  const addLog = (message: string) => {
    setResults(prev => [...prev, `${new Date().toLocaleTimeString()}: ${message}`]);
  };

  const testWebSocketHighlighting = async () => {
    setIsRunning(true);
    setResults([]);
    
    const testText = "Hello world! This is a test.";
    addLog(`🧪 Testing WebSocket highlighting with: "${testText}"`);
    addLog(`🧪 Text length: ${testText.length} characters`);
    
    try {
      const { voiceService } = await import('@/lib/voice-service');
      
      let characterCount = 0;
      let wordHighlights: Array<{char: string, time: number, wordIndex: number}> = [];
      
      await voiceService.speak({
        text: testText,
        settings: {
          provider: 'elevenlabs-websocket' as any,
          volume: 0.8,
          rate: 0.9
        },
        onStart: () => {
          addLog(`✅ Audio started`);
        },
        onCharacterBoundary: (info) => {
          characterCount++;
          wordHighlights.push({
            char: info.character,
            time: info.elapsedTime,
            wordIndex: info.wordIndex
          });
          addLog(`📍 Char ${characterCount}: "${info.character}" -> Word ${info.wordIndex} at ${info.elapsedTime.toFixed(2)}s`);
        },
        onEnd: () => {
          addLog(`✅ Audio completed`);
          addLog(`📊 Total character events: ${characterCount}`);
          addLog(`📊 Total word highlights: ${new Set(wordHighlights.map(h => h.wordIndex)).size}`);
          addLog(`📊 Word progression: ${wordHighlights.map(h => h.wordIndex).join(' -> ')}`);
          setIsRunning(false);
        },
        onError: (error) => {
          addLog(`❌ Error: ${error}`);
          setIsRunning(false);
        }
      });
      
    } catch (error) {
      addLog(`❌ Test failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
      setIsRunning(false);
    }
  };

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold mb-8">🧪 Simple WebSocket Test</h1>
      
      <div className="mb-6">
        <button
          onClick={testWebSocketHighlighting}
          disabled={isRunning}
          className={`px-6 py-3 rounded-lg font-medium ${
            isRunning 
              ? 'bg-gray-300 cursor-not-allowed' 
              : 'bg-blue-500 hover:bg-blue-600 text-white'
          }`}
        >
          {isRunning ? 'Testing...' : 'Test WebSocket Highlighting'}
        </button>
      </div>

      {results.length > 0 && (
        <div className="bg-gray-900 text-green-400 p-4 rounded-lg font-mono text-sm max-h-96 overflow-y-auto">
          <h3 className="text-white font-bold mb-2">Test Results:</h3>
          {results.map((result, index) => (
            <div key={index} className="mb-1">
              {result}
            </div>
          ))}
        </div>
      )}
      
      <div className="mt-8 text-sm text-gray-600">
        <p><strong>What this test does:</strong></p>
        <ul className="list-disc list-inside ml-4 space-y-1">
          <li>Tests WebSocket highlighting with short, simple text</li>
          <li>Logs every character timing event</li>
          <li>Shows word progression sequence</li>
          <li>Reveals character overflow and mapping issues</li>
        </ul>
      </div>
    </div>
  );
}