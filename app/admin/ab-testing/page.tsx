'use client';

import React, { useState, useEffect } from 'react';
import { ABTestManager, INSTALL_PROMPT_VARIANTS, ABTestResult } from '@/lib/ab-testing';

export default function ABTestingDashboard() {
  const [results, setResults] = useState<ABTestResult[]>([]);
  const [conversionRates, setConversionRates] = useState<Record<string, { shown: number; accepted: number; rate: number }>>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Load A/B test results from localStorage
    const loadResults = () => {
      try {
        const stored = localStorage.getItem('ab_test_results');
        const parsedResults = stored ? JSON.parse(stored) : [];
        setResults(parsedResults);
        
        // Calculate conversion rates
        const stats: Record<string, { shown: number; accepted: number; rate: number }> = {};
        
        for (const variant of INSTALL_PROMPT_VARIANTS) {
          const variantResults = parsedResults.filter((r: ABTestResult) => r.variantId === variant.id);
          const shown = variantResults.filter((r: ABTestResult) => r.action === 'shown').length;
          const accepted = variantResults.filter((r: ABTestResult) => r.action === 'accepted').length;
          
          stats[variant.id] = {
            shown,
            accepted,
            rate: shown > 0 ? (accepted / shown) * 100 : 0
          };
        }
        
        setConversionRates(stats);
        setLoading(false);
      } catch (error) {
        console.error('Error loading A/B test results:', error);
        setLoading(false);
      }
    };
    
    loadResults();
    
    // Refresh every 30 seconds
    const interval = setInterval(loadResults, 30000);
    return () => clearInterval(interval);
  }, []);

  const downloadReport = () => {
    // Generate temporary manager to export results
    const tempManager = ABTestManager.getInstance('temp');
    const report = tempManager.exportResults();
    
    const blob = new Blob([report], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `install-prompt-ab-test-${new Date().toISOString().split('T')[0]}.md`;
    a.click();
  };

  const clearResults = () => {
    if (confirm('Are you sure you want to clear all A/B test results? This cannot be undone.')) {
      localStorage.removeItem('ab_test_results');
      setResults([]);
      setConversionRates({});
    }
  };

  const getBestPerformingVariant = () => {
    let best = { id: '', rate: 0 };
    for (const [id, stats] of Object.entries(conversionRates)) {
      if (stats.shown >= 10 && stats.rate > best.rate) { // At least 10 impressions for statistical significance
        best = { id, rate: stats.rate };
      }
    }
    return best.id;
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 p-8">
        <div className="max-w-6xl mx-auto">
          <div className="flex items-center justify-center h-64">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-6xl mx-auto">
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Install Prompt A/B Testing</h1>
          <div className="flex gap-4">
            <button
              onClick={downloadReport}
              className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700"
            >
              Download Report
            </button>
            <button
              onClick={clearResults}
              className="bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700"
            >
              Clear Results
            </button>
          </div>
        </div>

        {/* Summary Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="text-sm font-medium text-gray-500 mb-2">Total Events</h3>
            <div className="text-2xl font-bold text-gray-900">{results.length}</div>
          </div>
          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="text-sm font-medium text-gray-500 mb-2">Prompts Shown</h3>
            <div className="text-2xl font-bold text-gray-900">
              {results.filter(r => r.action === 'shown').length}
            </div>
          </div>
          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="text-sm font-medium text-gray-500 mb-2">Installs</h3>
            <div className="text-2xl font-bold text-green-600">
              {results.filter(r => r.action === 'accepted').length}
            </div>
          </div>
          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="text-sm font-medium text-gray-500 mb-2">Best Variant</h3>
            <div className="text-lg font-bold text-purple-600">
              {getBestPerformingVariant() || 'N/A'}
            </div>
          </div>
        </div>

        {/* Variant Performance */}
        <div className="bg-white rounded-lg shadow mb-8">
          <div className="p-6 border-b border-gray-200">
            <h2 className="text-xl font-semibold text-gray-900">Variant Performance</h2>
          </div>
          <div className="p-6">
            <div className="space-y-6">
              {INSTALL_PROMPT_VARIANTS.map((variant) => {
                const stats = conversionRates[variant.id] || { shown: 0, accepted: 0, rate: 0 };
                const isStatisticallySignificant = stats.shown >= 10;
                const isBestPerforming = variant.id === getBestPerformingVariant();
                
                return (
                  <div 
                    key={variant.id} 
                    className={`border rounded-lg p-4 ${
                      isBestPerforming ? 'border-green-500 bg-green-50' : 'border-gray-200'
                    }`}
                  >
                    <div className="flex justify-between items-start mb-3">
                      <div>
                        <h3 className="font-semibold text-lg flex items-center gap-2">
                          {variant.name}
                          {isBestPerforming && (
                            <span className="bg-green-500 text-white text-xs px-2 py-1 rounded">
                              BEST
                            </span>
                          )}
                          {!isStatisticallySignificant && stats.shown > 0 && (
                            <span className="bg-yellow-500 text-white text-xs px-2 py-1 rounded">
                              LOW SAMPLE
                            </span>
                          )}
                        </h3>
                        <p className="text-sm text-gray-600 mt-1">
                          <strong>Copy:</strong> "{variant.config.copy.title}" | 
                          <strong> Timing:</strong> {variant.config.timing} | 
                          <strong> Style:</strong> {variant.config.style}
                        </p>
                      </div>
                      <div className="text-right">
                        <div className="text-2xl font-bold text-gray-900">
                          {stats.rate.toFixed(1)}%
                        </div>
                        <div className="text-sm text-gray-500">
                          {stats.accepted}/{stats.shown} conversions
                        </div>
                      </div>
                    </div>
                    
                    {/* Progress bar */}
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div 
                        className={`h-2 rounded-full ${
                          isBestPerforming ? 'bg-green-500' : 'bg-blue-500'
                        }`}
                        style={{ width: `${Math.min(stats.rate, 100)}%` }}
                      ></div>
                    </div>
                    
                    <div className="mt-2 text-xs text-gray-500">
                      Weight: {variant.weight}% | Sample size: {stats.shown} impressions
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Recent Events */}
        <div className="bg-white rounded-lg shadow">
          <div className="p-6 border-b border-gray-200">
            <h2 className="text-xl font-semibold text-gray-900">Recent Events</h2>
          </div>
          <div className="p-6">
            {results.length === 0 ? (
              <p className="text-gray-500 text-center py-8">
                No A/B test events recorded yet. Install prompts will appear based on user engagement.
              </p>
            ) : (
              <div className="space-y-3">
                {results
                  .sort((a, b) => b.timestamp - a.timestamp)
                  .slice(0, 20) // Show last 20 events
                  .map((result, index) => {
                    const variant = INSTALL_PROMPT_VARIANTS.find(v => v.id === result.variantId);
                    return (
                      <div key={index} className="flex items-center justify-between py-2 border-b border-gray-100 last:border-b-0">
                        <div className="flex items-center gap-4">
                          <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                            result.action === 'accepted' ? 'bg-green-100 text-green-800' :
                            result.action === 'dismissed' ? 'bg-red-100 text-red-800' :
                            result.action === 'shown' ? 'bg-blue-100 text-blue-800' :
                            'bg-gray-100 text-gray-800'
                          }`}>
                            {result.action.toUpperCase()}
                          </span>
                          <div>
                            <div className="font-medium">{variant?.name || result.variantId}</div>
                            <div className="text-sm text-gray-500">
                              {result.context.page} | Sessions: {result.engagement.sessionCount} | 
                              Chapters: {result.engagement.chaptersCompleted}
                            </div>
                          </div>
                        </div>
                        <div className="text-sm text-gray-500">
                          {new Date(result.timestamp).toLocaleString()}
                        </div>
                      </div>
                    );
                  })}
              </div>
            )}
          </div>
        </div>

        {/* Testing Tips */}
        <div className="mt-8 bg-blue-50 rounded-lg p-6">
          <h3 className="font-semibold text-blue-900 mb-3">A/B Testing Tips</h3>
          <ul className="list-disc list-inside space-y-2 text-blue-800">
            <li>Each user is randomly assigned to one variant and will always see the same version</li>
            <li>Statistical significance requires at least 10 impressions per variant</li>
            <li>Test for at least 1-2 weeks to account for different user behaviors</li>
            <li>Monitor not just conversion rate but also user engagement patterns</li>
            <li>Consider seasonal effects and marketing campaigns when analyzing results</li>
          </ul>
        </div>
      </div>
    </div>
  );
}