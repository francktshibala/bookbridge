'use client';

import Link from 'next/link';

export function QuickActions() {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {/* Queue Management */}
      <Link
        href="/admin/queue"
        className="bg-slate-800 border border-slate-700 rounded-lg p-6 hover:border-blue-500 transition-colors group"
      >
        <div className="flex items-center mb-4">
          <div className="flex items-center justify-center w-8 h-8 bg-blue-500/20 rounded-lg text-blue-400 mr-3">
            ⏳
          </div>
          <h3 className="text-lg font-semibold text-white group-hover:text-blue-400 transition-colors">
            Queue Management
          </h3>
        </div>
        <p className="text-slate-400 text-sm mb-4">
          Monitor active jobs, pause/resume processing, and manage failed tasks
        </p>
        <div className="flex items-center text-blue-400 text-sm">
          View Queue →
        </div>
      </Link>

      {/* Book Management */}
      <Link
        href="/admin/books"
        className="bg-slate-800 border border-slate-700 rounded-lg p-6 hover:border-blue-500 transition-colors group"
      >
        <div className="flex items-center mb-4">
          <div className="flex items-center justify-center w-8 h-8 bg-green-500/20 rounded-lg text-green-400 mr-3">
            📚
          </div>
          <h3 className="text-lg font-semibold text-white group-hover:text-blue-400 transition-colors">
            Book Management
          </h3>
        </div>
        <p className="text-slate-400 text-sm mb-4">
          Trigger pre-generation for specific books and monitor progress
        </p>
        <div className="flex items-center text-blue-400 text-sm">
          Manage Books →
        </div>
      </Link>

      {/* Cost Analytics */}
      <Link
        href="/admin/costs"
        className="bg-slate-800 border border-slate-700 rounded-lg p-6 hover:border-blue-500 transition-colors group"
      >
        <div className="flex items-center mb-4">
          <div className="flex items-center justify-center w-8 h-8 bg-yellow-500/20 rounded-lg text-yellow-400 mr-3">
            💰
          </div>
          <h3 className="text-lg font-semibold text-white group-hover:text-blue-400 transition-colors">
            Cost Analytics
          </h3>
        </div>
        <p className="text-slate-400 text-sm mb-4">
          Track TTS costs, set budgets, and analyze provider efficiency
        </p>
        <div className="flex items-center text-blue-400 text-sm">
          View Costs →
        </div>
      </Link>
    </div>
  );
}