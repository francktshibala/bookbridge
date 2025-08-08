'use client';

import React from 'react';
import { AudioPlayerWithHighlighting } from '@/components/AudioPlayerWithHighlighting';

export default function TestWebSocketTTS() {
  const testText = "Hello world! This is a test of ElevenLabs WebSocket text-to-speech with perfect synchronization.";
  
  // Force cache refresh
  React.useEffect(() => {
    console.log('🧪 Test page loaded at:', new Date().toISOString());
  }, []);

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold mb-8">ElevenLabs WebSocket TTS Test</h1>
      
      <div className="bg-blue-50 p-4 rounded-lg mb-6">
        <h2 className="text-lg font-semibold mb-2">🧪 Test Instructions</h2>
        <ol className="list-decimal list-inside space-y-1 text-sm">
          <li>Select "ElevenLabs WebSocket (Perfect Sync)" from the dropdown</li>
          <li>Click Play to test the WebSocket TTS</li>
          <li>Watch for perfect word-by-word highlighting sync</li>
          <li>Check browser console for detailed timing logs</li>
        </ol>
        <p className="text-xs text-gray-600 mt-2">
          💰 Note: This uses ElevenLabs credits, so test with short text
        </p>
      </div>

      <AudioPlayerWithHighlighting
        text={testText}
        enableHighlighting={true}
        showHighlightedText={true}
        onStart={() => console.log('🎯 Test: Audio started')}
        onEnd={() => console.log('🎯 Test: Audio ended')}
        onError={(error) => console.error('🎯 Test error:', error)}
        className="border rounded-lg p-4"
      />

      <div className="mt-8 space-y-4 text-sm text-gray-600">
        <div>
          <strong>Expected Behavior:</strong>
          <ul className="list-disc list-inside ml-4 space-y-1">
            <li>✅ WebSocket option appears in dropdown</li>
            <li>✅ API key fetched from server endpoint</li>
            <li>✅ Character-level timing from ElevenLabs</li>
            <li>✅ Smooth word-by-word highlighting</li>
            <li>✅ Perfect audio-visual sync</li>
          </ul>
        </div>
        
        <div>
          <strong>Troubleshooting:</strong>
          <ul className="list-disc list-inside ml-4 space-y-1">
            <li>If it falls back to regular ElevenLabs, check API key setup</li>
            <li>If no highlighting, check browser console for errors</li>
            <li>If timing is off, character-to-word mapping may need adjustment</li>
          </ul>
        </div>
      </div>
    </div>
  );
}