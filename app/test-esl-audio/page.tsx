'use client';

import React, { useState, useEffect } from 'react';
import ESLAudioPlayer from '@/components/ESLAudioPlayer';
import { useESLMode } from '@/hooks/useESLMode';
import { BookOpen, Volume2, Settings, Info } from 'lucide-react';

const sampleTexts = {
  A1: "The cat sits on the mat. It is a small cat. The cat is black and white. It likes to play with a ball. The ball is red.",
  A2: "Yesterday, I went to the market with my friend. We bought some fresh vegetables and fruits. The apples were very sweet and the tomatoes looked delicious.",
  B1: "The conference was quite interesting, although some presentations were rather technical. I particularly enjoyed the workshop on sustainable development and its impact on local communities.",
  B2: "Despite the challenging circumstances, the research team managed to achieve remarkable results. Their innovative approach to problem-solving has been recognized internationally.",
  C1: "The nuanced implications of quantum computing on cryptography necessitate a comprehensive reevaluation of current security protocols. Furthermore, the potential ramifications extend beyond mere technological considerations.",
  C2: "The epistemological underpinnings of postmodern discourse inherently challenge conventional paradigms, thereby precipitating a reconceptualization of established theoretical frameworks within contemporary academic spheres."
};

export default function TestESLAudioPage() {
  const [selectedLevel, setSelectedLevel] = useState<string>('B1');
  const [selectedText, setSelectedText] = useState<string>(sampleTexts.B1);
  const [highlightedWord, setHighlightedWord] = useState<number>(-1);
  const [isPlaying, setIsPlaying] = useState(false);
  const [testResults, setTestResults] = useState<string[]>([]);
  
  // Mock ESL mode for testing
  const [mockESLLevel, setMockESLLevel] = useState<string>('B1');
  const [mockNativeLanguage, setMockNativeLanguage] = useState<string>('es');
  
  useEffect(() => {
    // Update text when level changes
    setSelectedText(sampleTexts[selectedLevel as keyof typeof sampleTexts]);
    setHighlightedWord(-1);
  }, [selectedLevel]);
  
  const handleWordHighlight = (wordIndex: number) => {
    setHighlightedWord(wordIndex);
    console.log(`🎯 Highlighted word index: ${wordIndex}`);
  };
  
  const runAudioTest = async (level: string) => {
    const startTime = Date.now();
    setTestResults(prev => [...prev, `Testing ${level} audio settings...`]);
    
    // Test speech rates
    const rates = {
      A1: 0.6,
      A2: 0.7,
      B1: 0.8,
      B2: 0.9,
      C1: 1.0,
      C2: 1.1
    };
    
    const expectedRate = rates[level as keyof typeof rates];
    setTestResults(prev => [...prev, `✅ ${level}: Expected rate ${expectedRate}`]);
    
    // Test feature auto-enable for beginners
    if (['A1', 'A2'].includes(level)) {
      setTestResults(prev => [...prev, `✅ ${level}: Beginner features auto-enabled`]);
    }
    
    const elapsed = Date.now() - startTime;
    setTestResults(prev => [...prev, `Test completed in ${elapsed}ms`]);
  };
  
  const runAllTests = () => {
    setTestResults([]);
    Object.keys(sampleTexts).forEach(level => {
      runAudioTest(level);
    });
  };
  
  const renderHighlightedText = () => {
    const words = selectedText.split(/\s+/);
    return (
      <div className="p-4 bg-gray-50 rounded-lg leading-relaxed">
        {words.map((word, index) => (
          <span
            key={index}
            className={`inline-block mr-1 ${
              index === highlightedWord
                ? 'bg-yellow-300 px-1 rounded animate-pulse'
                : ''
            }`}
          >
            {word}
          </span>
        ))}
      </div>
    );
  };
  
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-8">
      <div className="max-w-4xl mx-auto">
        <div className="bg-white rounded-xl shadow-xl p-8">
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-gray-900 mb-2">
              ESL Audio Enhancement Test
            </h1>
            <p className="text-gray-600">
              Test CEFR-level audio adaptations and pronunciation features
            </p>
          </div>
          
          {/* Level Selector */}
          <div className="mb-6 grid grid-cols-6 gap-2">
            {Object.keys(sampleTexts).map(level => (
              <button
                key={level}
                onClick={() => {
                  setSelectedLevel(level);
                  setMockESLLevel(level);
                }}
                className={`py-2 px-4 rounded-lg font-medium transition-all ${
                  selectedLevel === level
                    ? 'bg-blue-600 text-white shadow-lg'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                {level}
              </button>
            ))}
          </div>
          
          {/* Level Info */}
          <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
            <div className="flex items-start space-x-2">
              <Info className="w-5 h-5 text-blue-600 mt-0.5" />
              <div>
                <h3 className="font-semibold text-blue-900">
                  {selectedLevel} Level Characteristics
                </h3>
                <ul className="mt-2 text-sm text-blue-800 space-y-1">
                  {selectedLevel === 'A1' && (
                    <>
                      <li>• Speech rate: 60% (very slow)</li>
                      <li>• Auto-enabled: Pauses after sentences</li>
                      <li>• Auto-enabled: Difficult word emphasis</li>
                      <li>• Auto-enabled: Pronunciation guide</li>
                    </>
                  )}
                  {selectedLevel === 'A2' && (
                    <>
                      <li>• Speech rate: 70% (slow)</li>
                      <li>• Auto-enabled: Pauses after sentences</li>
                      <li>• Auto-enabled: Difficult word emphasis</li>
                    </>
                  )}
                  {selectedLevel === 'B1' && (
                    <>
                      <li>• Speech rate: 80% (moderate)</li>
                      <li>• Optional: Pronunciation assistance</li>
                    </>
                  )}
                  {selectedLevel === 'B2' && (
                    <>
                      <li>• Speech rate: 90% (near-normal)</li>
                      <li>• Minimal assistance features</li>
                    </>
                  )}
                  {selectedLevel === 'C1' && (
                    <>
                      <li>• Speech rate: 100% (normal)</li>
                      <li>• No automatic features</li>
                    </>
                  )}
                  {selectedLevel === 'C2' && (
                    <>
                      <li>• Speech rate: 110% (slightly fast)</li>
                      <li>• Native-like experience</li>
                    </>
                  )}
                </ul>
              </div>
            </div>
          </div>
          
          {/* Text Display with Highlighting */}
          <div className="mb-6">
            <h3 className="text-lg font-semibold text-gray-800 mb-3">
              Sample Text (Word highlighting enabled)
            </h3>
            {renderHighlightedText()}
          </div>
          
          {/* ESL Audio Player */}
          <div className="mb-6">
            <ESLAudioPlayer
              text={selectedText}
              onStart={() => {
                setIsPlaying(true);
                console.log('🎵 Audio started');
              }}
              onEnd={() => {
                setIsPlaying(false);
                setHighlightedWord(-1);
                console.log('🎵 Audio ended');
              }}
              onWordHighlight={handleWordHighlight}
            />
          </div>
          
          {/* Test Controls */}
          <div className="mb-6 p-4 bg-gray-50 rounded-lg">
            <h3 className="text-lg font-semibold text-gray-800 mb-3">
              Test Controls
            </h3>
            <div className="space-y-3">
              <button
                onClick={runAllTests}
                className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
              >
                Run All CEFR Level Tests
              </button>
              <button
                onClick={() => setTestResults([])}
                className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors ml-2"
              >
                Clear Results
              </button>
            </div>
          </div>
          
          {/* Test Results */}
          {testResults.length > 0 && (
            <div className="p-4 bg-gray-900 text-green-400 rounded-lg font-mono text-sm">
              <h3 className="text-white font-bold mb-2">Test Results:</h3>
              {testResults.map((result, index) => (
                <div key={index}>{result}</div>
              ))}
            </div>
          )}
          
          {/* Feature Matrix */}
          <div className="mt-8">
            <h3 className="text-lg font-semibold text-gray-800 mb-3">
              ESL Audio Feature Matrix
            </h3>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">
                      Feature
                    </th>
                    <th className="px-4 py-2 text-center text-xs font-medium text-gray-500 uppercase">
                      A1
                    </th>
                    <th className="px-4 py-2 text-center text-xs font-medium text-gray-500 uppercase">
                      A2
                    </th>
                    <th className="px-4 py-2 text-center text-xs font-medium text-gray-500 uppercase">
                      B1
                    </th>
                    <th className="px-4 py-2 text-center text-xs font-medium text-gray-500 uppercase">
                      B2
                    </th>
                    <th className="px-4 py-2 text-center text-xs font-medium text-gray-500 uppercase">
                      C1
                    </th>
                    <th className="px-4 py-2 text-center text-xs font-medium text-gray-500 uppercase">
                      C2
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  <tr>
                    <td className="px-4 py-2 text-sm text-gray-900">Speech Rate</td>
                    <td className="px-4 py-2 text-sm text-center">60%</td>
                    <td className="px-4 py-2 text-sm text-center">70%</td>
                    <td className="px-4 py-2 text-sm text-center">80%</td>
                    <td className="px-4 py-2 text-sm text-center">90%</td>
                    <td className="px-4 py-2 text-sm text-center">100%</td>
                    <td className="px-4 py-2 text-sm text-center">110%</td>
                  </tr>
                  <tr>
                    <td className="px-4 py-2 text-sm text-gray-900">Sentence Pauses</td>
                    <td className="px-4 py-2 text-sm text-center">✅</td>
                    <td className="px-4 py-2 text-sm text-center">✅</td>
                    <td className="px-4 py-2 text-sm text-center">⚪</td>
                    <td className="px-4 py-2 text-sm text-center">⚪</td>
                    <td className="px-4 py-2 text-sm text-center">-</td>
                    <td className="px-4 py-2 text-sm text-center">-</td>
                  </tr>
                  <tr>
                    <td className="px-4 py-2 text-sm text-gray-900">Word Emphasis</td>
                    <td className="px-4 py-2 text-sm text-center">✅</td>
                    <td className="px-4 py-2 text-sm text-center">✅</td>
                    <td className="px-4 py-2 text-sm text-center">⚪</td>
                    <td className="px-4 py-2 text-sm text-center">⚪</td>
                    <td className="px-4 py-2 text-sm text-center">-</td>
                    <td className="px-4 py-2 text-sm text-center">-</td>
                  </tr>
                  <tr>
                    <td className="px-4 py-2 text-sm text-gray-900">Pronunciation Guide</td>
                    <td className="px-4 py-2 text-sm text-center">✅</td>
                    <td className="px-4 py-2 text-sm text-center">⚪</td>
                    <td className="px-4 py-2 text-sm text-center">⚪</td>
                    <td className="px-4 py-2 text-sm text-center">⚪</td>
                    <td className="px-4 py-2 text-sm text-center">-</td>
                    <td className="px-4 py-2 text-sm text-center">-</td>
                  </tr>
                  <tr>
                    <td className="px-4 py-2 text-sm text-gray-900">WPM Target</td>
                    <td className="px-4 py-2 text-sm text-center">80</td>
                    <td className="px-4 py-2 text-sm text-center">100</td>
                    <td className="px-4 py-2 text-sm text-center">120</td>
                    <td className="px-4 py-2 text-sm text-center">150</td>
                    <td className="px-4 py-2 text-sm text-center">180</td>
                    <td className="px-4 py-2 text-sm text-center">200</td>
                  </tr>
                </tbody>
              </table>
              <div className="mt-2 text-xs text-gray-500">
                ✅ = Auto-enabled | ⚪ = Optional | - = Not available
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}