import { AudioManagement } from '@/components/admin/AudioManagement';

export default function AudioManagementPage() {
  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="bg-slate-800 border border-slate-700 rounded-lg p-8">
        <div className="flex items-center">
          <div className="flex items-center justify-center w-12 h-12 bg-gradient-to-r from-green-500 to-blue-600 rounded-xl mr-4">
            <span className="text-2xl">🎵</span>
          </div>
          <div>
            <h1 className="text-2xl font-bold text-white mb-1">Audio Management</h1>
            <p className="text-slate-400">
              Monitor and generate audio files for simplified book content
            </p>
          </div>
        </div>
      </div>

      {/* Audio Management Component */}
      <AudioManagement />
    </div>
  );
}