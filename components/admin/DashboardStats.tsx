'use client';

import { useEffect, useState } from 'react';

interface StatsData {
  audioAssets: { total: number; trend: string; progress: number };
  queueJobs: { total: number; trend: string; progress: number };
  monthlyCosts: { total: number; trend: string; progress: number };
  avgLoadTime: { total: number; trend: string; progress: number };
  completionRate: number;
}

export function DashboardStats() {
  const [stats, setStats] = useState<StatsData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchStats();
  }, []);

  const fetchStats = async () => {
    try {
      const response = await fetch('/api/admin/stats');
      const data = await response.json();
      setStats(data);
    } catch (error) {
      console.error('Failed to fetch stats:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {Array.from({ length: 4 }).map((_, index) => (
          <div
            key={index}
            className="bg-slate-800 border border-slate-700 rounded-lg p-6 animate-pulse"
          >
            <div className="h-20 bg-slate-700 rounded"></div>
          </div>
        ))}
      </div>
    );
  }

  if (!stats) {
    return (
      <div className="text-center text-slate-400 py-8">
        Failed to load dashboard stats
      </div>
    );
  }

  const statCards = [
    {
      icon: '📈',
      value: stats.audioAssets.total.toLocaleString(),
      label: 'Total Audio Assets',
      progress: stats.audioAssets.progress,
      trend: stats.audioAssets.trend,
    },
    {
      icon: '⏱️',
      value: stats.queueJobs.total.toLocaleString(),
      label: 'Jobs in Queue',
      progress: stats.queueJobs.progress,
      trend: stats.queueJobs.trend,
    },
    {
      icon: '💸',
      value: `$${stats.monthlyCosts.total.toFixed(2)}`,
      label: 'Monthly TTS Costs',
      progress: stats.monthlyCosts.progress,
      trend: stats.monthlyCosts.trend,
    },
    {
      icon: '📱',
      value: `${stats.avgLoadTime.total}s`,
      label: 'Avg Load Time',
      progress: stats.avgLoadTime.progress,
      trend: stats.avgLoadTime.trend,
    },
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
      {statCards.map((stat, index) => (
        <div
          key={index}
          className="bg-slate-800 border border-slate-700 rounded-lg p-6 hover:border-blue-500 transition-colors"
        >
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center justify-center w-9 h-9 bg-blue-500/20 rounded-lg text-blue-400">
              {stat.icon}
            </div>
            <div className="text-xs font-medium text-green-400 bg-green-400/10 px-2 py-1 rounded">
              {stat.trend}
            </div>
          </div>
          
          <div className="text-2xl font-bold text-white mb-1">{stat.value}</div>
          <div className="text-sm text-slate-400 mb-3">{stat.label}</div>
          
          <div className="w-full bg-slate-700 rounded-full h-1.5">
            <div
              className="bg-gradient-to-r from-blue-500 to-purple-600 h-1.5 rounded-full transition-all duration-300"
              style={{ width: `${stat.progress}%` }}
            ></div>
          </div>
        </div>
      ))}
    </div>
  );
}