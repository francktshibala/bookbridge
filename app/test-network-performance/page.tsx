'use client';

import React, { useState, useEffect } from 'react';
import { 
  NetworkTester, 
  NetworkThrottler, 
  NETWORK_CONDITIONS, 
  PerformanceMetrics,
  generatePerformanceReport 
} from '@/lib/network-testing';

export default function NetworkPerformancePage() {
  const [isTestRunning, setIsTestRunning] = useState(false);
  const [currentTest, setCurrentTest] = useState<string>('');
  const [results, setResults] = useState<PerformanceMetrics[]>([]);
  const [throttleEnabled, setThrottleEnabled] = useState(false);
  const [selectedCondition, setSelectedCondition] = useState('3G_SLOW');
  const [throttler, setThrottler] = useState<NetworkThrottler | null>(null);

  // Run performance test for a specific network condition
  const runTest = async (conditionKey: string) => {
    const tester = new NetworkTester(conditionKey);
    tester.startMonitoring();
    
    // Wait for page to stabilize
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    // Test audio loading (using a sample audio URL)
    try {
      await tester.testAudioLoading('/audio/sample.mp3');
    } catch (error) {
      console.error('Audio test failed:', error);
    }
    
    // Test offline capability
    await tester.testOfflineCapability();
    
    // Wait for more metrics to be collected
    await new Promise(resolve => setTimeout(resolve, 3000));
    
    const metrics = tester.getMetrics();
    tester.stopMonitoring();
    
    return metrics;
  };

  // Run all network tests
  const runAllTests = async () => {
    setIsTestRunning(true);
    setResults([]);
    
    for (const [key, condition] of Object.entries(NETWORK_CONDITIONS)) {
      setCurrentTest(condition.name);
      const metrics = await runTest(key);
      setResults(prev => [...prev, metrics]);
      
      // Wait between tests
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
    
    setIsTestRunning(false);
    setCurrentTest('');
  };

  // Toggle network throttling
  const toggleThrottle = () => {
    if (throttleEnabled && throttler) {
      throttler.disable();
      setThrottler(null);
      setThrottleEnabled(false);
    } else {
      const condition = NETWORK_CONDITIONS[selectedCondition];
      const newThrottler = new NetworkThrottler(condition);
      newThrottler.enable();
      setThrottler(newThrottler);
      setThrottleEnabled(true);
    }
  };

  // Download report
  const downloadReport = () => {
    const report = generatePerformanceReport(results);
    const blob = new Blob([report], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `pwa-performance-report-${new Date().toISOString().split('T')[0]}.md`;
    a.click();
  };

  // Get actual network info
  const [networkInfo, setNetworkInfo] = useState<any>(null);
  useEffect(() => {
    if ('connection' in navigator) {
      const connection = (navigator as any).connection;
      setNetworkInfo({
        effectiveType: connection.effectiveType,
        downlink: connection.downlink,
        rtt: connection.rtt,
        saveData: connection.saveData
      });
      
      connection.addEventListener('change', () => {
        setNetworkInfo({
          effectiveType: connection.effectiveType,
          downlink: connection.downlink,
          rtt: connection.rtt,
          saveData: connection.saveData
        });
      });
    }
  }, []);

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-6xl mx-auto">
        <h1 className="text-3xl font-bold mb-8">PWA Network Performance Testing</h1>
        
        {/* Current Network Info */}
        <div className="bg-white rounded-lg shadow p-6 mb-6">
          <h2 className="text-xl font-semibold mb-4">Current Network Information</h2>
          {networkInfo ? (
            <div className="grid grid-cols-2 gap-4">
              <div>
                <span className="font-medium">Effective Type:</span> {networkInfo.effectiveType}
              </div>
              <div>
                <span className="font-medium">Downlink:</span> {networkInfo.downlink} Mbps
              </div>
              <div>
                <span className="font-medium">RTT:</span> {networkInfo.rtt} ms
              </div>
              <div>
                <span className="font-medium">Save Data:</span> {networkInfo.saveData ? 'Yes' : 'No'}
              </div>
            </div>
          ) : (
            <p className="text-gray-500">Network Information API not available</p>
          )}
        </div>

        {/* Network Throttling */}
        <div className="bg-white rounded-lg shadow p-6 mb-6">
          <h2 className="text-xl font-semibold mb-4">Network Throttling (Dev Only)</h2>
          <div className="flex items-center gap-4">
            <select
              value={selectedCondition}
              onChange={(e) => setSelectedCondition(e.target.value)}
              className="border rounded px-3 py-2"
              disabled={throttleEnabled}
            >
              {Object.entries(NETWORK_CONDITIONS).map(([key, condition]) => (
                <option key={key} value={key}>{condition.name}</option>
              ))}
            </select>
            <button
              onClick={toggleThrottle}
              className={`px-4 py-2 rounded font-medium ${
                throttleEnabled 
                  ? 'bg-red-600 text-white hover:bg-red-700' 
                  : 'bg-blue-600 text-white hover:bg-blue-700'
              }`}
            >
              {throttleEnabled ? 'Disable Throttling' : 'Enable Throttling'}
            </button>
            {throttleEnabled && (
              <span className="text-orange-600 font-medium">
                ⚠️ Throttling Active
              </span>
            )}
          </div>
        </div>

        {/* Test Controls */}
        <div className="bg-white rounded-lg shadow p-6 mb-6">
          <h2 className="text-xl font-semibold mb-4">Performance Tests</h2>
          <div className="flex items-center gap-4">
            <button
              onClick={runAllTests}
              disabled={isTestRunning}
              className="bg-green-600 text-white px-6 py-2 rounded font-medium hover:bg-green-700 disabled:bg-gray-400"
            >
              {isTestRunning ? 'Running Tests...' : 'Run All Network Tests'}
            </button>
            {results.length > 0 && (
              <button
                onClick={downloadReport}
                className="bg-purple-600 text-white px-6 py-2 rounded font-medium hover:bg-purple-700"
              >
                Download Report
              </button>
            )}
          </div>
          {currentTest && (
            <p className="mt-4 text-blue-600">
              Currently testing: {currentTest}
            </p>
          )}
        </div>

        {/* Results */}
        {results.length > 0 && (
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-xl font-semibold mb-4">Test Results</h2>
            <div className="space-y-6">
              {results.map((result, index) => (
                <div key={index} className="border-b pb-4 last:border-b-0">
                  <h3 className="font-medium text-lg mb-2">
                    {NETWORK_CONDITIONS[result.networkCondition]?.name || result.networkCondition}
                  </h3>
                  
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                    {/* Core Web Vitals */}
                    <div className="bg-gray-50 p-3 rounded">
                      <div className="font-medium text-gray-600">FCP</div>
                      <div className={`text-lg ${
                        (result.metrics.fcp || 0) < 1800 ? 'text-green-600' : 
                        (result.metrics.fcp || 0) < 3000 ? 'text-yellow-600' : 'text-red-600'
                      }`}>
                        {result.metrics.fcp ? `${result.metrics.fcp.toFixed(0)}ms` : 'N/A'}
                      </div>
                    </div>
                    
                    <div className="bg-gray-50 p-3 rounded">
                      <div className="font-medium text-gray-600">LCP</div>
                      <div className={`text-lg ${
                        (result.metrics.lcp || 0) < 2500 ? 'text-green-600' : 
                        (result.metrics.lcp || 0) < 4000 ? 'text-yellow-600' : 'text-red-600'
                      }`}>
                        {result.metrics.lcp ? `${result.metrics.lcp.toFixed(0)}ms` : 'N/A'}
                      </div>
                    </div>
                    
                    <div className="bg-gray-50 p-3 rounded">
                      <div className="font-medium text-gray-600">Cache Hit Rate</div>
                      <div className={`text-lg ${
                        (result.metrics.cacheHitRate || 0) > 70 ? 'text-green-600' : 
                        (result.metrics.cacheHitRate || 0) > 50 ? 'text-yellow-600' : 'text-red-600'
                      }`}>
                        {result.metrics.cacheHitRate}%
                      </div>
                    </div>
                    
                    <div className="bg-gray-50 p-3 rounded">
                      <div className="font-medium text-gray-600">Audio Load</div>
                      <div className={`text-lg ${
                        (result.metrics.audioLoadTime || 0) < 2000 ? 'text-green-600' : 
                        (result.metrics.audioLoadTime || 0) < 5000 ? 'text-yellow-600' : 'text-red-600'
                      }`}>
                        {result.metrics.audioLoadTime ? `${result.metrics.audioLoadTime.toFixed(0)}ms` : 'N/A'}
                      </div>
                    </div>
                    
                    {/* Additional metrics */}
                    <div className="bg-gray-50 p-3 rounded">
                      <div className="font-medium text-gray-600">Offline Ready</div>
                      <div className={`text-lg ${
                        result.metrics.offlineCapability ? 'text-green-600' : 'text-red-600'
                      }`}>
                        {result.metrics.offlineCapability ? 'Yes' : 'No'}
                      </div>
                    </div>
                    
                    <div className="bg-gray-50 p-3 rounded">
                      <div className="font-medium text-gray-600">Audio Quality</div>
                      <div className="text-lg text-blue-600">
                        {result.metrics.audioQuality || 'N/A'}
                      </div>
                    </div>
                    
                    <div className="bg-gray-50 p-3 rounded">
                      <div className="font-medium text-gray-600">Data Transfer</div>
                      <div className="text-lg">
                        {((result.metrics.totalTransferred || 0) / 1024).toFixed(0)}KB
                      </div>
                    </div>
                    
                    <div className="bg-gray-50 p-3 rounded">
                      <div className="font-medium text-gray-600">Failed Requests</div>
                      <div className={`text-lg ${
                        (result.metrics.failedRequests || 0) === 0 ? 'text-green-600' : 'text-red-600'
                      }`}>
                        {result.metrics.failedRequests || 0}
                      </div>
                    </div>
                  </div>
                  
                  {result.errors && result.errors.length > 0 && (
                    <div className="mt-3 p-3 bg-red-50 rounded">
                      <div className="font-medium text-red-700">Errors:</div>
                      <ul className="list-disc list-inside text-sm text-red-600">
                        {result.errors.map((error, i) => (
                          <li key={i}>{error}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Performance Tips */}
        <div className="mt-8 bg-blue-50 rounded-lg p-6">
          <h3 className="font-semibold text-blue-900 mb-3">Network Testing Guidelines</h3>
          <ul className="list-disc list-inside space-y-2 text-blue-800">
            <li>Test with real devices on actual 2G/3G networks when possible</li>
            <li>Use Chrome DevTools Network throttling for additional testing</li>
            <li>Target performance metrics should meet Core Web Vitals standards even on slow networks</li>
            <li>Audio should adapt quality based on network conditions automatically</li>
            <li>PWA should remain functional offline after initial load</li>
          </ul>
        </div>
      </div>
    </div>
  );
}