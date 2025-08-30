/**
 * PWA Analytics Dashboard Component
 * Comprehensive analytics dashboard for PWA metrics, user behavior, and business goals
 */

'use client';

import { useState, useEffect } from 'react';
import { pwaAnalytics, PWAReport, PWAMetrics } from '@/lib/pwa-analytics';

export default function PWAAnalyticsDashboard() {
  const [report, setReport] = useState<PWAReport | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedPeriod, setSelectedPeriod] = useState<'day' | 'week' | 'month'>('week');
  const [autoRefresh, setAutoRefresh] = useState(true);

  useEffect(() => {
    loadAnalyticsReport();
  }, [selectedPeriod]);

  useEffect(() => {
    if (autoRefresh) {
      const interval = setInterval(() => {
        loadAnalyticsReport();
      }, 60000); // Refresh every minute

      return () => clearInterval(interval);
    }
  }, [autoRefresh, selectedPeriod]);

  const loadAnalyticsReport = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const pwaReport = await pwaAnalytics.generatePWAReport(selectedPeriod);
      setReport(pwaReport);
      
    } catch (error) {
      console.error('Failed to load analytics report:', error);
      setError(error instanceof Error ? error.message : 'Failed to load analytics');
    } finally {
      setLoading(false);
    }
  };

  const formatNumber = (num: number): string => {
    if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`;
    if (num >= 1000) return `${(num / 1000).toFixed(1)}K`;
    return num.toString();
  };

  const formatCurrency = (amount: number): string => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
    }).format(amount);
  };

  const formatPercentage = (value: number): string => {
    return `${value.toFixed(1)}%`;
  };

  const getProgressColor = (progress: number): string => {
    if (progress >= 80) return 'text-green-400';
    if (progress >= 60) return 'text-yellow-400';
    if (progress >= 40) return 'text-orange-400';
    return 'text-red-400';
  };

  const getPerformanceColor = (score: number): string => {
    if (score >= 90) return 'text-green-400';
    if (score >= 70) return 'text-yellow-400';
    if (score >= 50) return 'text-orange-400';
    return 'text-red-400';
  };

  if (loading) {
    return (
      <div className="bg-gray-800/50 border border-gray-600 rounded-lg p-6">
        <div className="flex items-center justify-center space-x-2">
          <div className="w-4 h-4 border-2 border-blue-400 border-t-transparent rounded-full animate-spin"></div>
          <span className="text-gray-300">Loading PWA analytics...</span>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-900/20 border border-red-500/30 rounded-lg p-6">
        <h3 className="text-red-400 font-semibold mb-2">Analytics Error</h3>
        <p className="text-red-300">{error}</p>
        <button
          onClick={loadAnalyticsReport}
          className="mt-4 bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded text-sm"
        >
          Retry
        </button>
      </div>
    );
  }

  if (!report) return null;

  return (
    <div className="space-y-6">
      {/* Header with Controls */}
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-white">PWA Analytics Dashboard</h2>
        <div className="flex items-center space-x-4">
          {/* Period Selector */}
          <select
            value={selectedPeriod}
            onChange={(e) => setSelectedPeriod(e.target.value as any)}
            className="bg-gray-700 border border-gray-600 text-white rounded px-3 py-2 text-sm"
          >
            <option value="day">Last 24 Hours</option>
            <option value="week">Last 7 Days</option>
            <option value="month">Last 30 Days</option>
          </select>
          
          {/* Auto Refresh Toggle */}
          <label className="flex items-center space-x-2 text-sm text-gray-300">
            <input
              type="checkbox"
              checked={autoRefresh}
              onChange={(e) => setAutoRefresh(e.target.checked)}
              className="rounded"
            />
            <span>Auto Refresh</span>
          </label>
        </div>
      </div>

      {/* Business Goals Progress */}
      <div className="bg-gray-800/50 border border-gray-600 rounded-lg p-6">
        <h3 className="text-lg font-semibold text-white mb-4">Business Goals Progress</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="text-center">
            <div className="text-sm text-gray-400 mb-2">Monthly Active Users</div>
            <div className="text-2xl font-bold text-white mb-1">
              {formatNumber(report.goals.monthly.actualUsers)} / {formatNumber(report.goals.monthly.targetUsers)}
            </div>
            <div className={`text-sm ${getProgressColor(report.goals.progress.users)}`}>
              {formatPercentage(report.goals.progress.users)} of target
            </div>
            <div className="mt-2 bg-gray-700 rounded-full h-2">
              <div 
                className="bg-blue-500 h-2 rounded-full transition-all duration-300"
                style={{ width: `${Math.min(100, report.goals.progress.users)}%` }}
              />
            </div>
          </div>
          
          <div className="text-center">
            <div className="text-sm text-gray-400 mb-2">Monthly Revenue</div>
            <div className="text-2xl font-bold text-white mb-1">
              {formatCurrency(report.goals.monthly.actualRevenue)} / {formatCurrency(report.goals.monthly.targetRevenue)}
            </div>
            <div className={`text-sm ${getProgressColor(report.goals.progress.revenue)}`}>
              {formatPercentage(report.goals.progress.revenue)} of target
            </div>
            <div className="mt-2 bg-gray-700 rounded-full h-2">
              <div 
                className="bg-green-500 h-2 rounded-full transition-all duration-300"
                style={{ width: `${Math.min(100, report.goals.progress.revenue)}%` }}
              />
            </div>
          </div>
          
          <div className="text-center">
            <div className="text-sm text-gray-400 mb-2">PWA Installations</div>
            <div className="text-2xl font-bold text-white mb-1">
              {formatNumber(report.goals.monthly.actualInstalls)} / {formatNumber(report.goals.monthly.installTarget)}
            </div>
            <div className={`text-sm ${getProgressColor(report.goals.progress.installs)}`}>
              {formatPercentage(report.goals.progress.installs)} of target
            </div>
            <div className="mt-2 bg-gray-700 rounded-full h-2">
              <div 
                className="bg-purple-500 h-2 rounded-full transition-all duration-300"
                style={{ width: `${Math.min(100, report.goals.progress.installs)}%` }}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Key Performance Indicators */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-gray-800/50 border border-gray-600 rounded-lg p-4">
          <div className="text-sm text-gray-400 mb-1">Install Conversion</div>
          <div className={`text-2xl font-bold ${getPerformanceColor(report.metrics.installation.conversionRate)}`}>
            {formatPercentage(report.metrics.installation.conversionRate)}
          </div>
          <div className="text-xs text-gray-500">Target: &gt;40%</div>
        </div>
        
        <div className="bg-gray-800/50 border border-gray-600 rounded-lg p-4">
          <div className="text-sm text-gray-400 mb-1">Performance Score</div>
          <div className={`text-2xl font-bold ${getPerformanceColor(report.summary.performanceScore)}`}>
            {report.summary.performanceScore}
          </div>
          <div className="text-xs text-gray-500">Target: &gt;85</div>
        </div>
        
        <div className="bg-gray-800/50 border border-gray-600 rounded-lg p-4">
          <div className="text-sm text-gray-400 mb-1">Offline Usage</div>
          <div className={`text-2xl font-bold ${getPerformanceColor(report.metrics.offline.offlineUsage)}`}>
            {formatPercentage(report.metrics.offline.offlineUsage)}
          </div>
          <div className="text-xs text-gray-500">Target: &gt;30%</div>
        </div>
        
        <div className="bg-gray-800/50 border border-gray-600 rounded-lg p-4">
          <div className="text-sm text-gray-400 mb-1">User Satisfaction</div>
          <div className={`text-2xl font-bold ${getPerformanceColor(report.summary.userSatisfactionScore)}`}>
            {report.summary.userSatisfactionScore}
          </div>
          <div className="text-xs text-gray-500">Target: &gt;80</div>
        </div>
      </div>

      {/* PWA Installation Analytics */}
      <div className="bg-gray-800/50 border border-gray-600 rounded-lg p-6">
        <h3 className="text-lg font-semibold text-white mb-4">PWA Installation Analytics</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <h4 className="text-white font-medium mb-3">Installation Funnel</h4>
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-gray-400">Prompts Shown</span>
                <span className="text-white font-medium">{report.metrics.installation.installPromptShown}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-gray-400">Accepted</span>
                <span className="text-green-400 font-medium">{report.metrics.installation.installPromptAccepted}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-gray-400">Dismissed</span>
                <span className="text-red-400 font-medium">{report.metrics.installation.installPromptDismissed}</span>
              </div>
              <div className="flex justify-between items-center font-semibold">
                <span className="text-white">Conversion Rate</span>
                <span className={getPerformanceColor(report.metrics.installation.conversionRate)}>
                  {formatPercentage(report.metrics.installation.conversionRate)}
                </span>
              </div>
            </div>
          </div>
          
          <div>
            <h4 className="text-white font-medium mb-3">Optimization Insights</h4>
            <div className="space-y-2 text-sm">
              <div className="text-gray-300">
                <strong>Best Prompt:</strong> {report.insights.installationOptimization.bestPerformingPrompt}
              </div>
              <div className="text-gray-300">
                <strong>Optimal Timing:</strong> {report.insights.installationOptimization.optimalTiming}
              </div>
              <div className="text-gray-300">
                <strong>Key Factors:</strong>
                <ul className="mt-1 ml-4 space-y-1">
                  {report.insights.installationOptimization.conversionFactors.map((factor, index) => (
                    <li key={index} className="text-gray-400">• {factor}</li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* User Engagement Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-gray-800/50 border border-gray-600 rounded-lg p-6">
          <h3 className="text-lg font-semibold text-white mb-4">User Engagement</h3>
          <div className="space-y-3">
            <div className="flex justify-between">
              <span className="text-gray-400">Daily Active Users</span>
              <span className="text-white font-medium">{formatNumber(report.metrics.engagement.dailyActiveUsers)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-400">Weekly Active Users</span>
              <span className="text-white font-medium">{formatNumber(report.metrics.engagement.weeklyActiveUsers)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-400">Monthly Active Users</span>
              <span className="text-white font-medium">{formatNumber(report.metrics.engagement.monthlyActiveUsers)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-400">Avg Session Duration</span>
              <span className="text-white font-medium">{Math.round(report.metrics.engagement.sessionDuration / 60)}min</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-400">Return User Rate</span>
              <span className="text-white font-medium">{formatPercentage(report.metrics.engagement.returnUserRate)}</span>
            </div>
          </div>
        </div>

        <div className="bg-gray-800/50 border border-gray-600 rounded-lg p-6">
          <h3 className="text-lg font-semibold text-white mb-4">Offline Performance</h3>
          <div className="space-y-3">
            <div className="flex justify-between">
              <span className="text-gray-400">Offline Usage</span>
              <span className="text-white font-medium">{formatPercentage(report.metrics.offline.offlineUsage)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-400">Offline Session Duration</span>
              <span className="text-white font-medium">{Math.round(report.metrics.offline.offlineSessionDuration / 60)}min</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-400">Sync Success Rate</span>
              <span className="text-green-400 font-medium">{formatPercentage(report.metrics.offline.syncSuccessRate)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-400">Cached Content Access</span>
              <span className="text-white font-medium">{report.metrics.offline.cachedContentAccess}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-400">Offline Error Rate</span>
              <span className={`font-medium ${report.metrics.offline.offlineErrorRate < 5 ? 'text-green-400' : 'text-red-400'}`}>
                {formatPercentage(report.metrics.offline.offlineErrorRate)}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Emerging Markets Analytics */}
      <div className="bg-gray-800/50 border border-gray-600 rounded-lg p-6">
        <h3 className="text-lg font-semibold text-white mb-4">Emerging Markets Performance</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <h4 className="text-white font-medium mb-3">User Growth by Country</h4>
            <div className="space-y-2">
              {Object.entries(report.emergingMarketsBreakdown.userGrowth)
                .sort((a, b) => b[1] - a[1])
                .slice(0, 5)
                .map(([country, users]) => (
                  <div key={country} className="flex justify-between">
                    <span className="text-gray-400">{country}</span>
                    <span className="text-white font-medium">{formatNumber(users)} users</span>
                  </div>
                ))}
            </div>
          </div>
          
          <div>
            <h4 className="text-white font-medium mb-3">Revenue by Country</h4>
            <div className="space-y-2">
              {Object.entries(report.emergingMarketsBreakdown.revenueContribution)
                .sort((a, b) => b[1] - a[1])
                .slice(0, 5)
                .map(([country, revenue]) => (
                  <div key={country} className="flex justify-between">
                    <span className="text-gray-400">{country}</span>
                    <span className="text-white font-medium">{formatCurrency(revenue)}</span>
                  </div>
                ))}
            </div>
          </div>
        </div>
        
        <div className="mt-6">
          <h4 className="text-white font-medium mb-3">Regional Performance Scores</h4>
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
            {Object.entries(report.emergingMarketsBreakdown.performanceMetrics)
              .slice(0, 10)
              .map(([country, perf]) => (
                <div key={country} className="text-center">
                  <div className="text-sm text-gray-400">{country}</div>
                  <div className={`text-lg font-semibold ${getPerformanceColor(perf.score)}`}>
                    {perf.score}
                  </div>
                  <div className={`text-xs ${
                    perf.trend === 'improving' ? 'text-green-400' :
                    perf.trend === 'declining' ? 'text-red-400' : 'text-gray-400'
                  }`}>
                    {perf.trend === 'improving' ? '↗' : perf.trend === 'declining' ? '↘' : '→'} {perf.trend}
                  </div>
                </div>
              ))}
          </div>
        </div>
      </div>

      {/* Device and Network Analytics */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-gray-800/50 border border-gray-600 rounded-lg p-6">
          <h3 className="text-lg font-semibold text-white mb-4">Device Usage</h3>
          <div className="space-y-3">
            {Object.entries(report.metrics.emergingMarkets.deviceTypeUsage)
              .sort((a, b) => b[1] - a[1])
              .map(([device, count]) => {
                const total = Object.values(report.metrics.emergingMarkets.deviceTypeUsage).reduce((sum, c) => sum + c, 0);
                const percentage = (count / total) * 100;
                return (
                  <div key={device} className="space-y-1">
                    <div className="flex justify-between">
                      <span className="text-gray-400 capitalize">{device}</span>
                      <span className="text-white font-medium">{formatNumber(count)} ({formatPercentage(percentage)})</span>
                    </div>
                    <div className="bg-gray-700 rounded-full h-2">
                      <div 
                        className="bg-blue-500 h-2 rounded-full"
                        style={{ width: `${percentage}%` }}
                      />
                    </div>
                  </div>
                );
              })}
          </div>
        </div>
        
        <div className="bg-gray-800/50 border border-gray-600 rounded-lg p-6">
          <h3 className="text-lg font-semibold text-white mb-4">Network Performance</h3>
          <div className="space-y-3">
            {Object.entries(report.metrics.emergingMarkets.networkTypeUsage)
              .sort((a, b) => b[1] - a[1])
              .map(([network, count]) => {
                const total = Object.values(report.metrics.emergingMarkets.networkTypeUsage).reduce((sum, c) => sum + c, 0);
                const percentage = (count / total) * 100;
                return (
                  <div key={network} className="space-y-1">
                    <div className="flex justify-between">
                      <span className="text-gray-400 uppercase">{network}</span>
                      <span className="text-white font-medium">{formatNumber(count)} ({formatPercentage(percentage)})</span>
                    </div>
                    <div className="bg-gray-700 rounded-full h-2">
                      <div 
                        className={`h-2 rounded-full ${
                          network === '4g' ? 'bg-green-500' :
                          network === '3g' ? 'bg-yellow-500' :
                          network === 'wifi' ? 'bg-blue-500' : 'bg-red-500'
                        }`}
                        style={{ width: `${percentage}%` }}
                      />
                    </div>
                  </div>
                );
              })}
          </div>
        </div>
      </div>

      {/* Performance Insights */}
      <div className="bg-gray-800/50 border border-gray-600 rounded-lg p-6">
        <h3 className="text-lg font-semibold text-white mb-4">Performance Insights &amp; Recommendations</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <h4 className="text-white font-medium mb-3">Performance Bottlenecks</h4>
            <div className="space-y-2">
              {report.insights.performanceBottlenecks.slowestPages.map((bottleneck, index) => (
                <div key={index} className="bg-gray-700/50 rounded p-3">
                  <div className="flex justify-between items-center">
                    <span className="text-gray-300">{bottleneck.page}</span>
                    <span className="text-red-400 font-medium">{bottleneck.avgLoadTime}ms</span>
                  </div>
                  <div className="text-xs text-gray-400 mt-1">
                    Impact: {bottleneck.impact}% of user experience
                  </div>
                </div>
              ))}
              
              {report.insights.performanceBottlenecks.resourceHeavyFeatures.map((feature, index) => (
                <div key={index} className="bg-gray-700/50 rounded p-3">
                  <div className="flex justify-between items-center">
                    <span className="text-gray-300">{feature.feature}</span>
                    <span className="text-yellow-400 font-medium">{feature.memoryUsage}MB</span>
                  </div>
                  <div className="text-xs text-gray-400 mt-1">
                    {feature.optimization}
                  </div>
                </div>
              ))}
            </div>
          </div>
          
          <div>
            <h4 className="text-white font-medium mb-3">User Behavior Patterns</h4>
            <div className="space-y-2">
              {report.insights.userBehaviorPatterns.preferredFeatures.map((feature, index) => (
                <div key={index} className="flex items-center justify-between">
                  <span className="text-gray-400 capitalize">{feature.replace('_', ' ')}</span>
                  <div className="w-16 bg-gray-700 rounded-full h-2">
                    <div 
                      className="bg-blue-500 h-2 rounded-full"
                      style={{ width: `${Math.random() * 100}%` }}
                    />
                  </div>
                </div>
              ))}
              
              <div className="mt-4">
                <h5 className="text-gray-300 font-medium mb-2">Common User Journeys</h5>
                <div className="space-y-1 text-sm text-gray-400">
                  {report.insights.userBehaviorPatterns.commonUserJourneys.map((journey, index) => (
                    <div key={index}>• {journey}</div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Business Opportunities */}
      <div className="bg-gray-800/50 border border-gray-600 rounded-lg p-6">
        <h3 className="text-lg font-semibold text-white mb-4">Business Opportunities</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <h4 className="text-white font-medium mb-3">Growth Opportunities</h4>
            <div className="space-y-2 text-sm">
              {report.insights.businessOpportunities.growthLevers.map((lever, index) => (
                <div key={index} className="flex items-center space-x-2">
                  <span className="w-2 h-2 bg-green-400 rounded-full"></span>
                  <span className="text-gray-300">{lever}</span>
                </div>
              ))}
            </div>
            
            <h4 className="text-white font-medium mb-3 mt-6">High-Value Segments</h4>
            <div className="space-y-2 text-sm">
              {report.insights.businessOpportunities.highValueUserSegments.map((segment, index) => (
                <div key={index} className="flex items-center space-x-2">
                  <span className="w-2 h-2 bg-purple-400 rounded-full"></span>
                  <span className="text-gray-300">{segment}</span>
                </div>
              ))}
            </div>
          </div>
          
          <div>
            <h4 className="text-white font-medium mb-3">Monetization</h4>
            <div className="space-y-2 text-sm">
              {report.insights.businessOpportunities.monetizationOpportunities.map((opportunity, index) => (
                <div key={index} className="flex items-center space-x-2">
                  <span className="w-2 h-2 bg-yellow-400 rounded-full"></span>
                  <span className="text-gray-300">{opportunity}</span>
                </div>
              ))}
            </div>
            
            <h4 className="text-white font-medium mb-3 mt-6">Cost Optimizations</h4>
            <div className="space-y-2 text-sm">
              {report.insights.businessOpportunities.costOptimizations.map((optimization, index) => (
                <div key={index} className="flex items-center space-x-2">
                  <span className="w-2 h-2 bg-blue-400 rounded-full"></span>
                  <span className="text-gray-300">{optimization}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Export and Actions */}
      <div className="flex items-center justify-between">
        <div className="text-sm text-gray-400">
          Report generated: {new Date(report.period).toLocaleString()}
        </div>
        <div className="space-x-3">
          <button
            onClick={() => {
              const data = pwaAnalytics.exportPWAData();
              const blob = new Blob([data], { type: 'application/json' });
              const url = URL.createObjectURL(blob);
              const a = document.createElement('a');
              a.href = url;
              a.download = `pwa-analytics-${selectedPeriod}-${new Date().toISOString().split('T')[0]}.json`;
              a.click();
              URL.revokeObjectURL(url);
            }}
            className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded text-sm font-medium"
          >
            Export Data
          </button>
          <button
            onClick={loadAnalyticsReport}
            className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded text-sm font-medium"
          >
            Refresh
          </button>
        </div>
      </div>
    </div>
  );
}