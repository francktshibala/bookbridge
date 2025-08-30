/**
 * Real-Time Monitoring Admin Page
 * Admin interface for real-time performance monitoring
 */

import RealTimeMonitoringDashboard from '@/components/RealTimeMonitoringDashboard';

export default function MonitoringAdminPage() {
  return (
    <div className="min-h-screen bg-slate-900 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Page Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-white mb-2">
            BookBridge PWA - Real-Time Monitoring
          </h1>
          <p className="text-gray-400">
            Live performance monitoring for production deployment with emerging markets focus
          </p>
        </div>

        {/* Quick Navigation */}
        <div className="mb-6 flex flex-wrap gap-3">
          <a 
            href="/api/deployment/health" 
            target="_blank"
            className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded text-sm font-medium transition-colors"
          >
            System Health API
          </a>
          <a 
            href="/api/monitoring/metrics" 
            target="_blank"
            className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded text-sm font-medium transition-colors"
          >
            Metrics API
          </a>
          <a 
            href="/api/errors" 
            target="_blank"
            className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded text-sm font-medium transition-colors"
          >
            Error Reporting API
          </a>
          <a 
            href="/admin/performance-benchmarking" 
            className="bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded text-sm font-medium transition-colors"
          >
            Performance Benchmarks
          </a>
        </div>

        {/* Real-Time Dashboard */}
        <RealTimeMonitoringDashboard />

        {/* Additional Information */}
        <div className="mt-12 grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="bg-gray-800/50 border border-gray-600 rounded-lg p-6">
            <h3 className="text-lg font-semibold text-white mb-4">Monitoring Features</h3>
            <ul className="space-y-2 text-sm text-gray-300">
              <li className="flex items-center space-x-2">
                <span className="w-2 h-2 bg-green-400 rounded-full"></span>
                <span>Real-time performance metrics collection</span>
              </li>
              <li className="flex items-center space-x-2">
                <span className="w-2 h-2 bg-green-400 rounded-full"></span>
                <span>WebSocket-based live updates</span>
              </li>
              <li className="flex items-center space-x-2">
                <span className="w-2 h-2 bg-green-400 rounded-full"></span>
                <span>Critical alert notifications</span>
              </li>
              <li className="flex items-center space-x-2">
                <span className="w-2 h-2 bg-green-400 rounded-full"></span>
                <span>Emerging markets tracking</span>
              </li>
              <li className="flex items-center space-x-2">
                <span className="w-2 h-2 bg-green-400 rounded-full"></span>
                <span>Device and network analytics</span>
              </li>
              <li className="flex items-center space-x-2">
                <span className="w-2 h-2 bg-green-400 rounded-full"></span>
                <span>System health scoring</span>
              </li>
            </ul>
          </div>

          <div className="bg-gray-800/50 border border-gray-600 rounded-lg p-6">
            <h3 className="text-lg font-semibold text-white mb-4">Alert Thresholds</h3>
            <div className="space-y-3 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-400">Response Time</span>
                <div className="text-right">
                  <div className="text-yellow-400">Warning: &gt;1000ms</div>
                  <div className="text-red-400">Critical: &gt;5000ms</div>
                </div>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400">Error Rate</span>
                <div className="text-right">
                  <div className="text-yellow-400">Warning: &gt;5%</div>
                  <div className="text-red-400">Critical: &gt;25%</div>
                </div>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400">Memory Usage</span>
                <div className="text-right">
                  <div className="text-yellow-400">Warning: &gt;80%</div>
                  <div className="text-red-400">Critical: &gt;95%</div>
                </div>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400">Cache Hit Rate</span>
                <div className="text-right">
                  <div className="text-yellow-400">Warning: &lt;70%</div>
                  <div className="text-red-400">Critical: &lt;50%</div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Target Markets Information */}
        <div className="mt-6 bg-gray-800/50 border border-gray-600 rounded-lg p-6">
          <h3 className="text-lg font-semibold text-white mb-4">Emerging Markets Focus</h3>
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4 text-sm">
            <div className="text-center">
              <div className="text-gray-400">Kenya (KE)</div>
              <div className="text-white font-medium">Primary</div>
            </div>
            <div className="text-center">
              <div className="text-gray-400">Nigeria (NG)</div>
              <div className="text-white font-medium">High Growth</div>
            </div>
            <div className="text-center">
              <div className="text-gray-400">India (IN)</div>
              <div className="text-white font-medium">Large Base</div>
            </div>
            <div className="text-center">
              <div className="text-gray-400">Indonesia (ID)</div>
              <div className="text-white font-medium">Mobile-First</div>
            </div>
            <div className="text-center">
              <div className="text-gray-400">Mexico (MX)</div>
              <div className="text-white font-medium">Localization</div>
            </div>
          </div>
          <div className="mt-4 grid grid-cols-2 md:grid-cols-5 gap-4 text-sm">
            <div className="text-center">
              <div className="text-gray-400">Colombia (CO)</div>
              <div className="text-white font-medium">LatAm</div>
            </div>
            <div className="text-center">
              <div className="text-gray-400">Egypt (EG)</div>
              <div className="text-white font-medium">MENA Entry</div>
            </div>
            <div className="text-center">
              <div className="text-gray-400">Philippines (PH)</div>
              <div className="text-white font-medium">English</div>
            </div>
            <div className="text-center">
              <div className="text-gray-400">Bangladesh (BD)</div>
              <div className="text-white font-medium">Cost-Conscious</div>
            </div>
            <div className="text-center">
              <div className="text-gray-400">Vietnam (VN)</div>
              <div className="text-white font-medium">Growing</div>
            </div>
          </div>
        </div>

        {/* Business Goals */}
        <div className="mt-6 bg-gray-800/50 border border-gray-600 rounded-lg p-6">
          <h3 className="text-lg font-semibold text-white mb-4">Performance Goals</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-sm">
            <div>
              <h4 className="text-white font-medium mb-2">User Targets</h4>
              <ul className="space-y-1 text-gray-300">
                <li>• 10K monthly active users</li>
                <li>• 40%+ PWA install rate</li>
                <li>• 70% week 1 retention</li>
                <li>• 30% offline usage</li>
              </ul>
            </div>
            <div>
              <h4 className="text-white font-medium mb-2">Technical Targets</h4>
              <ul className="space-y-1 text-gray-300">
                <li>• &lt;2.5s page load time (LCP)</li>
                <li>• &lt;3.5s time to interactive</li>
                <li>• &gt;95% offline success rate</li>
                <li>• &lt;2s audio loading</li>
              </ul>
            </div>
            <div>
              <h4 className="text-white font-medium mb-2">Business Targets</h4>
              <ul className="space-y-1 text-gray-300">
                <li>• $150K monthly revenue</li>
                <li>• &lt;0.1% error rate</li>
                <li>• 40% month 1 retention</li>
                <li>• 2x industry conversion</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}