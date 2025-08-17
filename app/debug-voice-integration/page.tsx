'use client';

import React, { useState, useCallback } from 'react';
import { AudioPlayerWithHighlighting } from '@/components/AudioPlayerWithHighlighting';

export default function DebugVoiceIntegration() {
  const [testText, setTestText] = useState("Hello world! This is a test of voice integration in the main BookBridge application.");
  const [logs, setLogs] = useState<string[]>([]);

  const addLog = useCallback((message: string) => {
    const timestamp = new Date().toLocaleTimeString();
    setLogs(prev => [...prev, `[${timestamp}] ${message}`]);
    console.log(`🔍 DEBUG: ${message}`);
  }, []);

  // Log on mount
  React.useEffect(() => {
    addLog('Debug page loaded');
  }, [addLog]);

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold mb-8">Voice Integration Debug</h1>
      
      <div className="bg-gray-100 p-4 rounded-lg mb-6">
        <h2 className="text-lg font-semibold mb-4">Test Configuration</h2>
        
        <div className="mb-4">
          <label className="block text-sm font-medium mb-2">Test Text:</label>
          <textarea
            value={testText}
            onChange={(e) => setTestText(e.target.value)}
            className="w-full p-2 border rounded"
            rows={3}
          />
        </div>

        <p className="text-sm text-gray-600">
          Voice provider can be changed in the audio player dropdown below.
        </p>
      </div>

      <div className="bg-blue-50 p-4 rounded-lg mb-6">
        <h2 className="text-lg font-semibold mb-2">Audio Player Component</h2>
        <AudioPlayerWithHighlighting
          text={testText}
          enableHighlighting={true}
          showHighlightedText={true}
          onStart={() => addLog('Audio started')}
          onEnd={() => addLog('Audio ended')}
          onError={(error) => addLog(`Audio error: ${error}`)}
        />
      </div>

      <div className="bg-gray-900 text-gray-100 p-4 rounded-lg">
        <h2 className="text-lg font-semibold mb-2">Console Logs</h2>
        <div className="font-mono text-xs space-y-1 max-h-96 overflow-y-auto">
          {logs.length === 0 ? (
            <p className="text-gray-400">No logs yet. Try playing audio.</p>
          ) : (
            logs.map((log, index) => (
              <div key={index} className={`
                ${log.includes('ERROR') ? 'text-red-400' : ''}
                ${log.includes('WARN') ? 'text-yellow-400' : ''}
                ${log.includes('✅') ? 'text-green-400' : ''}
              `}>
                {log}
              </div>
            ))
          )}
        </div>
        <button
          onClick={() => setLogs([])}
          className="mt-2 px-3 py-1 bg-gray-700 rounded text-sm hover:bg-gray-600"
        >
          Clear Logs
        </button>
      </div>

      <div className="mt-8 p-4 bg-yellow-50 rounded-lg">
        <h3 className="font-semibold mb-2">Environment Check</h3>
        <ul className="text-sm space-y-1">
          <li>Window available: {typeof window !== 'undefined' ? '✅' : '❌'}</li>
          <li>Speech Synthesis available: {typeof window !== 'undefined' && 'speechSynthesis' in window ? '✅' : '❌'}</li>
          <li>Current URL: {typeof window !== 'undefined' ? window.location.href : 'N/A'}</li>
          <li>User Agent: {typeof navigator !== 'undefined' ? navigator.userAgent.substring(0, 50) + '...' : 'N/A'}</li>
        </ul>
      </div>
    </div>
  );
}