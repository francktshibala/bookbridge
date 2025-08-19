import { DashboardStats } from '@/components/admin/DashboardStats';
import { QuickActions } from '@/components/admin/QuickActions';

export default function AdminDashboard() {
  return (
    <div className="space-y-8">
      {/* Dashboard Header */}
      <header className="border-b border-slate-700 pb-6">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center">
            <div className="flex items-center justify-center w-10 h-10 bg-gradient-to-r from-blue-500 to-purple-600 rounded-xl mr-4">
              <span className="text-xl">🎵</span>
            </div>
            <h1 className="text-2xl font-bold text-white">Progressive Voice Management</h1>
          </div>
          <div className="text-sm text-slate-400">
            Last updated: {new Date().toLocaleTimeString()}
          </div>
        </div>
        <p className="text-slate-400 text-base">
          Monitor and control audio pre-generation across your entire book library
        </p>
      </header>

      {/* Stats Overview */}
      <DashboardStats />

      {/* Quick Actions */}
      <QuickActions />
    </div>
  );
}