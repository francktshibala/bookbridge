'use client';

import React, { useState, useEffect } from 'react';
import { AudioPlayerWithHighlighting } from '@/components/AudioPlayerWithHighlighting';

export default function TestVoiceInReading() {
  const [testScenario, setTestScenario] = useState('short');
  
  const scenarios = {
    short: "Hello world! This is a short test.",
    medium: "The quick brown fox jumps over the lazy dog. This pangram contains every letter of the alphabet and is commonly used for testing typography and text rendering. It's a perfect sentence for our voice synthesis testing.",
    long: `Once upon a time in a small village nestled between rolling hills and dense forests, there lived a young woman named Elara. She was known throughout the village for her extraordinary ability to communicate with animals. Birds would perch on her shoulders and sing melodies only she could understand, while rabbits and deer would gather around her cottage each morning, as if attending a daily meeting. The villagers, initially skeptical of her claims, soon came to rely on her unique gift when their livestock fell ill or when they needed help finding lost pets. Elara's connection with nature wasn't just limited to animals; she could sense changes in weather patterns days before they occurred and knew which herbs would bloom even before the first buds appeared. Her grandmother, who had raised her after her parents disappeared during a particularly harsh winter, always said that Elara had inherited this gift from a long line of forest guardians who had protected the village for generations.`,
    special: "Test with special characters: résumé, naïve, café, piñata, 你好, مرحبا, Привет! Numbers: 123, 456.78, $99.99, 50% off! Symbols: @#$%^&*()_+-=[]{}|;':\",./<>?"
  };

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold mb-8">Voice Integration Test - Simulating Book Reader</h1>
      
      <div className="bg-yellow-50 p-4 rounded-lg mb-6">
        <h2 className="text-lg font-semibold mb-2">Test Scenario</h2>
        <div className="space-x-4">
          {Object.keys(scenarios).map(key => (
            <button
              key={key}
              onClick={() => setTestScenario(key)}
              className={`px-4 py-2 rounded ${testScenario === key ? 'bg-blue-500 text-white' : 'bg-gray-200'}`}
            >
              {key.charAt(0).toUpperCase() + key.slice(1)}
            </button>
          ))}
        </div>
        <p className="mt-2 text-sm text-gray-600">
          Text length: {scenarios[testScenario as keyof typeof scenarios].length} characters
        </p>
      </div>

      <div className="bg-gray-100 p-6 rounded-lg mb-6">
        <h3 className="font-semibold mb-2">Current Text:</h3>
        <p className="text-sm whitespace-pre-wrap">{scenarios[testScenario as keyof typeof scenarios]}</p>
      </div>

      <div className="bg-blue-50 p-4 rounded-lg mb-6">
        <h2 className="text-lg font-semibold mb-2">Audio Player (Same component used in book reader)</h2>
        <AudioPlayerWithHighlighting
          key={testScenario} // Force re-render when scenario changes
          text={scenarios[testScenario as keyof typeof scenarios]}
          enableHighlighting={true}
          showHighlightedText={true}
          onStart={() => console.log('🎯 Audio started for scenario:', testScenario)}
          onEnd={() => console.log('🎯 Audio ended for scenario:', testScenario)}
          onError={(error) => console.error('🎯 Audio error:', error)}
        />
      </div>

      <div className="mt-8 p-4 bg-gray-50 rounded-lg">
        <h3 className="font-semibold mb-2">Testing Notes:</h3>
        <ul className="list-disc list-inside text-sm space-y-1">
          <li>Short: Tests basic functionality</li>
          <li>Medium: Tests typical paragraph length</li>
          <li>Long: Tests with book-length content (may hit API limits)</li>
          <li>Special: Tests character sanitization</li>
        </ul>
        <p className="mt-4 text-sm font-semibold">Check browser console for [VOICE DEBUG] messages</p>
      </div>
    </div>
  );
}