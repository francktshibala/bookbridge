'use client';

import React, { useState } from 'react';

export default function DebugWebSocketHighlighting() {
  const [debugResults, setDebugResults] = useState<string[]>([]);
  const [isRunning, setIsRunning] = useState(false);
  
  const addDebugLog = (message: string) => {
    setDebugResults(prev => [...prev, `${new Date().toLocaleTimeString()}: ${message}`]);
  };

  const runCharacterMappingDebug = () => {
    setIsRunning(true);
    setDebugResults([]);
    
    const testText = "Hello world! This is a test of ElevenLabs WebSocket text-to-speech with perfect synchronization.";
    
    addDebugLog(`🔍 STARTING DEBUG TEST`);
    addDebugLog(`Original text: "${testText}"`);
    addDebugLog(`Original text length: ${testText.length}`);
    
    // Test the word splitting logic (same as used in components)
    const words = testText
      .trim()
      .split(/\s+/)
      .filter(word => word.length > 0)
      .map(word => word.trim());
    
    addDebugLog(`Words array: [${words.map(w => `"${w}"`).join(', ')}]`);
    addDebugLog(`Total words: ${words.length}`);
    
    // Test character-to-word mapping for every character
    addDebugLog(`\n🔍 CHARACTER-TO-WORD MAPPING TEST:`);
    
    for (let charIndex = 0; charIndex < testText.length; charIndex++) {
      const char = testText[charIndex];
      const mappingResult = testCharacterToWordMapping(testText, charIndex, words);
      
      if (mappingResult.success) {
        addDebugLog(`[${charIndex}] "${char}" → Word ${mappingResult.wordIndex}: "${mappingResult.word}"`);
      } else {
        addDebugLog(`[${charIndex}] "${char}" → MAPPING FAILED: ${mappingResult.error}`);
      }
    }
    
    // Test with ElevenLabs-style character sequence (with potential extra chars)
    addDebugLog(`\n🔍 ELEVENLABS OVERFLOW SIMULATION:`);
    const potentialElevenLabsChars = testText + " synchronization."; // Simulate extra chars
    
    addDebugLog(`ElevenLabs might send: "${potentialElevenLabsChars}"`);
    addDebugLog(`ElevenLabs length: ${potentialElevenLabsChars.length} (vs original ${testText.length})`);
    addDebugLog(`Overflow characters: "${potentialElevenLabsChars.substring(testText.length)}"`);
    
    // Test character processing with overflow detection
    let processedCharacters = 0;
    for (let i = 0; i < potentialElevenLabsChars.length; i++) {
      const char = potentialElevenLabsChars[i];
      
      if (processedCharacters >= testText.length) {
        addDebugLog(`⚠️ OVERFLOW: Character ${i} "${char}" exceeds original text length (${testText.length})`);
        continue;
      }
      
      const expectedChar = testText[processedCharacters];
      if (char === expectedChar) {
        addDebugLog(`✅ [${processedCharacters}] "${char}" matches expected`);
      } else {
        addDebugLog(`❌ [${processedCharacters}] "${char}" does NOT match expected "${expectedChar}"`);
      }
      
      processedCharacters++;
    }
    
    setIsRunning(false);
  };

  // Test character-to-word mapping function (simplified version)
  const testCharacterToWordMapping = (text: string, characterIndex: number, words: string[]) => {
    try {
      // Build word position map
      const wordPositions: Array<{word: string, startIndex: number, endIndex: number, wordIndex: number}> = [];
      let searchStart = 0;
      
      for (let i = 0; i < words.length; i++) {
        const word = words[i];
        
        // Find the actual position of this word in the original text
        let wordStart = -1;
        for (let j = searchStart; j <= text.length - word.length; j++) {
          if (text.substring(j, j + word.length) === word) {
            const prevChar = j > 0 ? text[j - 1] : ' ';
            const nextChar = j + word.length < text.length ? text[j + word.length] : ' ';
            
            if (/\s/.test(prevChar) && (/\s/.test(nextChar) || /[.,!?;:]/.test(nextChar) || j + word.length === text.length)) {
              wordStart = j;
              break;
            }
          }
        }
        
        if (wordStart >= 0) {
          wordPositions.push({
            word,
            startIndex: wordStart,
            endIndex: wordStart + word.length - 1,
            wordIndex: i
          });
          searchStart = wordStart + word.length;
        }
      }
      
      // Find which word contains this character
      for (const wordPos of wordPositions) {
        if (characterIndex >= wordPos.startIndex && characterIndex <= wordPos.endIndex) {
          return {
            success: true,
            wordIndex: wordPos.wordIndex,
            word: wordPos.word,
            wordStart: wordPos.startIndex,
            wordEnd: wordPos.endIndex
          };
        }
      }
      
      return { success: false, error: 'Character not found in any word' };
    } catch (error) {
      return { success: false, error: error.message };
    }
  };

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold mb-8">🔍 WebSocket Highlighting Debug Tool</h1>
      
      <div className="bg-blue-50 p-4 rounded-lg mb-6">
        <h2 className="text-lg font-semibold mb-2">🧪 Debug Purpose</h2>
        <p className="text-sm">
          This tool debugs the character overflow issue where ElevenLabs WebSocket sends more characters 
          than the original text length, causing highlighting to fail.
        </p>
      </div>

      <div className="mb-6">
        <button
          onClick={runCharacterMappingDebug}
          disabled={isRunning}
          className={`px-6 py-3 rounded-lg font-medium ${
            isRunning 
              ? 'bg-gray-300 cursor-not-allowed' 
              : 'bg-green-500 hover:bg-green-600 text-white'
          }`}
        >
          {isRunning ? 'Running Debug...' : 'Run Character Mapping Debug'}
        </button>
      </div>

      {debugResults.length > 0 && (
        <div className="bg-gray-900 text-green-400 p-4 rounded-lg font-mono text-sm max-h-96 overflow-y-auto">
          <h3 className="text-white font-bold mb-2">Debug Results:</h3>
          {debugResults.map((result, index) => (
            <div key={index} className="mb-1">
              {result}
            </div>
          ))}
        </div>
      )}
      
      <div className="mt-8 space-y-4 text-sm text-gray-600">
        <div>
          <strong>Known Issues to Test:</strong>
          <ul className="list-disc list-inside ml-4 space-y-1">
            <li>ElevenLabs sends extra characters beyond original text length</li>
            <li>Character sequence "synchronization." appears after text ends</li>
            <li>processedCharacters counter reaches 96 but text is only 96 chars</li>
            <li>All characters after position 96 are ignored (causing no highlighting)</li>
          </ul>
        </div>
        
        <div>
          <strong>Expected Findings:</strong>
          <ul className="list-disc list-inside ml-4 space-y-1">
            <li>Identify where extra characters come from</li>
            <li>Map character positions to correct word indices</li>
            <li>Find gaps in character-to-word mapping logic</li>
            <li>Determine optimal overflow handling strategy</li>
          </ul>
        </div>
      </div>
    </div>
  );
}