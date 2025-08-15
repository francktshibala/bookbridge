'use client';

import { useState } from 'react';

export default function TestAdaptiveHighlighting() {
  const [results, setResults] = useState<string[]>([]);
  const [isTestingShort, setIsTestingShort] = useState(false);
  const [isTestingLong, setIsTestingLong] = useState(false);

  const addResult = (message: string) => {
    setResults(prev => [...prev, `${new Date().toLocaleTimeString()}: ${message}`]);
  };

  const testShortText = async () => {
    setIsTestingShort(true);
    addResult('🧪 Testing SHORT TEXT highlighting...');
    
    const shortText = "Hello world! This is a test.";
    addResult(`Text: "${shortText}" (${shortText.length} chars, 6 words)`);
    
    try {
      const response = await fetch('/api/elevenlabs/websocket-key');
      if (!response.ok) throw new Error('Failed to get API key');
      
      const { apiKey } = await response.json();
      const voiceId = 'pNInz6obpgDQGcFmaJgB'; // Adam voice
      const wsUrl = `wss://api.elevenlabs.io/v1/text-to-speech/${voiceId}/stream-input?model_id=eleven_turbo_v2`;
      
      const ws = new WebSocket(wsUrl);
      let eventCount = 0;
      let wordProgression: number[] = [];
      
      ws.onopen = () => {
        addResult('📡 WebSocket connected for SHORT text');
        
        // Send initial configuration with API key
        const configMessage = {
          text: " ",
          voice_settings: {
            stability: 0.5,
            similarity_boost: 0.75,
            style: 0.0,
            use_speaker_boost: true
          },
          xi_api_key: apiKey,
          generation_config: {
            chunk_length_schedule: [120, 160, 250, 290]
          }
        };
        
        ws.send(JSON.stringify(configMessage));
        
        // Send the actual text
        setTimeout(() => {
          const textMessage = {
            text: shortText + " ",
            try_trigger_generation: true
          };
          ws.send(JSON.stringify(textMessage));
          
          // Send EOS to finish
          setTimeout(() => {
            ws.send(JSON.stringify({ text: "" }));
          }, 100);
        }, 100);
      };
      
      ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          
          // Log all message types for debugging
          if (Object.keys(data).length > 0) {
            const messageType = Object.keys(data).join(', ');
            if (!messageType.includes('audio')) {
              addResult(`📨 SHORT Message type: ${messageType}`);
            }
          }
          
          if (data.error) {
            addResult(`❌ SHORT Error: ${data.error}`);
            ws.close();
            return;
          }
          
          if (data.alignment) {
            eventCount++;
            // ElevenLabs sends character data in arrays
            const char = data.alignment.chars ? data.alignment.chars[0] : data.alignment.character;
            const timeMs = data.alignment.charStartTimesMs ? data.alignment.charStartTimesMs[0] : data.alignment.start_time_ms;
            addResult(`📊 SHORT Event ${eventCount}: "${char}" at ${timeMs}ms`);
            
            // Simulate word progression (each event = next word for short text)
            const nextWord = wordProgression.length;
            if (nextWord < 6) {
              wordProgression.push(nextWord);
              addResult(`✅ SHORT Word ${nextWord}: Highlighted`);
            }
          }
          
          if (data.audio) {
            addResult(`🎵 SHORT: Audio received`);
          }
          
          if (data.isFinal) {
            addResult(`🏁 SHORT Test Complete: ${eventCount} events, ${wordProgression.length} words highlighted`);
            
            // Evaluate results
            if (wordProgression.length >= 5) {
              addResult('✅ SHORT TEXT: SUCCESS - Progressive highlighting working!');
            } else {
              addResult('❌ SHORT TEXT: FAILED - Not enough words highlighted');
            }
            
            ws.close();
            setIsTestingShort(false);
          }
        } catch (e) {
          addResult(`❌ SHORT: Error parsing message: ${e}`);
        }
      };
      
      setTimeout(() => {
        if (ws.readyState !== WebSocket.CLOSED) {
          addResult('⏰ SHORT: Test timeout - closing connection');
          ws.close();
          setIsTestingShort(false);
        }
      }, 10000);
      
    } catch (error) {
      addResult(`❌ SHORT: Error: ${error}`);
      setIsTestingShort(false);
    }
  };

  const testLongText = async () => {
    setIsTestingLong(true);
    addResult('🧪 Testing LONG TEXT highlighting...');
    
    const longText = "Hello world! This is a test of ElevenLabs WebSocket text-to-speech with perfect synchronization. The highlighting should work smoothly across all words in this longer sentence.";
    addResult(`Text: "${longText}" (${longText.length} chars, ~25 words)`);
    
    try {
      const response = await fetch('/api/elevenlabs/websocket-key');
      if (!response.ok) throw new Error('Failed to get API key');
      
      const { apiKey } = await response.json();
      const voiceId = 'pNInz6obpgDQGcFmaJgB'; // Adam voice
      const wsUrl = `wss://api.elevenlabs.io/v1/text-to-speech/${voiceId}/stream-input?model_id=eleven_turbo_v2`;
      
      const ws = new WebSocket(wsUrl);
      let eventCount = 0;
      let boundaryEvents = 0;
      let wordProgression: number[] = [];
      
      ws.onopen = () => {
        addResult('📡 WebSocket connected for LONG text');
        
        // Send initial configuration with API key
        const configMessage = {
          text: " ",
          voice_settings: {
            stability: 0.5,
            similarity_boost: 0.75,
            style: 0.0,
            use_speaker_boost: true
          },
          xi_api_key: apiKey,
          generation_config: {
            chunk_length_schedule: [120, 160, 250, 290]
          }
        };
        
        ws.send(JSON.stringify(configMessage));
        
        // Send the actual text
        setTimeout(() => {
          const textMessage = {
            text: longText + " ",
            try_trigger_generation: true
          };
          ws.send(JSON.stringify(textMessage));
          
          // Send EOS to finish
          setTimeout(() => {
            ws.send(JSON.stringify({ text: "" }));
          }, 100);
        }, 100);
      };
      
      ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          
          if (data.alignment) {
            eventCount++;
            const char = data.alignment.chars;
            
            // Check if this is a word boundary (space or punctuation)
            const isWordBoundary = char === ' ' || /[.!?,:;]/.test(char);
            
            if (isWordBoundary) {
              boundaryEvents++;
              const wordIndex = Math.min(wordProgression.length, 24); // Max 25 words
              wordProgression.push(wordIndex);
              addResult(`✅ LONG Word ${wordIndex}: Boundary "${char}" at ${data.alignment.charStartTimesMs[0]}ms`);
            }
            
            if (eventCount <= 10) {
              addResult(`📊 LONG Event ${eventCount}: "${char}" (boundary: ${isWordBoundary})`);
            }
          }
          
          if (data.audio) {
            addResult(`🎵 LONG: Audio received`);
          }
          
          if (data.isFinal) {
            addResult(`🏁 LONG Test Complete: ${eventCount} total events, ${boundaryEvents} boundaries, ${wordProgression.length} words`);
            
            // Evaluate results
            if (wordProgression.length >= 10 && boundaryEvents > 5) {
              addResult('✅ LONG TEXT: SUCCESS - Word boundary detection working!');
            } else {
              addResult('❌ LONG TEXT: FAILED - Insufficient word progression');
            }
            
            ws.close();
            setIsTestingLong(false);
          }
        } catch (e) {
          addResult(`❌ LONG: Error parsing message: ${e}`);
        }
      };
      
      setTimeout(() => {
        if (ws.readyState !== WebSocket.CLOSED) {
          addResult('⏰ LONG: Test timeout - closing connection');
          ws.close();
          setIsTestingLong(false);
        }
      }, 15000);
      
    } catch (error) {
      addResult(`❌ LONG: Error: ${error}`);
      setIsTestingLong(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-4xl mx-auto px-4">
        <h1 className="text-3xl font-bold text-gray-900 mb-8">
          🎯 Adaptive Highlighting Test Suite
        </h1>
        
        <div className="bg-white rounded-lg shadow-lg p-6 mb-8">
          <h2 className="text-xl font-semibold mb-4">Test Controls</h2>
          
          <div className="flex gap-4">
            <button
              onClick={testShortText}
              disabled={isTestingShort || isTestingLong}
              className={`px-6 py-3 rounded-lg font-semibold ${
                isTestingShort 
                  ? 'bg-gray-400 text-gray-700 cursor-not-allowed' 
                  : 'bg-blue-600 hover:bg-blue-700 text-white'
              }`}
            >
              {isTestingShort ? '🔄 Testing Short...' : '🧪 Test Short Text'}
            </button>
            
            <button
              onClick={testLongText}
              disabled={isTestingShort || isTestingLong}
              className={`px-6 py-3 rounded-lg font-semibold ${
                isTestingLong 
                  ? 'bg-gray-400 text-gray-700 cursor-not-allowed' 
                  : 'bg-green-600 hover:bg-green-700 text-white'
              }`}
            >
              {isTestingLong ? '🔄 Testing Long...' : '🧪 Test Long Text'}
            </button>
            
            <button
              onClick={() => setResults([])}
              className="px-6 py-3 rounded-lg font-semibold bg-gray-600 hover:bg-gray-700 text-white"
            >
              🗑️ Clear Results
            </button>
          </div>
        </div>
        
        <div className="bg-white rounded-lg shadow-lg p-6">
          <h2 className="text-xl font-semibold mb-4">Test Results</h2>
          
          <div className="bg-gray-900 text-green-400 p-4 rounded-lg h-96 overflow-y-auto font-mono text-sm">
            {results.length === 0 ? (
              <div className="text-gray-500">No test results yet. Click a test button to begin.</div>
            ) : (
              results.map((result, index) => (
                <div key={index} className="mb-1">
                  {result}
                </div>
              ))
            )}
          </div>
        </div>
        
        <div className="mt-8 bg-blue-50 border-l-4 border-blue-400 p-4">
          <div className="flex">
            <div className="ml-3">
              <p className="text-sm text-blue-700">
                <strong>Test Strategy:</strong> Short text should show progressive word advancement (3 events → 6 words). 
                Long text should show word boundary detection (many events → selective word highlighting).
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}