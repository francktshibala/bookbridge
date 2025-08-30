'use client';

import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';

interface DeviceTest {
  id: string;
  name: string;
  description: string;
  status: 'pending' | 'running' | 'passed' | 'failed';
  result?: string;
}

interface DeviceProfile {
  name: string;
  viewport: { width: number; height: number };
  userAgent: string;
  description: string;
}

const DEVICE_PROFILES: DeviceProfile[] = [
  {
    name: 'iPhone SE',
    viewport: { width: 375, height: 667 },
    userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 14_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/14.0 Mobile/15E148 Safari/604.1',
    description: 'Small screen iOS device - common in emerging markets'
  },
  {
    name: 'Android Budget Phone',
    viewport: { width: 360, height: 640 },
    userAgent: 'Mozilla/5.0 (Linux; Android 9; SM-A102U) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/79.0.3945.136 Mobile Safari/537.36',
    description: 'Low-end Android device - typical in target markets'
  },
  {
    name: 'iPad Mini',
    viewport: { width: 768, height: 1024 },
    userAgent: 'Mozilla/5.0 (iPad; CPU OS 14_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/14.0 Mobile/15E148 Safari/604.1',
    description: 'Tablet experience testing'
  },
  {
    name: 'Desktop Chrome',
    viewport: { width: 1280, height: 720 },
    userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
    description: 'Desktop browser baseline'
  }
];

export default function DeviceTestingPanel() {
  const [selectedProfile, setSelectedProfile] = useState<DeviceProfile>(DEVICE_PROFILES[0]);
  const [isSimulating, setIsSimulating] = useState(false);
  const [tests, setTests] = useState<DeviceTest[]>([
    {
      id: 'viewport-simulation',
      name: 'Viewport Simulation',
      description: 'Test responsive layout on target device dimensions',
      status: 'pending'
    },
    {
      id: 'touch-interactions',
      name: 'Touch Interactions',
      description: 'Verify touch gestures and mobile interactions work',
      status: 'pending'
    },
    {
      id: 'offline-reading',
      name: 'Offline Reading Experience',
      description: 'Test reading functionality without network',
      status: 'pending'
    },
    {
      id: 'audio-playback',
      name: 'Offline Audio Playback',
      description: 'Verify cached audio files play correctly',
      status: 'pending'
    },
    {
      id: 'install-prompt',
      name: 'Install Prompt Behavior',
      description: 'Test PWA install prompt on device',
      status: 'pending'
    },
    {
      id: 'performance-metrics',
      name: 'Performance Metrics',
      description: 'Measure loading times and Core Web Vitals',
      status: 'pending'
    }
  ]);

  const updateTest = (id: string, updates: Partial<DeviceTest>) => {
    setTests(prev => prev.map(test => 
      test.id === id ? { ...test, ...updates } : test
    ));
  };

  const simulateDevice = async () => {
    setIsSimulating(true);
    
    try {
      // Simulate viewport changes
      const originalWidth = window.innerWidth;
      const originalHeight = window.innerHeight;
      
      // This is a simulation - in a real test environment you'd use actual device testing
      // For now, we'll test what we can in the current browser environment
      
      updateTest('viewport-simulation', { status: 'running' });
      
      // Simulate by checking if the layout responds to the target dimensions
      const mediaQuery = window.matchMedia(`(max-width: ${selectedProfile.viewport.width}px)`);
      const isResponsive = mediaQuery.matches || window.innerWidth <= selectedProfile.viewport.width;
      
      updateTest('viewport-simulation', {
        status: isResponsive ? 'passed' : 'failed',
        result: isResponsive 
          ? `Layout responsive to ${selectedProfile.viewport.width}px width`
          : `Layout may not be optimized for ${selectedProfile.viewport.width}px width`
      });

      // Test touch interactions (check for touch event support)
      updateTest('touch-interactions', { status: 'running' });
      const hasTouchSupport = 'ontouchstart' in window || navigator.maxTouchPoints > 0;
      updateTest('touch-interactions', {
        status: hasTouchSupport ? 'passed' : 'failed',
        result: hasTouchSupport 
          ? 'Touch events supported'
          : 'Touch events not detected (desktop browser)'
      });

      // Test offline reading capability
      updateTest('offline-reading', { status: 'running' });
      const hasOfflinePage = await fetch('/offline').then(r => r.ok).catch(() => false);
      const hasCachedContent = localStorage.getItem('cached_books') !== null;
      updateTest('offline-reading', {
        status: hasOfflinePage && hasCachedContent ? 'passed' : 'failed',
        result: `Offline page: ${hasOfflinePage ? 'available' : 'missing'}, Cached content: ${hasCachedContent ? 'found' : 'none'}`
      });

      // Test audio playback capability
      updateTest('audio-playback', { status: 'running' });
      if ('caches' in window) {
        const audioCache = await caches.open('audio-cache');
        const audioFiles = await audioCache.keys();
        const hasAudioCache = audioFiles.length > 0;
        updateTest('audio-playback', {
          status: hasAudioCache ? 'passed' : 'failed',
          result: `${audioFiles.length} audio files cached`
        });
      } else {
        updateTest('audio-playback', {
          status: 'failed',
          result: 'Cache API not available'
        });
      }

      // Test install prompt
      updateTest('install-prompt', { status: 'running' });
      const hasManifest = document.querySelector('link[rel="manifest"]') !== null;
      const hasServiceWorker = 'serviceWorker' in navigator;
      const installPromptReady = hasManifest && hasServiceWorker;
      updateTest('install-prompt', {
        status: installPromptReady ? 'passed' : 'failed',
        result: `Manifest: ${hasManifest ? 'found' : 'missing'}, SW: ${hasServiceWorker ? 'supported' : 'unsupported'}`
      });

      // Test performance metrics
      updateTest('performance-metrics', { status: 'running' });
      if ('performance' in window) {
        const navigation = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming;
        const fcp = performance.getEntriesByName('first-contentful-paint')[0];
        const loadTime = navigation ? navigation.loadEventEnd - navigation.fetchStart : 0;
        
        updateTest('performance-metrics', {
          status: loadTime < 3000 ? 'passed' : 'failed',
          result: `Load time: ${Math.round(loadTime)}ms, FCP: ${fcp ? Math.round((fcp as any).startTime) : 'N/A'}ms`
        });
      } else {
        updateTest('performance-metrics', {
          status: 'failed',
          result: 'Performance API not available'
        });
      }

    } catch (error) {
      console.error('Device simulation error:', error);
    } finally {
      setIsSimulating(false);
    }
  };

  const generateReport = () => {
    const report = {
      timestamp: new Date().toISOString(),
      device: selectedProfile.name,
      viewport: selectedProfile.viewport,
      tests: tests.map(test => ({
        name: test.name,
        status: test.status,
        result: test.result || 'No result'
      })),
      summary: {
        passed: tests.filter(t => t.status === 'passed').length,
        failed: tests.filter(t => t.status === 'failed').length,
        total: tests.length
      }
    };

    const blob = new Blob([JSON.stringify(report, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `offline-validation-${selectedProfile.name.toLowerCase().replace(/\s+/g, '-')}-${Date.now()}.json`;
    a.click();
  };

  const getStatusColor = (status: DeviceTest['status']) => {
    switch (status) {
      case 'passed': return 'text-green-600 bg-green-50 border-green-200';
      case 'failed': return 'text-red-600 bg-red-50 border-red-200';
      case 'running': return 'text-blue-600 bg-blue-50 border-blue-200';
      default: return 'text-gray-600 bg-gray-50 border-gray-200';
    }
  };

  const getStatusIcon = (status: DeviceTest['status']) => {
    switch (status) {
      case 'passed': return '✅';
      case 'failed': return '❌';
      case 'running': return '⏳';
      default: return '⚪';
    }
  };

  return (
    <div className="max-w-6xl mx-auto p-6">
      <div className="mb-8">
        <h2 className="text-2xl font-bold text-gray-900 mb-4">
          Device-Specific Offline Experience Testing
        </h2>
        <p className="text-gray-600">
          Test offline functionality across different device types and screen sizes
        </p>
      </div>

      {/* Device Profile Selection */}
      <div className="bg-white rounded-lg shadow-sm p-6 mb-8">
        <h3 className="text-lg font-semibold mb-4">Select Device Profile</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {DEVICE_PROFILES.map((profile) => (
            <button
              key={profile.name}
              onClick={() => setSelectedProfile(profile)}
              className={`p-4 rounded-lg border-2 text-left transition-all ${
                selectedProfile.name === profile.name
                  ? 'border-blue-500 bg-blue-50'
                  : 'border-gray-200 hover:border-gray-300'
              }`}
            >
              <div className="font-semibold text-gray-900">{profile.name}</div>
              <div className="text-sm text-gray-600 mt-1">
                {profile.viewport.width} × {profile.viewport.height}
              </div>
              <div className="text-xs text-gray-500 mt-2">{profile.description}</div>
            </button>
          ))}
        </div>
      </div>

      {/* Current Selection Info */}
      <div className="bg-white rounded-lg shadow-sm p-6 mb-8">
        <h3 className="text-lg font-semibold mb-4">Testing Configuration</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <h4 className="font-medium text-gray-900 mb-2">Selected Device</h4>
            <div className="space-y-2">
              <div className="flex justify-between">
                <span>Device:</span>
                <span className="font-medium">{selectedProfile.name}</span>
              </div>
              <div className="flex justify-between">
                <span>Viewport:</span>
                <span className="font-medium">
                  {selectedProfile.viewport.width} × {selectedProfile.viewport.height}
                </span>
              </div>
            </div>
          </div>
          <div>
            <h4 className="font-medium text-gray-900 mb-2">Test Controls</h4>
            <div className="space-y-3">
              <button
                onClick={simulateDevice}
                disabled={isSimulating}
                className="w-full bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 disabled:opacity-50"
              >
                {isSimulating ? 'Testing...' : 'Run Device Tests'}
              </button>
              <button
                onClick={generateReport}
                className="w-full bg-gray-600 text-white px-4 py-2 rounded-lg hover:bg-gray-700"
              >
                Export Report
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Test Results */}
      <div className="bg-white rounded-lg shadow-sm p-6">
        <h3 className="text-lg font-semibold mb-6">Device Test Results</h3>
        <div className="space-y-4">
          {tests.map((test) => (
            <motion.div
              key={test.id}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              className={`border rounded-lg p-4 ${getStatusColor(test.status)}`}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <span className="text-xl">{getStatusIcon(test.status)}</span>
                  <div>
                    <h4 className="font-semibold">{test.name}</h4>
                    <p className="text-sm opacity-80">{test.description}</p>
                  </div>
                </div>
                <div className="text-right">
                  <div className={`px-3 py-1 rounded-full text-sm font-medium ${getStatusColor(test.status)}`}>
                    {test.status.charAt(0).toUpperCase() + test.status.slice(1)}
                  </div>
                </div>
              </div>
              
              {test.result && (
                <div className="mt-3 p-3 bg-white bg-opacity-50 rounded-md text-sm">
                  {test.result}
                </div>
              )}
            </motion.div>
          ))}
        </div>
      </div>

      {/* Device Testing Guidelines */}
      <div className="mt-8 bg-yellow-50 rounded-lg p-6">
        <h3 className="font-semibold text-yellow-900 mb-3">Device Testing Guidelines</h3>
        <div className="space-y-2 text-yellow-800">
          <p><strong>Mobile Testing:</strong> Focus on touch interactions, small screen layouts, and limited bandwidth scenarios</p>
          <p><strong>Tablet Testing:</strong> Verify landscape/portrait modes and intermediate screen sizes</p>
          <p><strong>Cross-Browser:</strong> Test in Safari (iOS), Chrome (Android), and Chrome/Firefox (desktop)</p>
          <p><strong>Network Conditions:</strong> Use DevTools Network tab to simulate 2G/3G speeds</p>
          <p><strong>Storage Limitations:</strong> Test with limited storage quotas typical of budget devices</p>
        </div>
      </div>

      {/* Real Device Testing Recommendations */}
      <div className="mt-8 bg-blue-50 rounded-lg p-6">
        <h3 className="font-semibold text-blue-900 mb-3">Real Device Testing Checklist</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <h4 className="font-medium text-blue-900 mb-2">Target Market Devices</h4>
            <ul className="list-disc list-inside space-y-1 text-blue-800 text-sm">
              <li>Samsung Galaxy A-series (Android, budget)</li>
              <li>iPhone SE 2020/2022 (iOS, affordable)</li>
              <li>Xiaomi Redmi series (Android, emerging markets)</li>
              <li>Older Android devices (Android 8-10)</li>
            </ul>
          </div>
          <div>
            <h4 className="font-medium text-blue-900 mb-2">Testing Scenarios</h4>
            <ul className="list-disc list-inside space-y-1 text-blue-800 text-sm">
              <li>Install PWA from browser</li>
              <li>Use PWA in airplane mode</li>
              <li>Switch between online/offline states</li>
              <li>Test after clearing app cache</li>
              <li>Long-term offline usage (24+ hours)</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}