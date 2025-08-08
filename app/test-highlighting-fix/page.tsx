'use client';

import React, { useState } from 'react';
import { SmartAudioPlayer } from '@/components/SmartAudioPlayer';

const TestHighlightingPage = () => {
  const [testText] = useState(
    "Music to hear, why hear'st thou music sadly? Sweets with sweets war not, joy delights in joy. " +
    "Why lov'st thou that which thou receiv'st not gladly, or else receiv'st with pleasure thine annoy? " +
    "If the true concord of well-tuned sounds, by unions married, do offend thine ear, " +
    "they do but sweetly chide thee, who confounds in singleness the parts that thou shouldst bear."
  );

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 p-8">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-4xl font-bold text-white mb-8 text-center">
          Text Highlighting Fix Test
        </h1>
        
        <div className="bg-slate-800/70 backdrop-blur-md p-8 rounded-2xl shadow-2xl mb-8">
          <h2 className="text-2xl font-semibold text-white mb-4">Test Instructions:</h2>
          <ol className="text-white/90 space-y-2 list-decimal list-inside">
            <li>Select a voice provider from the dropdown</li>
            <li>Click "Play" to start audio playback</li>
            <li>Watch for yellow highlighting on words as they are spoken</li>
            <li>Test with different providers (Web Speech, OpenAI, ElevenLabs)</li>
            <li>Click "Stop" to verify highlighting cleanup</li>
          </ol>
        </div>

        <div className="bg-slate-800/70 backdrop-blur-md p-8 rounded-2xl shadow-2xl mb-8">
          <h2 className="text-2xl font-semibold text-white mb-6">Book Text to Highlight:</h2>
          <div 
            id="book-reading-text"
            className="text-white/90 text-lg leading-relaxed p-6 bg-slate-900/50 rounded-xl"
          >
            {testText}
          </div>
        </div>

        <SmartAudioPlayer
          text={testText}
          enableHighlighting={true}
          showHighlightedText={false}
          targetElementId="book-reading-text"
          variant="reading"
          onStart={() => console.log('🎵 Audio started')}
          onEnd={() => console.log('🎵 Audio ended')}
          onError={(error) => console.error('🎵 Audio error:', error)}
        />

        <div className="mt-8 p-4 bg-slate-900/50 rounded-lg">
          <h3 className="text-white/80 text-sm font-semibold mb-2">Expected Behavior:</h3>
          <ul className="text-white/70 text-sm space-y-1 list-disc list-inside">
            <li>✅ Words should highlight with yellow background during playback</li>
            <li>✅ Highlighting should follow the audio synchronization</li>
            <li>✅ All voice providers should work</li>
            <li>✅ Highlighting should clear when audio stops</li>
            <li>✅ No console errors should appear</li>
          </ul>
        </div>
      </div>
    </div>
  );
};

export default TestHighlightingPage;