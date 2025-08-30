'use client';

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Activity, 
  AlertCircle, 
  TrendingUp, 
  TrendingDown, 
  Zap, 
  Shield, 
  Clock, 
  Users,
  BarChart3,
  Download,
  RefreshCw,
  Bell,
  CheckCircle
} from 'lucide-react';

interface PerformanceMetrics {
  responseTime: number;
  throughput: number;
  errorRate: number;
  cacheHitRate: number;
  memoryUsage: number;
  firstContentfulPaint: number;
  largestContentfulPaint: number;
  cumulativeLayoutShift: number;
  sessionDuration: number;
  audioLatency: number;
}

interface SystemHealthScore {
  overall: number;
  categories: {
    performance: number;
    reliability: number;
    user_experience: number;
    resource_efficiency: number;
    cache_effectiveness: number;
  };
  grade: 'A+' | 'A' | 'B' | 'C' | 'D' | 'F';
  recommendations: string[];
}

interface PerformanceAlert {
  id: string;
  type: 'performance' | 'error' | 'resource' | 'user_experience';
  severity: 'info' | 'warning' | 'error' | 'critical';
  metric: string;
  currentValue: number;
  threshold: number;
  message: string;
  timestamp: Date;
}

interface DashboardData {
  realTimeMetrics: PerformanceMetrics;
  systemHealth: SystemHealthScore;
  alerts: PerformanceAlert[];
  trends: {
    responseTime: number[];
    errorRate: number[];
    cacheHitRate: number[];
    userSessions: number[];
  };
  insights: {
    topErrors: Array<{ type: string; count: number; trend: 'up' | 'down' | 'stable' }>;
    performanceBottlenecks: Array<{ component: string; impact: number; recommendation: string }>;
    userBehaviorPatterns: Array<{ pattern: string; frequency: number; optimization: string }>;
    resourceOptimizations: Array<{ resource: string; currentUsage: number; recommendation: string }>;
  };
}

export function PerformanceMonitor() {
  const [dashboardData, setDashboardData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [selectedTimeframe, setSelectedTimeframe] = useState<'1h' | '24h' | '7d'>('1h');

  const fetchDashboardData = async () => {
    try {
      const response = await fetch('/api/analytics/metrics?type=dashboard');
      if (!response.ok) throw new Error('Failed to fetch dashboard data');
      const data = await response.json();
      setDashboardData(data);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  };

  const exportReport = async (format: 'json' | 'csv' = 'json') => {
    try {
      const response = await fetch(`/api/analytics/metrics?type=report&period=day&format=${format}`);
      if (!response.ok) throw new Error('Failed to export report');
      
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `performance-report.${format}`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (err) {
      console.error('Export failed:', err);
    }
  };

  const clearAlerts = async () => {
    try {
      await fetch('/api/analytics/metrics', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'clear_alerts' })
      });
      fetchDashboardData();
    } catch (err) {
      console.error('Failed to clear alerts:', err);
    }
  };

  useEffect(() => {
    fetchDashboardData();
    
    if (autoRefresh) {
      const interval = setInterval(fetchDashboardData, 30000); // 30 seconds
      return () => clearInterval(interval);
    }
  }, [autoRefresh]);

  const formatValue = (value: number, unit: string): string => {
    if (unit === 'ms') return `${Math.round(value)}ms`;
    if (unit === '%') return `${Math.round(value * 100)}%`;
    if (unit === 'score') return value.toFixed(3);
    return Math.round(value).toString();
  };

  const getGradeColor = (grade: string) => {
    const colors = {
      'A+': 'text-green-400',
      'A': 'text-green-400',
      'B': 'text-blue-400',
      'C': 'text-yellow-400',
      'D': 'text-orange-400',
      'F': 'text-red-400'
    };
    return colors[grade as keyof typeof colors] || 'text-gray-400';
  };

  const getSeverityColor = (severity: string) => {
    const colors = {
      info: 'bg-blue-500/20 border-blue-500/50 text-blue-400',
      warning: 'bg-yellow-500/20 border-yellow-500/50 text-yellow-400',
      error: 'bg-red-500/20 border-red-500/50 text-red-400',
      critical: 'bg-red-600/30 border-red-600/60 text-red-300'
    };
    return colors[severity as keyof typeof colors] || 'bg-gray-500/20 border-gray-500/50 text-gray-400';
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <RefreshCw className="w-8 h-8 animate-spin text-blue-400" />
        <span className="ml-3 text-white/70">Loading performance data...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6 bg-red-500/20 border border-red-500/50 rounded-lg">
        <div className="flex items-center gap-3">
          <AlertCircle className="w-6 h-6 text-red-400" />
          <div>
            <p className="font-semibold text-red-400">Error loading performance data</p>
            <p className="text-sm text-white/70 mt-1">{error}</p>
            <button
              onClick={fetchDashboardData}
              className="mt-2 px-3 py-1 bg-red-600/20 hover:bg-red-600/30 border border-red-500/30 rounded text-xs transition-all"
            >
              Retry
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (!dashboardData) return null;

  return (
    <div className="space-y-6">
      {/* Header Controls */}
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold text-white flex items-center gap-3">
          <Activity className="w-6 h-6 text-purple-400" />
          Performance Monitor
        </h2>
        
        <div className="flex items-center gap-3">
          <button
            onClick={() => setAutoRefresh(!autoRefresh)}
            className={`px-3 py-1 rounded text-sm border transition-all ${
              autoRefresh 
                ? 'bg-green-600/20 border-green-500/50 text-green-400' 
                : 'bg-gray-600/20 border-gray-500/50 text-gray-400'
            }`}
          >
            {autoRefresh ? 'Auto' : 'Manual'}
          </button>
          
          <button
            onClick={fetchDashboardData}
            className="px-3 py-1 bg-blue-600/20 hover:bg-blue-600/30 border border-blue-500/30 rounded text-sm transition-all"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
          
          <div className="flex gap-1">
            <button
              onClick={() => exportReport('json')}
              className="px-3 py-1 bg-purple-600/20 hover:bg-purple-600/30 border border-purple-500/30 rounded text-sm transition-all flex items-center gap-1"
            >
              <Download className="w-4 h-4" />
              JSON
            </button>
            <button
              onClick={() => exportReport('csv')}
              className="px-3 py-1 bg-purple-600/20 hover:bg-purple-600/30 border border-purple-500/30 rounded text-sm transition-all flex items-center gap-1"
            >
              <Download className="w-4 h-4" />
              CSV
            </button>
          </div>
        </div>
      </div>

      {/* System Health Overview */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="glassmorphism rounded-xl p-6"
        style={{
          background: 'rgba(30, 41, 59, 0.5)',
          backdropFilter: 'blur(10px)',
          border: '1px solid rgba(148, 163, 184, 0.1)'
        }}
      >
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-xl font-semibold text-white flex items-center gap-2">
            <Shield className="w-5 h-5 text-green-400" />
            System Health
          </h3>
          <div className="text-right">
            <div className="text-3xl font-bold text-white">{dashboardData.systemHealth.overall}</div>
            <div className={`text-2xl font-bold ${getGradeColor(dashboardData.systemHealth.grade)}`}>
              Grade {dashboardData.systemHealth.grade}
            </div>
          </div>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          {Object.entries(dashboardData.systemHealth.categories).map(([category, score]) => (
            <div key={category} className="text-center">
              <div className="text-sm text-white/60 mb-1 capitalize">
                {category.replace('_', ' ')}
              </div>
              <div className={`text-xl font-bold ${score >= 80 ? 'text-green-400' : score >= 60 ? 'text-yellow-400' : 'text-red-400'}`}>
                {score}
              </div>
              <div className="w-full bg-gray-700 rounded-full h-1.5 mt-1">
                <div
                  className={`h-1.5 rounded-full transition-all ${
                    score >= 80 ? 'bg-green-400' : score >= 60 ? 'bg-yellow-400' : 'bg-red-400'
                  }`}
                  style={{ width: `${score}%` }}
                />
              </div>
            </div>
          ))}
        </div>

        {dashboardData.systemHealth.recommendations.length > 0 && (
          <div className="mt-4 p-4 bg-blue-500/10 border border-blue-500/30 rounded-lg">
            <h4 className="font-semibold text-blue-400 mb-2">Recommendations</h4>
            <ul className="text-sm text-white/70 space-y-1">
              {dashboardData.systemHealth.recommendations.map((rec, index) => (
                <li key={index} className="flex items-start gap-2">
                  <span className="text-blue-400 mt-1">•</span>
                  {rec}
                </li>
              ))}
            </ul>
          </div>
        )}
      </motion.div>

      {/* Key Metrics Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { 
            label: 'Response Time', 
            value: dashboardData.realTimeMetrics.responseTime, 
            unit: 'ms',
            icon: Clock,
            trend: 'stable',
            threshold: 1000
          },
          { 
            label: 'Error Rate', 
            value: dashboardData.realTimeMetrics.errorRate * 100, 
            unit: '%',
            icon: AlertCircle,
            trend: 'down',
            threshold: 5
          },
          { 
            label: 'Cache Hit Rate', 
            value: dashboardData.realTimeMetrics.cacheHitRate * 100, 
            unit: '%',
            icon: Zap,
            trend: 'up',
            threshold: 80
          },
          { 
            label: 'Memory Usage', 
            value: dashboardData.realTimeMetrics.memoryUsage * 100, 
            unit: '%',
            icon: BarChart3,
            trend: 'stable',
            threshold: 80
          }
        ].map((metric, index) => (
          <motion.div
            key={metric.label}
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: index * 0.1 }}
            className="glassmorphism rounded-xl p-4"
            style={{
              background: 'rgba(30, 41, 59, 0.5)',
              backdropFilter: 'blur(10px)',
              border: '1px solid rgba(148, 163, 184, 0.1)'
            }}
          >
            <div className="flex items-center justify-between mb-2">
              <metric.icon className="w-5 h-5 text-purple-400" />
              {metric.trend === 'up' ? (
                <TrendingUp className="w-4 h-4 text-green-400" />
              ) : metric.trend === 'down' ? (
                <TrendingDown className="w-4 h-4 text-red-400" />
              ) : (
                <div className="w-4 h-4" />
              )}
            </div>
            <div className="text-2xl font-bold text-white mb-1">
              {formatValue(metric.value, metric.unit)}
            </div>
            <div className="text-sm text-white/60">{metric.label}</div>
            <div className={`text-xs mt-1 ${
              (metric.unit === '%' ? metric.value : metric.value) > metric.threshold 
                ? 'text-red-400' 
                : 'text-green-400'
            }`}>
              {(metric.unit === '%' ? metric.value : metric.value) > metric.threshold ? 'Above threshold' : 'Within limits'}
            </div>
          </motion.div>
        ))}
      </div>

      {/* Alerts Section */}
      {dashboardData.alerts.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="glassmorphism rounded-xl p-6"
          style={{
            background: 'rgba(30, 41, 59, 0.5)',
            backdropFilter: 'blur(10px)',
            border: '1px solid rgba(148, 163, 184, 0.1)'
          }}
        >
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-xl font-semibold text-white flex items-center gap-2">
              <Bell className="w-5 h-5 text-yellow-400" />
              Active Alerts ({dashboardData.alerts.length})
            </h3>
            <button
              onClick={clearAlerts}
              className="px-3 py-1 bg-red-600/20 hover:bg-red-600/30 border border-red-500/30 rounded text-sm transition-all"
            >
              Clear All
            </button>
          </div>

          <div className="space-y-3 max-h-96 overflow-y-auto">
            <AnimatePresence>
              {dashboardData.alerts.slice(0, 10).map((alert) => (
                <motion.div
                  key={alert.id}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 20 }}
                  className={`p-4 rounded-lg border ${getSeverityColor(alert.severity)}`}
                >
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-semibold capitalize">{alert.type.replace('_', ' ')}</span>
                    <span className="text-xs">
                      {new Date(alert.timestamp).toLocaleTimeString()}
                    </span>
                  </div>
                  <p className="text-sm text-white/80 mb-2">{alert.message}</p>
                  <div className="text-xs text-white/60">
                    Current: {alert.currentValue} | Threshold: {alert.threshold}
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        </motion.div>
      )}

      {/* Performance Insights */}
      <div className="grid md:grid-cols-2 gap-6">
        {/* Performance Bottlenecks */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="glassmorphism rounded-xl p-6"
          style={{
            background: 'rgba(30, 41, 59, 0.5)',
            backdropFilter: 'blur(10px)',
            border: '1px solid rgba(148, 163, 184, 0.1)'
          }}
        >
          <h3 className="text-lg font-semibold text-white mb-4">Performance Bottlenecks</h3>
          <div className="space-y-3">
            {dashboardData.insights.performanceBottlenecks.length > 0 ? (
              dashboardData.insights.performanceBottlenecks.map((bottleneck, index) => (
                <div key={index} className="p-3 bg-orange-500/10 border border-orange-500/30 rounded-lg">
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-medium text-orange-400">{bottleneck.component}</span>
                    <span className="text-sm text-white/60">{Math.round(bottleneck.impact)}% impact</span>
                  </div>
                  <p className="text-sm text-white/70">{bottleneck.recommendation}</p>
                </div>
              ))
            ) : (
              <div className="flex items-center gap-2 text-green-400">
                <CheckCircle className="w-4 h-4" />
                <span className="text-sm">No performance bottlenecks detected</span>
              </div>
            )}
          </div>
        </motion.div>

        {/* Resource Optimizations */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="glassmorphism rounded-xl p-6"
          style={{
            background: 'rgba(30, 41, 59, 0.5)',
            backdropFilter: 'blur(10px)',
            border: '1px solid rgba(148, 163, 184, 0.1)'
          }}
        >
          <h3 className="text-lg font-semibold text-white mb-4">Resource Optimizations</h3>
          <div className="space-y-3">
            {dashboardData.insights.resourceOptimizations.length > 0 ? (
              dashboardData.insights.resourceOptimizations.map((optimization, index) => (
                <div key={index} className="p-3 bg-blue-500/10 border border-blue-500/30 rounded-lg">
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-medium text-blue-400">{optimization.resource}</span>
                    <span className="text-sm text-white/60">{optimization.currentUsage}% usage</span>
                  </div>
                  <p className="text-sm text-white/70">{optimization.recommendation}</p>
                </div>
              ))
            ) : (
              <div className="flex items-center gap-2 text-green-400">
                <CheckCircle className="w-4 h-4" />
                <span className="text-sm">Resource usage is optimized</span>
              </div>
            )}
          </div>
        </motion.div>
      </div>
    </div>
  );
}