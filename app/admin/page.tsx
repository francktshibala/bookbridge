import { DashboardStats } from '@/components/admin/DashboardStats';
import { QuickActions } from '@/components/admin/QuickActions';

export default function AdminDashboard() {
  return (
    <div className="space-y-8">
      <div className="bg-slate-800 border border-slate-700 rounded-lg p-8">
        <div className="flex items-center">
          <div className="flex items-center justify-center w-12 h-12 bg-gradient-to-r from-blue-500 to-purple-600 rounded-xl mr-4">
            <span className="text-2xl">🎵</span>
          </div>
          <div>
            <h1 className="text-2xl font-bold text-white mb-1">Progressive Voice Management</h1>
            <p className="text-slate-400">Monitor and control audio pre-generation across your entire book library</p>
          </div>
        </div>
      </div>

      <DashboardStats />

      <div className="bg-slate-800 border border-slate-700 rounded-lg p-6">
        <h2 className="text-xl font-bold text-white mb-6 flex items-center">
          <span className="text-2xl mr-3">⚡</span>
          Quick Actions
        </h2>
        <QuickActions />
      </div>
    </div>
  );
}