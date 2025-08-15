'use client';

import React, { useState } from 'react';

export default function TestElevenLabsDebug() {
  const [result, setResult] = useState<string>('');
  const [loading, setLoading] = useState(false);

  const testDirectAPI = async () => {
    setLoading(true);
    setResult('Testing ElevenLabs API directly...\n');
    
    try {
      const response = await fetch('/api/elevenlabs/tts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          text: 'Hello world test',
          voice: 'EXAVITQu4vr4xnSDxMaL',
          speed: 0.9
        })
      });
      
      setResult(prev => prev + `Response status: ${response.status} ${response.statusText}\n`);
      
      if (response.ok) {
        const audioBlob = await response.blob();
        setResult(prev => prev + `✅ Success! Audio blob size: ${audioBlob.size} bytes\n`);
        
        // Try to play the audio
        const audioUrl = URL.createObjectURL(audioBlob);
        const audio = new Audio(audioUrl);
        audio.oncanplay = () => setResult(prev => prev + `✅ Audio can play, duration: ${audio.duration}s\n`);
        audio.onerror = (e) => setResult(prev => prev + `❌ Audio play error: ${e}\n`);
        
      } else {
        const errorText = await response.text();
        setResult(prev => prev + `❌ Error: ${errorText}\n`);
      }
    } catch (error) {
      setResult(prev => prev + `❌ Fetch error: ${error}\n`);
    }
    
    setLoading(false);
  };

  const testWebSocketKey = async () => {
    setLoading(true);
    setResult('Testing WebSocket API key endpoint...\n');
    
    try {
      const response = await fetch('/api/elevenlabs/websocket-key');
      setResult(prev => prev + `Response status: ${response.status}\n`);
      
      if (response.ok) {
        const data = await response.json();
        setResult(prev => prev + `✅ API Key available: ${data.apiKey ? 'Yes' : 'No'}\n`);
        setResult(prev => prev + `Key length: ${data.apiKey?.length || 0}\n`);
      } else {
        const errorText = await response.text();
        setResult(prev => prev + `❌ Error: ${errorText}\n`);
      }
    } catch (error) {
      setResult(prev => prev + `❌ Fetch error: ${error}\n`);
    }
    
    setLoading(false);
  };

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold mb-8">ElevenLabs Debug Test</h1>
      
      <div className="space-y-4 mb-6">
        <button
          onClick={testDirectAPI}
          disabled={loading}
          className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 disabled:opacity-50"
        >
          Test Regular ElevenLabs API
        </button>
        
        <button
          onClick={testWebSocketKey}
          disabled={loading}
          className="px-4 py-2 bg-purple-500 text-white rounded hover:bg-purple-600 disabled:opacity-50"
        >
          Test WebSocket API Key
        </button>
      </div>
      
      <div className="bg-gray-100 p-4 rounded-lg">
        <h3 className="font-semibold mb-2">Test Results:</h3>
        <pre className="whitespace-pre-wrap text-sm font-mono">{result}</pre>
        {loading && <div className="mt-2 text-blue-600">Loading...</div>}
      </div>
      
      <div className="mt-6 text-sm text-gray-600">
        <p><strong>This will help us identify:</strong></p>
        <ul className="list-disc list-inside ml-4">
          <li>If ElevenLabs regular API is working correctly</li>
          <li>If the WebSocket API key is accessible</li>
          <li>Exact error messages if any API fails</li>
          <li>Whether the audio blob processing works</li>
        </ul>
      </div>
    </div>
  );
}