'use client';

import { useState, useEffect } from 'react';

export default function TestDebugPage() {
  const [logs, setLogs] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [step, setStep] = useState('Starting...');

  const addLog = (message: string) => {
    const timestamp = new Date().toISOString().split('T')[1].split('.')[0];
    const logMessage = `[${timestamp}] ${message}`;
    console.log(logMessage);
    setLogs(prev => [...prev, logMessage]);
  };

  useEffect(() => {
    // Capture any console errors
    const originalError = console.error;
    console.error = (...args) => {
      addLog(`❌ CONSOLE ERROR: ${args.join(' ')}`);
      originalError(...args);
    };

    // Capture unhandled errors
    const handleError = (event: ErrorEvent) => {
      addLog(`❌ UNHANDLED ERROR: ${event.error?.message || event.message}`);
      addLog(`   Stack: ${event.error?.stack || 'No stack'}`);
      setError(event.error?.message || event.message);
    };

    const handleUnhandledRejection = (event: PromiseRejectionEvent) => {
      addLog(`❌ UNHANDLED PROMISE: ${event.reason}`);
      setError(`Promise rejection: ${event.reason}`);
    };

    window.addEventListener('error', handleError);
    window.addEventListener('unhandledrejection', handleUnhandledRejection);

    return () => {
      console.error = originalError;
      window.removeEventListener('error', handleError);
      window.removeEventListener('unhandledrejection', handleUnhandledRejection);
    };
  }, []);

  useEffect(() => {
    async function runDebugSequence() {
      try {
        addLog('🚀 Debug sequence starting');
        setStep('Checking environment...');

        // Check environment
        addLog(`📍 Window location: ${window.location.href}`);
        addLog(`📍 User agent: ${navigator.userAgent}`);
        addLog(`📍 NODE_ENV: ${process.env.NODE_ENV || 'undefined'}`);

        setStep('Testing basic fetch...');

        // Test basic API call
        addLog('🌐 Testing basic API call...');
        try {
          const response = await fetch('/api/test-book/real-bundles?bookId=test-continuous-bundles-001&level=original');
          addLog(`📡 API response status: ${response.status}`);

          if (response.ok) {
            const data = await response.json();
            addLog(`✅ API success: ${data.bundleCount} bundles, ${data.totalSentences} sentences`);
          } else {
            addLog(`❌ API failed: ${response.statusText}`);
          }
        } catch (apiError) {
          addLog(`❌ API error: ${apiError}`);
        }

        setStep('Testing state management...');

        // Test React state
        addLog('⚛️ Testing React state...');
        const [testState, setTestState] = useState('initial');
        setTestState('updated');
        addLog(`⚛️ React state test: ${testState}`);

        setStep('Testing DOM manipulation...');

        // Test DOM
        addLog('🏠 Testing DOM...');
        const testDiv = document.createElement('div');
        testDiv.textContent = 'Test element';
        addLog(`🏠 DOM test: Created element with text "${testDiv.textContent}"`);

        setStep('Testing service worker...');

        // Check service worker
        if ('serviceWorker' in navigator) {
          try {
            const registrations = await navigator.serviceWorker.getRegistrations();
            addLog(`🔧 Service Worker registrations: ${registrations.length}`);
            registrations.forEach((reg, index) => {
              addLog(`🔧 SW ${index}: ${reg.scope} - ${reg.active?.state || 'no active'}`);
            });
          } catch (swError) {
            addLog(`❌ Service Worker error: ${swError}`);
          }
        } else {
          addLog('🔧 No Service Worker support');
        }

        setStep('Testing imports...');

        // Test dynamic import
        addLog('📦 Testing dynamic imports...');
        try {
          const { useState: importedUseState } = await import('react');
          addLog(`📦 Dynamic import success: ${typeof importedUseState}`);
        } catch (importError) {
          addLog(`❌ Import error: ${importError}`);
        }

        setStep('Complete!');
        addLog('✅ Debug sequence completed successfully');

      } catch (error) {
        addLog(`❌ Debug sequence failed: ${error}`);
        setError(error instanceof Error ? error.message : String(error));
        setStep('Failed!');
      }
    }

    runDebugSequence();
  }, []);

  return (
    <div className="min-h-screen bg-gray-900 text-white p-8 font-mono text-sm">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-2xl font-bold mb-4 text-green-400">🔍 Debug Console</h1>

        <div className="mb-4 p-4 bg-gray-800 rounded">
          <div className="text-blue-400">Current Step: <span className="text-white">{step}</span></div>
          {error && <div className="text-red-400 mt-2">Error: <span className="text-white">{error}</span></div>}
        </div>

        <div className="bg-black p-4 rounded border border-gray-700 max-h-96 overflow-y-auto">
          <div className="text-green-400 mb-2">Console Logs:</div>
          {logs.length === 0 ? (
            <div className="text-gray-500">No logs yet...</div>
          ) : (
            logs.map((log, index) => (
              <div key={index} className="text-gray-300 py-1 border-b border-gray-800">
                {log}
              </div>
            ))
          )}
        </div>

        <div className="mt-4 p-4 bg-gray-800 rounded">
          <div className="text-yellow-400">Instructions:</div>
          <div className="text-gray-300 mt-2">
            1. Copy all the console logs above<br/>
            2. Open browser DevTools (F12) → Console tab<br/>
            3. Copy any additional errors from browser console<br/>
            4. Paste both sets of logs in your next message
          </div>
        </div>

        <div className="mt-4 p-4 bg-blue-900 rounded">
          <div className="text-blue-300">Test Navigation:</div>
          <div className="mt-2 space-x-4">
            <a href="/test-working" className="text-blue-400 hover:text-blue-200">→ /test-working (known working)</a>
            <a href="/test-real-bundles" className="text-blue-400 hover:text-blue-200">→ /test-real-bundles (problem page)</a>
            <a href="/test-real-bundles-v2" className="text-blue-400 hover:text-blue-200">→ /test-real-bundles-v2 (alias)</a>
          </div>
        </div>
      </div>
    </div>
  );
}