import { QueueManagement } from '@/components/admin/QueueManagement';

export default function QueuePage() {
  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-bold text-white mb-2">Pre-generation Queue</h1>
        <p className="text-slate-400">Monitor and control audio generation jobs</p>
      </header>
      
      <QueueManagement />
    </div>
  );
}