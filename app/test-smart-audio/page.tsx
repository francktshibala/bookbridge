'use client';

import React, { useState } from 'react';
import { SmartAudioPlayer } from '@/components/SmartAudioPlayer';

export default function TestSmartAudio() {
  const [testScenario, setTestScenario] = useState('medium');
  
  const scenarios = {
    short: "Hello world! This is a short test. It should play instantly.",
    
    medium: "The quick brown fox jumps over the lazy dog. This pangram contains every letter of the alphabet and is commonly used for testing typography and text rendering. It's a perfect sentence for our voice synthesis testing. This medium text should demonstrate chunking behavior.",
    
    long: `Once upon a time in a small village nestled between rolling hills and dense forests, there lived a young woman named Elara. She was known throughout the village for her extraordinary ability to communicate with animals. Birds would perch on her shoulders and sing melodies only she could understand, while rabbits and deer would gather around her cottage each morning, as if attending a daily meeting.

The villagers, initially skeptical of her claims, soon came to rely on her unique gift when their livestock fell ill or when they needed help finding lost pets. Elara's connection with nature wasn't just limited to animals; she could sense changes in weather patterns days before they occurred and knew which herbs would bloom even before the first buds appeared.

Her grandmother, who had raised her after her parents disappeared during a particularly harsh winter, always said that Elara had inherited this gift from a long line of forest guardians who had protected the village for generations. The old woman would tell stories of ancient times when the forest spirits would speak directly to humans, sharing wisdom about healing plants and warning of impending dangers.

One autumn morning, as golden leaves danced in the crisp air, Elara noticed that the animals were behaving strangely. The usually chatty squirrels were silent, birds flew in erratic patterns, and even her loyal companion, a wise old owl named Artemis, seemed troubled. Something was definitely wrong in the forest, and Elara knew she had to investigate.`,
    
    veryLong: `Chapter 1: The Discovery

The ancient library stood silent in the pre-dawn darkness, its towering shelves casting long shadows across the marble floor. Dr. Sarah Chen had been working late again, poring over manuscripts that had been gathering dust for centuries. As the head of Medieval Studies at the prestigious Blackwood University, she was accustomed to long nights spent deciphering cryptic texts and forgotten languages.

Tonight was different, however. She had stumbled upon something extraordinary—a collection of documents that seemed to describe a lost civilization that predated anything in the historical record. The parchments were written in a script she had never encountered before, yet somehow, the symbols seemed familiar, as if they were calling to her from across the ages.

The first document appeared to be a map, showing a continent that didn't match any known geography. Strange symbols marked various locations, and what looked like trade routes connected distant cities with names that sounded both alien and oddly melodic. The second document contained what appeared to be astronomical observations, with detailed star charts that showed constellations in positions that would have been impossible from Earth's perspective.

As Sarah continued to examine the texts, she began to notice patterns in the unknown script. Certain symbols appeared repeatedly, and she started to develop a rudimentary understanding of their meaning. The word that appeared most frequently seemed to translate to something like "crossing" or "bridge," while another common symbol suggested concepts related to time or duration.

The implications were staggering. If these documents were authentic, they would revolutionize our understanding of human history and perhaps even challenge our assumptions about the development of civilization itself. But Sarah was a careful scholar, and she knew that extraordinary claims required extraordinary evidence.

Chapter 2: The Translation

Over the following weeks, Sarah threw herself into the translation work with an intensity that concerned her colleagues. She barely left the library, surviving on coffee and determination as she slowly began to unlock the secrets of the mysterious texts. The more she translated, the more convinced she became that she was dealing with something genuinely ancient and potentially world-changing.

The documents told the story of a people called the Ethereans, who claimed to have come from a place called the "Distant Shore" through what they described as "passages between worlds." According to their records, the Ethereans possessed knowledge of sciences that wouldn't be discovered by human civilization for thousands of years. They wrote of engines that could harness the power of stars, of medicines that could cure any ailment, and of techniques for communicating across vast distances instantaneously.

Most intriguingly, the Ethereans seemed to have been teachers and guides to early human civilizations. The texts suggested that many of the technological and cultural advances that historians attributed to human ingenuity were actually gifts from these mysterious visitors. The construction of monumental architecture, the development of writing systems, advances in astronomy and mathematics—all were described as collaborative efforts between humans and Ethereans.

But the documents also hinted at a great tragedy. References to a "Great Sundering" appeared throughout the later texts, along with descriptions of the Ethereans' gradual withdrawal from human affairs. The final documents spoke of their return to the Distant Shore, leaving behind only hidden knowledge for those who would one day be ready to understand it.`
  };

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold mb-8">Smart Audio Player Test</h1>
      
      <div className="bg-blue-50 p-4 rounded-lg mb-6">
        <h2 className="text-lg font-semibold mb-2">✨ Smart Features</h2>
        <ul className="list-disc list-inside text-sm space-y-1">
          <li><strong>Intelligent Chunking:</strong> Automatically breaks long text into optimal chunks</li>
          <li><strong>Provider-Optimized:</strong> Different chunk sizes for different voice providers</li>
          <li><strong>Instant Playback:</strong> Starts playing the first chunk immediately</li>
          <li><strong>Seamless Continuation:</strong> Automatically plays subsequent chunks</li>
          <li><strong>Real-time Progress:</strong> Shows progress through chunks</li>
        </ul>
      </div>

      <div className="bg-yellow-50 p-4 rounded-lg mb-6">
        <h2 className="text-lg font-semibold mb-2">Test Scenarios</h2>
        <div className="flex gap-2 flex-wrap">
          {Object.entries(scenarios).map(([key, text]) => (
            <button
              key={key}
              onClick={() => setTestScenario(key)}
              className={`px-4 py-2 rounded ${testScenario === key ? 'bg-blue-500 text-white' : 'bg-gray-200'}`}
            >
              {key.charAt(0).toUpperCase() + key.slice(1)} ({text.length} chars)
            </button>
          ))}
        </div>
        <div className="mt-2 text-sm text-gray-600">
          <strong>Expected behavior:</strong>
          <ul className="mt-1 ml-4 list-disc">
            <li><strong>Short:</strong> Single chunk, plays immediately</li>
            <li><strong>Medium:</strong> 2-3 chunks depending on provider</li>
            <li><strong>Long:</strong> 4-6 chunks, demonstrating seamless transitions</li>
            <li><strong>Very Long:</strong> 8+ chunks, stress test for chunking algorithm</li>
          </ul>
        </div>
      </div>

      <div className="bg-white border rounded-lg p-6">
        <SmartAudioPlayer
          key={testScenario} // Force re-render when scenario changes
          text={scenarios[testScenario as keyof typeof scenarios]}
          enableHighlighting={true}
          showHighlightedText={true}
          onStart={() => console.log('🎯 Smart audio started')}
          onEnd={() => console.log('🎯 Smart audio completed')}
          onError={(error) => console.error('🎯 Smart audio error:', error)}
        />
      </div>

      <div className="mt-8 p-4 bg-gray-50 rounded-lg">
        <h3 className="font-semibold mb-2">Performance Comparison:</h3>
        
        <div className="grid md:grid-cols-2 gap-4 text-sm">
          <div>
            <h4 className="font-medium text-green-600 mb-2">✅ Smart Audio Player</h4>
            <ul className="list-disc list-inside space-y-1">
              <li>Instant playback start (first chunk ready quickly)</li>
              <li>Optimal chunk sizes per provider</li>
              <li>Seamless continuation between chunks</li>
              <li>Better user experience with progress indication</li>
              <li>Memory efficient (processes chunks sequentially)</li>
            </ul>
          </div>
          
          <div>
            <h4 className="font-medium text-orange-600 mb-2">⚠️ Standard Audio Player</h4>
            <ul className="list-disc list-inside space-y-1">
              <li>Long delays with large text (processes entire text)</li>
              <li>Fixed limits may truncate content</li>
              <li>User waits for entire processing</li>
              <li>No progress indication</li>
              <li>Memory intensive with long texts</li>
            </ul>
          </div>
        </div>

        <div className="mt-4 p-3 bg-blue-100 rounded">
          <p className="text-sm"><strong>💡 Pro Tip:</strong> Try the "Very Long" scenario with OpenAI voice. The standard player would take 15-30 seconds to start, but the smart player starts in 2-3 seconds!</p>
        </div>
      </div>
    </div>
  );
}