import { CostAnalytics } from '@/components/admin/CostAnalytics';

export default function CostsPage() {
  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-bold text-white mb-2">Cost Analytics</h1>
        <p className="text-slate-400">Track spending and optimize costs</p>
      </header>
      
      <CostAnalytics />
    </div>
  );
}