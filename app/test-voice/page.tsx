'use client';

import { AudioPlayer } from '@/components/AudioPlayer';

export default function TestVoicePage() {
  const sampleText = "Welcome to BookBridge! This is a test of our premium voice features. Listen to how natural and expressive this voice sounds compared to standard text-to-speech. Our AI can help you understand complex literature with engaging, human-like narration.";

  return (
    <div className="container mx-auto p-8 max-w-2xl">
      <h1 className="text-3xl font-bold mb-6">Voice Quality Test</h1>
      
      <div className="bg-white rounded-lg shadow-lg p-6">
        <h2 className="text-xl font-semibold mb-4">Sample Text:</h2>
        <p className="text-gray-700 mb-6 italic">"{sampleText}"</p>
        
        <AudioPlayer 
          text={sampleText}
          onStart={() => console.log('Voice test started')}
          onEnd={() => console.log('Voice test ended')}
          onError={(error) => console.error('Voice error:', error)}
        />
        
        <div className="mt-6 p-4 bg-purple-50 rounded-lg">
          <p className="text-sm text-purple-700">
            <strong>Try both options:</strong><br/>
            • <strong>Standard</strong>: Free browser text-to-speech<br/>
            • <strong>Premium</strong>: ElevenLabs human-like voice
          </p>
        </div>
      </div>
    </div>
  );
}