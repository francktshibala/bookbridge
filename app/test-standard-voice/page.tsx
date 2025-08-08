'use client';

import React from 'react';
import { AudioPlayerWithHighlighting } from '@/components/AudioPlayerWithHighlighting';

export default function TestStandardVoice() {
  const testText = "Hello world! This is a test of Standard Voice text-to-speech with highlighting.";

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold mb-8">Standard Voice Test</h1>
      
      <div className="bg-green-50 p-4 rounded-lg mb-6">
        <h2 className="text-lg font-semibold mb-2">🧪 Test Standard Voice (Free)</h2>
        <ol className="list-decimal list-inside space-y-1 text-sm">
          <li>Should default to "Standard Voice" option</li>
          <li>Click Play to test Web Speech API</li>
          <li>Watch for word-by-word highlighting sync</li>
          <li>Check browser console for session management logs</li>
        </ol>
        <p className="text-xs text-gray-600 mt-2">
          ✅ This is completely free and tests our race condition fixes
        </p>
      </div>

      <AudioPlayerWithHighlighting
        text={testText}
        enableHighlighting={true}
        showHighlightedText={true}
        onStart={() => console.log('🎯 Standard Voice Test: Audio started')}
        onEnd={() => console.log('🎯 Standard Voice Test: Audio ended')}
        onError={(error) => console.error('🎯 Standard Voice Test error:', error)}
        className="border rounded-lg p-4"
      />

      <div className="mt-8 space-y-4 text-sm text-gray-600">
        <div>
          <strong>Expected Behavior:</strong>
          <ul className="list-disc list-inside ml-4 space-y-1">
            <li>✅ Standard Voice selected by default</li>
            <li>✅ Session created without race conditions</li>
            <li>✅ Word boundary events trigger highlighting</li>
            <li>✅ Smooth word-by-word highlighting</li>
            <li>✅ No null currentSessionId errors</li>
          </ul>
        </div>
      </div>
    </div>
  );
}