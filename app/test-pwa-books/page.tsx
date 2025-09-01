'use client';

import { useState, useEffect } from 'react';

export default function TestPWABooks() {
  const [status, setStatus] = useState<string>('Loading...');
  const [bookContent, setBookContent] = useState<string>('');
  const [error, setError] = useState<string>('');
  const [pwaEnabled, setPwaEnabled] = useState<boolean>(false);

  useEffect(() => {
    // Check if service worker is registered
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.getRegistrations().then(registrations => {
        setPwaEnabled(registrations.length > 0);
      });
    }
  }, []);

  const testEnhancedBook = async () => {
    setStatus('Testing enhanced book API...');
    setError('');
    setBookContent('');

    try {
      // Test the problematic API route that was failing with PWA
      const response = await fetch('/api/books/gutenberg-158/content-fast');
      
      if (!response.ok) {
        throw new Error(`API returned ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();
      setBookContent(JSON.stringify(data, null, 2).substring(0, 500) + '...');
      setStatus('✅ Enhanced book loaded successfully!');
    } catch (err) {
      setError(`❌ Failed to load book: ${err instanceof Error ? err.message : String(err)}`);
      setStatus('Test failed');
    }
  };

  const testRegularAPI = async () => {
    setStatus('Testing regular API route...');
    setError('');
    setBookContent('');

    try {
      const response = await fetch('/api/books/enhanced');
      
      if (!response.ok) {
        throw new Error(`API returned ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();
      setBookContent(JSON.stringify(data, null, 2).substring(0, 500) + '...');
      setStatus('✅ Regular API works!');
    } catch (err) {
      setError(`❌ API Error: ${err instanceof Error ? err.message : String(err)}`);
      setStatus('Test failed');
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-200 p-8">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold mb-8">PWA Book Loading Test</h1>
        
        <div className="mb-6 p-4 bg-slate-900 rounded-lg">
          <h2 className="text-xl font-semibold mb-2">PWA Status</h2>
          <p className="text-sm">
            Service Worker: {pwaEnabled ? '✅ Registered' : '❌ Not registered'}
          </p>
          <p className="text-xs text-slate-400 mt-2">
            To enable PWA: Set ENABLE_PWA=true and restart the dev server
          </p>
        </div>

        <div className="space-y-4 mb-8">
          <button
            onClick={testEnhancedBook}
            className="px-6 py-3 bg-blue-600 hover:bg-blue-700 rounded-lg font-medium transition-colors"
          >
            Test Enhanced Book (gutenberg-158)
          </button>
          
          <button
            onClick={testRegularAPI}
            className="px-6 py-3 bg-green-600 hover:bg-green-700 rounded-lg font-medium transition-colors ml-4"
          >
            Test Regular API
          </button>
        </div>

        <div className="space-y-4">
          <div className="p-4 bg-slate-900 rounded-lg">
            <h3 className="text-lg font-semibold mb-2">Status</h3>
            <p className="text-sm">{status}</p>
          </div>

          {error && (
            <div className="p-4 bg-red-900/20 border border-red-600 rounded-lg">
              <h3 className="text-lg font-semibold mb-2">Error</h3>
              <p className="text-sm text-red-400">{error}</p>
            </div>
          )}

          {bookContent && (
            <div className="p-4 bg-slate-900 rounded-lg">
              <h3 className="text-lg font-semibold mb-2">Response Data</h3>
              <pre className="text-xs overflow-x-auto whitespace-pre-wrap text-slate-400">
                {bookContent}
              </pre>
            </div>
          )}
        </div>

        <div className="mt-8 p-4 bg-amber-900/20 border border-amber-600 rounded-lg">
          <h3 className="text-lg font-semibold mb-2">Testing Instructions</h3>
          <ol className="list-decimal list-inside space-y-2 text-sm">
            <li>First test with PWA disabled (current state)</li>
            <li>Then enable PWA: <code className="bg-slate-800 px-2 py-1 rounded">ENABLE_PWA=true npm run dev</code></li>
            <li>Test again to ensure books still load</li>
            <li>Check browser DevTools → Application → Service Workers</li>
          </ol>
        </div>
      </div>
    </div>
  );
}