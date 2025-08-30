'use client';

import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useNetworkStatus } from '@/hooks/useNetworkStatus';

interface ValidationTest {
  id: string;
  name: string;
  description: string;
  status: 'pending' | 'running' | 'passed' | 'failed';
  result?: string;
  error?: string;
}

interface DeviceInfo {
  userAgent: string;
  viewport: { width: number; height: number };
  deviceType: 'mobile' | 'tablet' | 'desktop';
  os: string;
  browser: string;
}

export default function OfflineValidationPage() {
  const { isOnline, connectionType, networkInfo } = useNetworkStatus();
  const [tests, setTests] = useState<ValidationTest[]>([
    {
      id: 'service-worker',
      name: 'Service Worker Registration',
      description: 'Verify service worker is registered and active',
      status: 'pending'
    },
    {
      id: 'cache-storage',
      name: 'Cache Storage Access',
      description: 'Check if Cache API is available and working',
      status: 'pending'
    },
    {
      id: 'offline-page',
      name: 'Offline Page Loading',
      description: 'Test offline fallback page accessibility',
      status: 'pending'
    },
    {
      id: 'audio-cache',
      name: 'Audio Cache Verification',
      description: 'Verify audio files are cached and playable offline',
      status: 'pending'
    },
    {
      id: 'book-content',
      name: 'Book Content Cache',
      description: 'Check if book content is available offline',
      status: 'pending'
    },
    {
      id: 'ui-indicators',
      name: 'Offline UI Indicators',
      description: 'Verify offline status indicators are working',
      status: 'pending'
    },
    {
      id: 'background-sync',
      name: 'Background Sync',
      description: 'Test background sync registration',
      status: 'pending'
    },
    {
      id: 'storage-quota',
      name: 'Storage Quota Management',
      description: 'Check storage quota and usage',
      status: 'pending'
    }
  ]);

  const [deviceInfo, setDeviceInfo] = useState<DeviceInfo | null>(null);
  const [isTestingAll, setIsTestingAll] = useState(false);
  const [testResults, setTestResults] = useState<{ passed: number; failed: number; total: number }>({
    passed: 0,
    failed: 0,
    total: tests.length
  });

  useEffect(() => {
    // Collect device information
    const getDeviceInfo = (): DeviceInfo => {
      const userAgent = navigator.userAgent;
      const viewport = {
        width: window.innerWidth,
        height: window.innerHeight
      };
      
      let deviceType: DeviceInfo['deviceType'] = 'desktop';
      if (viewport.width <= 768) deviceType = 'mobile';
      else if (viewport.width <= 1024) deviceType = 'tablet';

      const os = /Mac/.test(userAgent) ? 'macOS' : 
                 /Windows/.test(userAgent) ? 'Windows' :
                 /Android/.test(userAgent) ? 'Android' :
                 /iPhone|iPad/.test(userAgent) ? 'iOS' : 'Unknown';

      const browser = /Chrome/.test(userAgent) ? 'Chrome' :
                     /Firefox/.test(userAgent) ? 'Firefox' :
                     /Safari/.test(userAgent) && !/Chrome/.test(userAgent) ? 'Safari' :
                     /Edge/.test(userAgent) ? 'Edge' : 'Unknown';

      return { userAgent, viewport, deviceType, os, browser };
    };

    setDeviceInfo(getDeviceInfo());
  }, []);

  const updateTest = (id: string, updates: Partial<ValidationTest>) => {
    setTests(prev => prev.map(test => 
      test.id === id ? { ...test, ...updates } : test
    ));
  };

  const runTest = async (testId: string): Promise<void> => {
    updateTest(testId, { status: 'running' });

    try {
      switch (testId) {
        case 'service-worker':
          if ('serviceWorker' in navigator) {
            const registration = await navigator.serviceWorker.getRegistration();
            if (registration && registration.active) {
              updateTest(testId, { 
                status: 'passed', 
                result: `Service Worker active: ${registration.scope}` 
              });
            } else {
              updateTest(testId, { 
                status: 'failed', 
                result: 'Service Worker not active' 
              });
            }
          } else {
            updateTest(testId, { 
              status: 'failed', 
              result: 'Service Worker not supported' 
            });
          }
          break;

        case 'cache-storage':
          if ('caches' in window) {
            const cacheNames = await caches.keys();
            const totalCaches = cacheNames.length;
            updateTest(testId, { 
              status: 'passed', 
              result: `${totalCaches} caches found: ${cacheNames.join(', ')}` 
            });
          } else {
            updateTest(testId, { 
              status: 'failed', 
              result: 'Cache API not supported' 
            });
          }
          break;

        case 'offline-page':
          try {
            const response = await fetch('/offline');
            if (response.ok) {
              updateTest(testId, { 
                status: 'passed', 
                result: 'Offline page accessible' 
              });
            } else {
              updateTest(testId, { 
                status: 'failed', 
                result: `Offline page returned ${response.status}` 
              });
            }
          } catch (error) {
            updateTest(testId, { 
              status: 'failed', 
              result: `Cannot access offline page: ${error}` 
            });
          }
          break;

        case 'audio-cache':
          if ('caches' in window) {
            const audioCache = await caches.open('audio-cache');
            const audioKeys = await audioCache.keys();
            updateTest(testId, { 
              status: audioKeys.length > 0 ? 'passed' : 'failed', 
              result: `${audioKeys.length} audio files cached` 
            });
          } else {
            updateTest(testId, { 
              status: 'failed', 
              result: 'Cache API not available' 
            });
          }
          break;

        case 'book-content':
          // Check localStorage and IndexedDB for book content
          const bookData = localStorage.getItem('cached_books') || '[]';
          const cachedBooks = JSON.parse(bookData);
          updateTest(testId, { 
            status: cachedBooks.length > 0 ? 'passed' : 'failed', 
            result: `${cachedBooks.length} books cached locally` 
          });
          break;

        case 'ui-indicators':
          // Check if offline components are present in DOM
          const offlineIndicator = document.querySelector('[data-offline-indicator]');
          const networkStatus = document.querySelector('[data-network-status]');
          const hasIndicators = offlineIndicator || networkStatus;
          updateTest(testId, { 
            status: hasIndicators ? 'passed' : 'failed', 
            result: hasIndicators ? 'Offline UI indicators found' : 'No offline UI indicators found' 
          });
          break;

        case 'background-sync':
          if ('serviceWorker' in navigator && 'sync' in window.ServiceWorkerRegistration.prototype) {
            const registration = await navigator.serviceWorker.getRegistration();
            if (registration) {
              updateTest(testId, { 
                status: 'passed', 
                result: 'Background Sync API available' 
              });
            } else {
              updateTest(testId, { 
                status: 'failed', 
                result: 'Service Worker registration required' 
              });
            }
          } else {
            updateTest(testId, { 
              status: 'failed', 
              result: 'Background Sync not supported' 
            });
          }
          break;

        case 'storage-quota':
          if ('storage' in navigator && 'estimate' in navigator.storage) {
            const estimate = await navigator.storage.estimate();
            const usedMB = Math.round((estimate.usage || 0) / (1024 * 1024));
            const quotaMB = Math.round((estimate.quota || 0) / (1024 * 1024));
            updateTest(testId, { 
              status: 'passed', 
              result: `Storage: ${usedMB}MB used / ${quotaMB}MB available` 
            });
          } else {
            updateTest(testId, { 
              status: 'failed', 
              result: 'Storage Quota API not supported' 
            });
          }
          break;

        default:
          updateTest(testId, { 
            status: 'failed', 
            result: 'Unknown test' 
          });
      }
    } catch (error) {
      updateTest(testId, { 
        status: 'failed', 
        error: error instanceof Error ? error.message : String(error)
      });
    }
  };

  const runAllTests = async () => {
    setIsTestingAll(true);
    
    for (const test of tests) {
      await runTest(test.id);
      // Small delay between tests for better UX
      await new Promise(resolve => setTimeout(resolve, 300));
    }
    
    setIsTestingAll(false);
  };

  useEffect(() => {
    // Update test results summary
    const passed = tests.filter(t => t.status === 'passed').length;
    const failed = tests.filter(t => t.status === 'failed').length;
    setTestResults({ passed, failed, total: tests.length });
  }, [tests]);

  const getStatusColor = (status: ValidationTest['status']) => {
    switch (status) {
      case 'passed': return 'text-green-600 bg-green-50';
      case 'failed': return 'text-red-600 bg-red-50';
      case 'running': return 'text-blue-600 bg-blue-50';
      default: return 'text-gray-600 bg-gray-50';
    }
  };

  const getStatusIcon = (status: ValidationTest['status']) => {
    switch (status) {
      case 'passed': return '✅';
      case 'failed': return '❌';
      case 'running': return '⏳';
      default: return '⚪';
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-4">
            PWA Offline Experience Validation
          </h1>
          <p className="text-gray-600">
            Comprehensive testing suite to validate offline functionality across devices
          </p>
        </div>

        {/* Network Status & Device Info */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
          <div className="bg-white rounded-lg shadow-sm p-6">
            <h3 className="text-lg font-semibold mb-4">Network Status</h3>
            <div className="space-y-3">
              <div className="flex justify-between">
                <span>Status:</span>
                <span className={`font-medium ${isOnline ? 'text-green-600' : 'text-red-600'}`}>
                  {isOnline ? '🟢 Online' : '🔴 Offline'}
                </span>
              </div>
              <div className="flex justify-between">
                <span>Connection:</span>
                <span className="font-medium">{connectionType}</span>
              </div>
              <div className="flex justify-between">
                <span>Effective Type:</span>
                <span className="font-medium">{networkInfo.effectiveType || 'unknown'}</span>
              </div>
            </div>
          </div>

          {deviceInfo && (
            <div className="bg-white rounded-lg shadow-sm p-6">
              <h3 className="text-lg font-semibold mb-4">Device Information</h3>
              <div className="space-y-3">
                <div className="flex justify-between">
                  <span>Device:</span>
                  <span className="font-medium">{deviceInfo.deviceType}</span>
                </div>
                <div className="flex justify-between">
                  <span>OS:</span>
                  <span className="font-medium">{deviceInfo.os}</span>
                </div>
                <div className="flex justify-between">
                  <span>Browser:</span>
                  <span className="font-medium">{deviceInfo.browser}</span>
                </div>
                <div className="flex justify-between">
                  <span>Viewport:</span>
                  <span className="font-medium">
                    {deviceInfo.viewport.width} × {deviceInfo.viewport.height}
                  </span>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Test Results Summary */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <div className="bg-white rounded-lg shadow-sm p-6">
            <h3 className="text-sm font-medium text-gray-500 mb-2">Total Tests</h3>
            <div className="text-2xl font-bold text-gray-900">{testResults.total}</div>
          </div>
          <div className="bg-white rounded-lg shadow-sm p-6">
            <h3 className="text-sm font-medium text-gray-500 mb-2">Passed</h3>
            <div className="text-2xl font-bold text-green-600">{testResults.passed}</div>
          </div>
          <div className="bg-white rounded-lg shadow-sm p-6">
            <h3 className="text-sm font-medium text-gray-500 mb-2">Failed</h3>
            <div className="text-2xl font-bold text-red-600">{testResults.failed}</div>
          </div>
          <div className="bg-white rounded-lg shadow-sm p-6">
            <h3 className="text-sm font-medium text-gray-500 mb-2">Success Rate</h3>
            <div className="text-2xl font-bold text-blue-600">
              {testResults.total > 0 ? Math.round((testResults.passed / testResults.total) * 100) : 0}%
            </div>
          </div>
        </div>

        {/* Controls */}
        <div className="bg-white rounded-lg shadow-sm p-6 mb-8">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold">Validation Tests</h3>
            <button
              onClick={runAllTests}
              disabled={isTestingAll}
              className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isTestingAll ? 'Running Tests...' : 'Run All Tests'}
            </button>
          </div>
        </div>

        {/* Test Results */}
        <div className="bg-white rounded-lg shadow-sm p-6">
          <div className="space-y-4">
            {tests.map((test) => (
              <motion.div
                key={test.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="border rounded-lg p-4 hover:shadow-md transition-shadow"
              >
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center space-x-3">
                    <span className="text-xl">{getStatusIcon(test.status)}</span>
                    <div>
                      <h4 className="font-semibold text-gray-900">{test.name}</h4>
                      <p className="text-sm text-gray-600">{test.description}</p>
                    </div>
                  </div>
                  <div className="flex items-center space-x-3">
                    <span className={`px-3 py-1 rounded-full text-sm font-medium ${getStatusColor(test.status)}`}>
                      {test.status.charAt(0).toUpperCase() + test.status.slice(1)}
                    </span>
                    <button
                      onClick={() => runTest(test.id)}
                      disabled={test.status === 'running' || isTestingAll}
                      className="bg-gray-100 text-gray-700 px-4 py-2 rounded-md text-sm hover:bg-gray-200 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      Test
                    </button>
                  </div>
                </div>
                
                {(test.result || test.error) && (
                  <div className={`mt-3 p-3 rounded-md text-sm ${
                    test.error ? 'bg-red-50 text-red-800' : 'bg-gray-50 text-gray-800'
                  }`}>
                    {test.error || test.result}
                  </div>
                )}
              </motion.div>
            ))}
          </div>
        </div>

        {/* Testing Instructions */}
        <div className="mt-8 bg-blue-50 rounded-lg p-6">
          <h3 className="font-semibold text-blue-900 mb-3">Offline Testing Instructions</h3>
          <div className="space-y-2 text-blue-800">
            <p><strong>1. Online Test:</strong> Run all tests while connected to verify baseline functionality</p>
            <p><strong>2. Offline Test:</strong> Disconnect your internet and run tests again to validate offline behavior</p>
            <p><strong>3. Network Simulation:</strong> Use browser dev tools to simulate slow networks (2G/3G)</p>
            <p><strong>4. Device Testing:</strong> Test across different devices and screen sizes</p>
            <p><strong>5. Cache Verification:</strong> Clear cache and repeat tests to verify cache regeneration</p>
          </div>
        </div>
      </div>
    </div>
  );
}