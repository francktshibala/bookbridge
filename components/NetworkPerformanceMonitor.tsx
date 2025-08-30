'use client';

import React, { useEffect, useState } from 'react';
import { NetworkTester, NETWORK_CONDITIONS, PerformanceMetrics } from '@/lib/network-testing';

interface NetworkPerformanceMonitorProps {
  bookId?: string;
  isVisible?: boolean;
}

export const NetworkPerformanceMonitor: React.FC<NetworkPerformanceMonitorProps> = ({ 
  bookId, 
  isVisible = false 
}) => {
  const [metrics, setMetrics] = useState<PerformanceMetrics | null>(null);
  const [networkInfo, setNetworkInfo] = useState<any>(null);
  const [isCollecting, setIsCollecting] = useState(false);

  // Detect current network condition
  useEffect(() => {
    if ('connection' in navigator) {
      const connection = (navigator as any).connection;
      
      const updateNetworkInfo = () => {
        setNetworkInfo({
          effectiveType: connection.effectiveType,
          downlink: connection.downlink,
          rtt: connection.rtt,
          saveData: connection.saveData
        });
      };
      
      updateNetworkInfo();
      connection.addEventListener('change', updateNetworkInfo);
      
      return () => {
        connection.removeEventListener('change', updateNetworkInfo);
      };
    }
  }, []);

  // Start performance monitoring
  const startMonitoring = async () => {
    if (isCollecting) return;
    
    setIsCollecting(true);
    const networkCondition = networkInfo?.effectiveType || 'unknown';
    const tester = new NetworkTester(networkCondition);
    
    tester.startMonitoring();
    
    // Test for 10 seconds to gather metrics
    setTimeout(async () => {
      await tester.testOfflineCapability();
      const finalMetrics = tester.getMetrics();
      setMetrics(finalMetrics);
      tester.stopMonitoring();
      setIsCollecting(false);
    }, 10000);
  };

  // Get performance grade
  const getPerformanceGrade = (metrics: PerformanceMetrics): { grade: string; color: string } => {
    const { lcp = 0, fcp = 0, cacheHitRate = 0, audioLoadTime = 0 } = metrics.metrics;
    
    let score = 0;
    
    // LCP scoring (40% weight)
    if (lcp < 2500) score += 40;
    else if (lcp < 4000) score += 25;
    else score += 10;
    
    // FCP scoring (30% weight)
    if (fcp < 1800) score += 30;
    else if (fcp < 3000) score += 20;
    else score += 10;
    
    // Cache hit rate (20% weight)
    if (cacheHitRate > 70) score += 20;
    else if (cacheHitRate > 50) score += 15;
    else score += 5;
    
    // Audio load time (10% weight)
    if (audioLoadTime < 2000) score += 10;
    else if (audioLoadTime < 5000) score += 7;
    else score += 3;
    
    if (score >= 85) return { grade: 'A', color: 'text-green-600' };
    if (score >= 70) return { grade: 'B', color: 'text-blue-600' };
    if (score >= 55) return { grade: 'C', color: 'text-yellow-600' };
    if (score >= 40) return { grade: 'D', color: 'text-orange-600' };
    return { grade: 'F', color: 'text-red-600' };
  };

  if (!isVisible && !process.env.NODE_ENV || process.env.NODE_ENV === 'production') {
    return null;
  }

  return (
    <div className="fixed bottom-4 right-4 z-50">
      <div className="bg-white rounded-lg shadow-lg border max-w-sm">
        {/* Header */}
        <div className="p-3 bg-gray-50 rounded-t-lg border-b">
          <div className="flex items-center justify-between">
            <h3 className="font-medium text-sm">Network Performance</h3>
            <button
              onClick={startMonitoring}
              disabled={isCollecting}
              className="text-xs bg-blue-600 text-white px-2 py-1 rounded hover:bg-blue-700 disabled:bg-gray-400"
            >
              {isCollecting ? 'Collecting...' : 'Test'}
            </button>
          </div>
        </div>

        {/* Current Network */}
        <div className="p-3 border-b">
          <div className="text-xs text-gray-600 mb-1">Current Network</div>
          <div className="text-sm font-medium">
            {networkInfo ? (
              <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                networkInfo.effectiveType === 'slow-2g' || networkInfo.effectiveType === '2g' 
                  ? 'bg-red-100 text-red-800'
                  : networkInfo.effectiveType === '3g'
                  ? 'bg-yellow-100 text-yellow-800'
                  : 'bg-green-100 text-green-800'
              }`}>
                {networkInfo.effectiveType?.toUpperCase()} • {networkInfo.downlink}Mbps
              </span>
            ) : (
              'Unknown'
            )}
          </div>
        </div>

        {/* Metrics */}
        {metrics && (
          <div className="p-3">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs text-gray-600">Performance Grade</span>
              <span className={`text-lg font-bold ${getPerformanceGrade(metrics).color}`}>
                {getPerformanceGrade(metrics).grade}
              </span>
            </div>
            
            <div className="grid grid-cols-2 gap-2 text-xs">
              <div>
                <span className="text-gray-600">FCP:</span> 
                <span className="ml-1 font-medium">
                  {metrics.metrics.fcp ? `${metrics.metrics.fcp.toFixed(0)}ms` : 'N/A'}
                </span>
              </div>
              <div>
                <span className="text-gray-600">LCP:</span> 
                <span className="ml-1 font-medium">
                  {metrics.metrics.lcp ? `${metrics.metrics.lcp.toFixed(0)}ms` : 'N/A'}
                </span>
              </div>
              <div>
                <span className="text-gray-600">Cache:</span> 
                <span className="ml-1 font-medium">{metrics.metrics.cacheHitRate}%</span>
              </div>
              <div>
                <span className="text-gray-600">Audio:</span> 
                <span className="ml-1 font-medium">
                  {metrics.metrics.audioLoadTime ? `${metrics.metrics.audioLoadTime.toFixed(0)}ms` : 'N/A'}
                </span>
              </div>
            </div>
            
            {metrics.metrics.offlineCapability && (
              <div className="mt-2 text-xs text-green-600 flex items-center">
                ✓ Offline capable
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};