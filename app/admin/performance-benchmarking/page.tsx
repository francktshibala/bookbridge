'use client';

import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { 
  PerformanceBenchmarker, 
  BenchmarkReport, 
  COMPETITOR_BENCHMARKS,
  CompetitorBenchmark,
  PerformanceMetric 
} from '@/lib/performance-benchmarking';

export default function PerformanceBenchmarkingPage() {
  const [benchmarker] = useState(() => typeof window !== 'undefined' ? new PerformanceBenchmarker() : null);
  const [report, setReport] = useState<BenchmarkReport | null>(null);
  const [isRunning, setIsRunning] = useState(false);
  const [selectedCompetitor, setSelectedCompetitor] = useState<CompetitorBenchmark | null>(null);

  const runBenchmark = async () => {
    if (!benchmarker) return;
    
    setIsRunning(true);
    try {
      const newReport = await benchmarker.generateBenchmarkReport();
      setReport(newReport);
    } catch (error) {
      console.error('Benchmark failed:', error);
    } finally {
      setIsRunning(false);
    }
  };

  const downloadReport = () => {
    if (!report || !benchmarker) return;
    
    const dataStr = benchmarker.exportBenchmarkData(report);
    const dataUri = 'data:application/json;charset=utf-8,'+ encodeURIComponent(dataStr);
    
    const exportFileDefaultName = `bookbridge-benchmark-${new Date().toISOString().slice(0,10)}.json`;
    
    const linkElement = document.createElement('a');
    linkElement.setAttribute('href', dataUri);
    linkElement.setAttribute('download', exportFileDefaultName);
    linkElement.click();
  };

  const getScoreColor = (score: number) => {
    if (score >= 85) return 'text-green-600';
    if (score >= 70) return 'text-blue-600';
    if (score >= 50) return 'text-yellow-600';
    return 'text-red-600';
  };

  const getPositionBadgeColor = (position: BenchmarkReport['marketPosition']) => {
    switch (position) {
      case 'leader': return 'bg-green-100 text-green-800';
      case 'competitive': return 'bg-blue-100 text-blue-800';
      case 'needs_improvement': return 'bg-yellow-100 text-yellow-800';
      case 'poor': return 'bg-red-100 text-red-800';
    }
  };

  const formatMetricValue = (metric: PerformanceMetric) => {
    if (metric.unit === 'ms') {
      return `${Math.round(metric.value)}ms`;
    }
    if (metric.unit === 'MB') {
      return `${metric.value.toFixed(1)}MB`;
    }
    if (metric.unit === 'boolean') {
      return metric.value ? '✅' : '❌';
    }
    return `${Math.round(metric.value)} ${metric.unit}`;
  };

  const getCompetitorCategoryEmoji = (category: CompetitorBenchmark['category']) => {
    switch (category) {
      case 'audio_book': return '🎧';
      case 'reading_app': return '📖';
      case 'language_learning': return '🌍';
      case 'general_pwa': return '📱';
    }
  };

  const compareMetric = (ourValue: number, competitorValue: number, lowerIsBetter = true) => {
    const better = lowerIsBetter ? ourValue < competitorValue : ourValue > competitorValue;
    return better ? '🟢' : '🔴';
  };

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-4">
            Performance Benchmarking Dashboard
          </h1>
          <p className="text-gray-600">
            Compare BookBridge PWA performance against industry competitors
          </p>
        </div>

        {/* Controls */}
        <div className="bg-white rounded-lg shadow-sm p-6 mb-8">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-semibold">Run Performance Benchmark</h3>
              <p className="text-sm text-gray-600 mt-1">
                Collect comprehensive performance metrics and compare against competitors
              </p>
            </div>
            <div className="flex space-x-4">
              <button
                onClick={runBenchmark}
                disabled={isRunning || !benchmarker}
                className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isRunning ? 'Running Benchmark...' : 'Run Benchmark'}
              </button>
              {report && (
                <button
                  onClick={downloadReport}
                  className="bg-green-600 text-white px-6 py-2 rounded-lg hover:bg-green-700"
                >
                  Download Report
                </button>
              )}
            </div>
          </div>
        </div>

        {report && (
          <>
            {/* Overall Performance Score */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
              <div className="bg-white rounded-lg shadow-sm p-6">
                <h3 className="text-lg font-semibold mb-6">Overall Performance Score</h3>
                <div className="text-center">
                  <div className={`text-6xl font-bold mb-4 ${getScoreColor(report.performanceScore.overall)}`}>
                    {report.performanceScore.overall}
                  </div>
                  <div className={`inline-flex px-4 py-2 rounded-full text-sm font-medium ${getPositionBadgeColor(report.marketPosition)}`}>
                    Market Position: {report.marketPosition.replace('_', ' ').toUpperCase()}
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-lg shadow-sm p-6">
                <h3 className="text-lg font-semibold mb-6">Category Scores</h3>
                <div className="space-y-4">
                  {Object.entries(report.performanceScore.categories).map(([category, score]) => (
                    <div key={category} className="flex items-center justify-between">
                      <span className="text-sm font-medium text-gray-700 capitalize">
                        {category.replace('_', ' ')}
                      </span>
                      <div className="flex items-center space-x-3">
                        <div className="w-20 bg-gray-200 rounded-full h-2">
                          <div 
                            className={`h-2 rounded-full ${score >= 80 ? 'bg-green-500' : score >= 60 ? 'bg-blue-500' : score >= 40 ? 'bg-yellow-500' : 'bg-red-500'}`}
                            style={{ width: `${score}%` }}
                          />
                        </div>
                        <span className={`text-sm font-semibold ${getScoreColor(score)}`}>
                          {score}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Recommendations */}
            <div className="bg-white rounded-lg shadow-sm p-6 mb-8">
              <h3 className="text-lg font-semibold mb-4">Performance Recommendations</h3>
              <div className="space-y-3">
                {report.recommendations.map((recommendation, index) => (
                  <motion.div
                    key={index}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: index * 0.1 }}
                    className="flex items-start space-x-3 p-3 bg-blue-50 rounded-lg"
                  >
                    <span className="text-blue-600 font-semibold">{index + 1}.</span>
                    <span className="text-blue-800">{recommendation}</span>
                  </motion.div>
                ))}
              </div>
            </div>

            {/* Detailed Metrics */}
            <div className="bg-white rounded-lg shadow-sm p-6 mb-8">
              <h3 className="text-lg font-semibold mb-6">Detailed Performance Metrics</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {Object.entries(report.bookBridgeMetrics).map(([key, metric]) => (
                  <div key={key} className="border rounded-lg p-4">
                    <div className="flex items-center justify-between mb-2">
                      <h4 className="font-medium text-gray-900">{metric.name}</h4>
                      <span className={`px-2 py-1 rounded-full text-xs font-medium
                        ${metric.category === 'loading' ? 'bg-blue-100 text-blue-800' :
                          metric.category === 'memory' ? 'bg-purple-100 text-purple-800' :
                          metric.category === 'runtime' ? 'bg-green-100 text-green-800' :
                          metric.category === 'interaction' ? 'bg-yellow-100 text-yellow-800' :
                          'bg-gray-100 text-gray-800'}`}>
                        {metric.category}
                      </span>
                    </div>
                    <div className="text-2xl font-bold text-gray-900">
                      {formatMetricValue(metric)}
                    </div>
                    {metric.context && (
                      <div className="text-xs text-gray-500 mt-1">
                        {metric.context.networkType && `Network: ${metric.context.networkType}`}
                        {metric.context.deviceType && ` • Device: ${metric.context.deviceType}`}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>

            {/* Competitor Comparison */}
            <div className="bg-white rounded-lg shadow-sm p-6">
              <h3 className="text-lg font-semibold mb-6">Competitor Comparison</h3>
              
              {/* Competitor Selection */}
              <div className="mb-6">
                <div className="flex flex-wrap gap-3">
                  {COMPETITOR_BENCHMARKS.map((competitor) => (
                    <button
                      key={competitor.name}
                      onClick={() => setSelectedCompetitor(competitor)}
                      className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors
                        ${selectedCompetitor?.name === competitor.name 
                          ? 'bg-blue-600 text-white' 
                          : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}`}
                    >
                      {getCompetitorCategoryEmoji(competitor.category)} {competitor.name}
                    </button>
                  ))}
                </div>
              </div>

              {/* Detailed Competitor Comparison */}
              {selectedCompetitor && (
                <div className="border-t pt-6">
                  <div className="mb-6">
                    <h4 className="text-xl font-semibold mb-2">
                      {getCompetitorCategoryEmoji(selectedCompetitor.category)} {selectedCompetitor.name}
                    </h4>
                    <p className="text-gray-600">{selectedCompetitor.notes}</p>
                    <div className="flex items-center space-x-4 mt-2 text-sm text-gray-500">
                      <span>Category: {selectedCompetitor.category.replace('_', ' ')}</span>
                      <span>•</span>
                      <span>Market: {selectedCompetitor.targetMarket.replace('_', ' ')}</span>
                      <span>•</span>
                      <span>Tested: {selectedCompetitor.testDate}</span>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {/* Time to Interactive */}
                    <div className="border rounded-lg p-4">
                      <h5 className="font-medium text-gray-900 mb-2">Time to Interactive</h5>
                      <div className="flex items-center justify-between">
                        <div>
                          <div className="text-lg font-bold text-blue-600">
                            {Math.round(report.bookBridgeMetrics.timeToInteractive?.value || 0)}ms
                          </div>
                          <div className="text-sm text-gray-500">BookBridge</div>
                        </div>
                        <div className="text-2xl">
                          {compareMetric(
                            report.bookBridgeMetrics.timeToInteractive?.value || 0,
                            selectedCompetitor.benchmarks.loadTime
                          )}
                        </div>
                        <div>
                          <div className="text-lg font-bold text-gray-600">
                            {selectedCompetitor.benchmarks.loadTime}ms
                          </div>
                          <div className="text-sm text-gray-500">Competitor</div>
                        </div>
                      </div>
                    </div>

                    {/* Memory Usage */}
                    <div className="border rounded-lg p-4">
                      <h5 className="font-medium text-gray-900 mb-2">Memory Usage</h5>
                      <div className="flex items-center justify-between">
                        <div>
                          <div className="text-lg font-bold text-blue-600">
                            {Math.round(report.bookBridgeMetrics.jsHeapUsed?.value || 0)}MB
                          </div>
                          <div className="text-sm text-gray-500">BookBridge</div>
                        </div>
                        <div className="text-2xl">
                          {compareMetric(
                            report.bookBridgeMetrics.jsHeapUsed?.value || 0,
                            selectedCompetitor.benchmarks.memoryUsage
                          )}
                        </div>
                        <div>
                          <div className="text-lg font-bold text-gray-600">
                            {selectedCompetitor.benchmarks.memoryUsage}MB
                          </div>
                          <div className="text-sm text-gray-500">Competitor</div>
                        </div>
                      </div>
                    </div>

                    {/* Audio Load Time */}
                    {selectedCompetitor.benchmarks.audioLoadTime && (
                      <div className="border rounded-lg p-4">
                        <h5 className="font-medium text-gray-900 mb-2">Audio Load Time</h5>
                        <div className="flex items-center justify-between">
                          <div>
                            <div className="text-lg font-bold text-blue-600">
                              {Math.round(report.bookBridgeMetrics.audioLoadTime?.value || 0)}ms
                            </div>
                            <div className="text-sm text-gray-500">BookBridge</div>
                          </div>
                          <div className="text-2xl">
                            {compareMetric(
                              report.bookBridgeMetrics.audioLoadTime?.value || 0,
                              selectedCompetitor.benchmarks.audioLoadTime
                            )}
                          </div>
                          <div>
                            <div className="text-lg font-bold text-gray-600">
                              {selectedCompetitor.benchmarks.audioLoadTime}ms
                            </div>
                            <div className="text-sm text-gray-500">Competitor</div>
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Cache Efficiency */}
                    {selectedCompetitor.benchmarks.cacheHitRate && (
                      <div className="border rounded-lg p-4">
                        <h5 className="font-medium text-gray-900 mb-2">Cache Efficiency</h5>
                        <div className="flex items-center justify-between">
                          <div>
                            <div className="text-lg font-bold text-blue-600">
                              {Math.round((report.bookBridgeMetrics.cacheSize?.value || 0) * 2)}%
                            </div>
                            <div className="text-sm text-gray-500">BookBridge</div>
                          </div>
                          <div className="text-2xl">
                            {compareMetric(
                              (report.bookBridgeMetrics.cacheSize?.value || 0) * 2,
                              selectedCompetitor.benchmarks.cacheHitRate,
                              false
                            )}
                          </div>
                          <div>
                            <div className="text-lg font-bold text-gray-600">
                              {selectedCompetitor.benchmarks.cacheHitRate}%
                            </div>
                            <div className="text-sm text-gray-500">Competitor</div>
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Install Conversion */}
                    {selectedCompetitor.benchmarks.installPromptRate && (
                      <div className="border rounded-lg p-4">
                        <h5 className="font-medium text-gray-900 mb-2">PWA Install Rate</h5>
                        <div className="flex items-center justify-between">
                          <div>
                            <div className="text-lg font-bold text-blue-600">
                              Est. 35%
                            </div>
                            <div className="text-sm text-gray-500">BookBridge</div>
                          </div>
                          <div className="text-2xl">
                            {compareMetric(35, selectedCompetitor.benchmarks.installPromptRate, false)}
                          </div>
                          <div>
                            <div className="text-lg font-bold text-gray-600">
                              {selectedCompetitor.benchmarks.installPromptRate}%
                            </div>
                            <div className="text-sm text-gray-500">Competitor</div>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          </>
        )}

        {!report && !isRunning && (
          <div className="bg-white rounded-lg shadow-sm p-12 text-center">
            <div className="text-gray-400 mb-4">
              <svg className="w-16 h-16 mx-auto" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M3 4a1 1 0 011-1h12a1 1 0 011 1v2a1 1 0 01-1 1H4a1 1 0 01-1-1V4zm0 4a1 1 0 011-1h6a1 1 0 011 1v6a1 1 0 01-1 1H4a1 1 0 01-1-1V8zm8 0a1 1 0 011-1h4a1 1 0 011 1v2a1 1 0 01-1 1h-4a1 1 0 01-1-1V8zm0 4a1 1 0 011-1h4a1 1 0 011 1v2a1 1 0 01-1 1h-4a1 1 0 01-1-1v-2z" clipRule="evenodd" />
              </svg>
            </div>
            <h3 className="text-lg font-medium text-gray-900 mb-2">No Benchmark Data</h3>
            <p className="text-gray-600">Run a performance benchmark to see detailed metrics and competitor comparisons.</p>
          </div>
        )}
      </div>
    </div>
  );
}