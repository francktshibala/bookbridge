'use client';

import { useEffect, useState } from 'react';

interface QueueJob {
  id: string;
  bookTitle: string;
  bookAuthor: string;
  cefrLevel?: string;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  progress: number;
  createdAt: string;
  estimatedTime?: string;
}

const mockJobs: QueueJob[] = [
  {
    id: '1',
    bookTitle: 'Pride and Prejudice',
    bookAuthor: 'Jane Austen',
    status: 'processing',
    progress: 65,
    createdAt: '2025-08-20T10:30:00Z',
    estimatedTime: '12 min'
  },
  {
    id: '2',
    bookTitle: 'The Great Gatsby',
    bookAuthor: 'F. Scott Fitzgerald',
    status: 'pending',
    progress: 0,
    createdAt: '2025-08-20T10:25:00Z',
    estimatedTime: '18 min'
  },
  {
    id: '3',
    bookTitle: '1984',
    bookAuthor: 'George Orwell',
    status: 'failed',
    progress: 25,
    createdAt: '2025-08-20T10:15:00Z'
  },
  {
    id: '4',
    bookTitle: 'To Kill a Mockingbird',
    bookAuthor: 'Harper Lee',
    status: 'completed',
    progress: 100,
    createdAt: '2025-08-20T09:45:00Z'
  }
];

interface QueueStats {
  pending: number;
  processing: number;
  completed: number;
  failed: number;
  total: number;
}

export function QueueManagement() {
  const [jobs, setJobs] = useState<QueueJob[]>(mockJobs);
  const [isProcessing, setIsProcessing] = useState(true);
  const [stats, setStats] = useState<QueueStats>({ pending: 200, processing: 0, completed: 0, failed: 0, total: 200 });

  const fetchQueueData = async () => {
    try {
      const res = await fetch('/api/admin/queue');
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data?.jobs)) {
          // Map API jobs to UI model where possible
          const mapped: QueueJob[] = data.jobs.map((j: any) => ({
            id: j.id,
            bookTitle: j.bookTitle || j.bookId,
            bookAuthor: j.bookAuthor || '',
            cefrLevel: j.cefrLevel,
            status: j.status,
            progress: j.progress ?? (j.status === 'completed' ? 100 : j.status === 'processing' ? 50 : 0),
            createdAt: j.createdAt,
            estimatedTime: j.estimatedTime
          }));
          setJobs(mapped);
        }
        if (typeof data?.isProcessing === 'boolean') setIsProcessing(data.isProcessing);
        if (data?.stats) setStats(data.stats);
      }
    } catch (error) {
      console.error('Failed to fetch queue data:', error);
    }
  };

  useEffect(() => {
    // Load initial data
    fetchQueueData();
    
    // Auto-refresh every 5 seconds
    const interval = setInterval(fetchQueueData, 5000);
    
    return () => clearInterval(interval);
  }, []);

  const getStatusBadge = (status: QueueJob['status']) => {
    const styles = {
      pending: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30',
      processing: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
      completed: 'bg-green-500/20 text-green-400 border-green-500/30',
      failed: 'bg-red-500/20 text-red-400 border-red-500/30'
    };

    const icons = {
      pending: '⏳',
      processing: '🔄',
      completed: '✅',
      failed: '❌'
    };

    return (
      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${styles[status]}`}>
        <span className="mr-1">{icons[status]}</span>
        {status.charAt(0).toUpperCase() + status.slice(1)}
      </span>
    );
  };

  const handleAction = async (action: string, jobId?: string) => {
    try {
      const res = await fetch(`/api/admin/queue/${action}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ jobId })
      });
      if (!res.ok) throw new Error('Request failed');
      // Refresh list immediately
      await fetchQueueData();
    } catch (error) {
      console.error(`Failed to ${action} queue:`, error);
    }
  };

  return (
    <div className="space-y-6">
      {/* Queue Controls */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <button 
            onClick={() => handleAction('resume')}
            className="flex items-center px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors"
          >
            <span className="mr-2">▶️</span>
            Resume All
          </button>
          <button 
            onClick={() => handleAction('pause')}
            className="flex items-center px-4 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded-lg font-medium transition-colors"
          >
            <span className="mr-2">⏸️</span>
            Pause Queue
          </button>
          <button 
            onClick={() => handleAction('clear-failed')}
            className="flex items-center px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg font-medium transition-colors"
          >
            <span className="mr-2">🗑️</span>
            Clear Failed
          </button>
        </div>
        
        <div className="flex items-center text-sm text-slate-400">
          <div className="w-2 h-2 bg-green-400 rounded-full mr-2 animate-pulse"></div>
          Queue {isProcessing ? 'Active' : 'Paused'}
        </div>
      </div>

      {/* Queue Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-slate-800 border border-slate-700 rounded-lg p-4">
          <div className="text-2xl font-bold text-white">{stats.pending}</div>
          <div className="text-sm text-slate-400">Pending</div>
        </div>
        <div className="bg-slate-800 border border-slate-700 rounded-lg p-4">
          <div className="text-2xl font-bold text-blue-400">{stats.processing}</div>
          <div className="text-sm text-slate-400">Processing</div>
        </div>
        <div className="bg-slate-800 border border-slate-700 rounded-lg p-4">
          <div className="text-2xl font-bold text-green-400">{stats.completed}</div>
          <div className="text-sm text-slate-400">Completed</div>
        </div>
        <div className="bg-slate-800 border border-slate-700 rounded-lg p-4">
          <div className="text-2xl font-bold text-red-400">{stats.failed}</div>
          <div className="text-sm text-slate-400">Failed</div>
        </div>
      </div>

      {/* Queue Table */}
      <div className="bg-slate-800 border border-slate-700 rounded-lg overflow-hidden">
        <div className="p-4 border-b border-slate-700">
          <h3 className="text-lg font-semibold text-white">Queue Jobs</h3>
        </div>
        
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-slate-700">
                <th className="text-left py-3 px-4 text-sm font-medium text-slate-300">Book</th>
                <th className="text-left py-3 px-4 text-sm font-medium text-slate-300">Level</th>
                <th className="text-left py-3 px-4 text-sm font-medium text-slate-300">Status</th>
                <th className="text-left py-3 px-4 text-sm font-medium text-slate-300">Progress</th>
                <th className="text-left py-3 px-4 text-sm font-medium text-slate-300">Time</th>
                <th className="text-left py-3 px-4 text-sm font-medium text-slate-300">Actions</th>
              </tr>
            </thead>
            <tbody>
              {jobs.map((job) => (
                <tr key={job.id} className="border-b border-slate-700/50 hover:bg-slate-700/30">
                  <td className="py-4 px-4">
                    <div>
                      <div className="text-white font-medium">{job.bookTitle}</div>
                      <div className="text-slate-400 text-sm">by {job.bookAuthor}</div>
                    </div>
                  </td>
                  <td className="py-4 px-4">
                    <span className="text-sm text-slate-300 font-mono">{job.cefrLevel || '-'}</span>
                  </td>
                  <td className="py-4 px-4">
                    {getStatusBadge(job.status)}
                  </td>
                  <td className="py-4 px-4">
                    <div className="flex items-center">
                      <div className="w-24 bg-slate-700 rounded-full h-2 mr-3">
                        <div
                          className="bg-gradient-to-r from-blue-500 to-purple-600 h-2 rounded-full transition-all duration-300"
                          style={{ width: `${job.progress}%` }}
                        ></div>
                      </div>
                      <span className="text-sm text-slate-300">{job.progress}%</span>
                    </div>
                  </td>
                  <td className="py-4 px-4">
                    <div className="text-slate-300 text-sm">
                      {job.estimatedTime || new Date(job.createdAt).toLocaleTimeString()}
                    </div>
                  </td>
                  <td className="py-4 px-4">
                    <div className="flex gap-2">
                      {job.status === 'failed' && (
                        <button className="text-blue-400 hover:text-blue-300 text-sm">
                          Retry
                        </button>
                      )}
                      {job.status === 'processing' && (
                        <button className="text-yellow-400 hover:text-yellow-300 text-sm">
                          Pause
                        </button>
                      )}
                      <button className="text-red-400 hover:text-red-300 text-sm">
                        Cancel
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}