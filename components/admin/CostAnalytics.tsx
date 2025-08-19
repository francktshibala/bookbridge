'use client';

export function CostAnalytics() {
  return (
    <div className="space-y-6">
      {/* Cost Controls */}
      <div className="flex items-center gap-4">
        <button className="px-4 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded-lg font-medium transition-colors">
          📊 Export Report
        </button>
        <button className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors">
          ⚙️ Set Budget
        </button>
      </div>

      {/* Cost Overview */}
      <div className="bg-slate-800 border border-slate-700 rounded-lg p-6">
        <p className="text-slate-300">Cost analytics dashboard coming in Step 6...</p>
      </div>
    </div>
  );
}