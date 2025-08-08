'use client';

import React, { useState } from 'react';

export default function DebugWebSocketSimple() {
  const [isDebugging, setIsDebugging] = useState(false);
  
  const runSimpleTest = async () => {
    setIsDebugging(true);
    console.clear();
    console.log('🚀 STARTING SIMPLE WEBSOCKET DEBUG TEST');
    
    const testText = "Hello world test.";
    console.log(`📝 Test Text: "${testText}" (${testText.length} chars)`);
    
    try {
      const { voiceService } = await import('@/lib/voice-service');
      
      let characterEvents = 0;
      let wordEvents = 0;
      
      await voiceService.speak({
        text: testText,  
        settings: {
          provider: 'elevenlabs-websocket' as any,
          volume: 0.5,
          rate: 1.0
        },
        onStart: () => {
          console.log('🎤 WEBSOCKET AUDIO STARTED');
        },
        onCharacterBoundary: (info) => {
          characterEvents++;
          wordEvents++;
          console.log(`🎯 WORD HIGHLIGHT #${wordEvents}: Word ${info.wordIndex} at ${info.elapsedTime.toFixed(2)}s (from char "${info.character}")`);
        },
        onEnd: () => {
          console.log('🏁 WEBSOCKET AUDIO COMPLETED');
          console.log(`📊 Total character events: ${characterEvents}`);
          console.log(`📊 Total word events: ${wordEvents}`);
          setIsDebugging(false);
        },
        onError: (error) => {
          console.error('❌ WEBSOCKET ERROR:', error);
          setIsDebugging(false);
        }
      });
      
    } catch (error) {
      console.error('💥 TEST ERROR:', error);
      setIsDebugging(false);
    }
  };

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold mb-6">🔬 WebSocket Debug (Console Only)</h1>
      
      <div className="bg-yellow-50 p-4 rounded-lg mb-6">
        <p className="text-sm">
          <strong>Instructions:</strong> Click the button below, then open your browser's Developer Console (F12) 
          to see detailed WebSocket debugging logs. Look for logs starting with 🔍 SIMPLE-FIX.
        </p>
      </div>
      
      <button
        onClick={runSimpleTest}
        disabled={isDebugging}
        className={`px-6 py-3 rounded-lg font-medium ${
          isDebugging 
            ? 'bg-gray-300 cursor-not-allowed' 
            : 'bg-red-500 hover:bg-red-600 text-white'
        }`}
      >
        {isDebugging ? '🔍 Debugging... (Check Console)' : '🚀 Start WebSocket Debug Test'}
      </button>
      
      <div className="mt-8 text-sm text-gray-600">
        <p><strong>What to look for in the console:</strong></p>
        <ul className="list-disc list-inside ml-4 space-y-1">
          <li>🔍 SIMPLE-FIX: Character timing events</li>
          <li>🎯 WORD HIGHLIGHT: When words get highlighted</li>
          <li>Word progression should be: 0 → 1 → 2 (for "Hello world test.")</li>
          <li>Any error messages or stuck highlighting</li>
        </ul>
      </div>
    </div>
  );
}