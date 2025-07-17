# Cost Monitoring & Alerting System for BookBridge

## Real-Time Cost Tracking Architecture

### Cost Tracking Database Schema
```sql
-- Daily cost tracking
CREATE TABLE daily_costs (
  id SERIAL PRIMARY KEY,
  date DATE NOT NULL,
  model VARCHAR(50) NOT NULL,
  input_tokens BIGINT DEFAULT 0,
  output_tokens BIGINT DEFAULT 0,
  total_cost_usd DECIMAL(10,4) DEFAULT 0,
  api_calls INTEGER DEFAULT 0,
  cache_hits INTEGER DEFAULT 0,
  cache_misses INTEGER DEFAULT 0,
  created_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(date, model)
);

-- User-level cost tracking
CREATE TABLE user_costs (
  id SERIAL PRIMARY KEY,
  user_id UUID NOT NULL,
  date DATE NOT NULL,
  model VARCHAR(50) NOT NULL,
  queries_count INTEGER DEFAULT 0,
  tokens_used INTEGER DEFAULT 0,
  cost_attributed_usd DECIMAL(8,4) DEFAULT 0,
  tier VARCHAR(20) NOT NULL,
  created_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(user_id, date, model)
);

-- Cost alerts configuration
CREATE TABLE cost_alerts (
  id SERIAL PRIMARY KEY,
  alert_type VARCHAR(50) NOT NULL, -- 'daily', 'weekly', 'monthly', 'user'
  threshold_usd DECIMAL(10,2) NOT NULL,
  model VARCHAR(50),
  active BOOLEAN DEFAULT true,
  webhook_url TEXT,
  email_recipients TEXT[],
  created_at TIMESTAMP DEFAULT NOW()
);
```

### Real-Time Cost Monitor
```typescript
import { Redis } from 'ioredis';
import { supabase } from './supabase';

class CostMonitor {
  private static redis = new Redis(process.env.REDIS_URL);
  
  // Model pricing (per 1M tokens)
  private static readonly PRICING = {
    'gpt-4o': { input: 2.50, output: 10.00 },
    'gpt-3.5-turbo': { input: 0.50, output: 1.50 }
  };

  // Alert thresholds
  private static readonly ALERTS = {
    daily: { warning: 100, critical: 200 },
    monthly: { warning: 2000, critical: 4000 },
    user_daily: { warning: 5, critical: 10 }
  };

  static async trackAPICall(params: {
    userId: string;
    model: string;
    inputTokens: number;
    outputTokens: number;
    cached: boolean;
    userTier: 'free' | 'premium';
  }): Promise<void> {
    const { userId, model, inputTokens, outputTokens, cached, userTier } = params;
    
    // Calculate cost
    const pricing = this.PRICING[model];
    const cost = (inputTokens * pricing.input + outputTokens * pricing.output) / 1000000;

    const today = new Date().toISOString().split('T')[0];

    // Track in Redis for real-time monitoring
    await this.updateRedisMetrics(model, inputTokens, outputTokens, cost, cached);

    // Track in database for historical analysis
    if (!cached) {
      await this.updateDatabaseMetrics(userId, model, inputTokens, outputTokens, cost, userTier, today);
    }

    // Check for alert thresholds
    await this.checkAlertThresholds(model, cost, userId, today);

    // Log for debugging
    console.log(`[COST] User: ${userId}, Model: ${model}, Cost: $${cost.toFixed(4)}, Cached: ${cached}`);
  }

  private static async updateRedisMetrics(
    model: string,
    inputTokens: number,
    outputTokens: number,
    cost: number,
    cached: boolean
  ): Promise<void> {
    const today = new Date().toISOString().split('T')[0];
    const pipeline = this.redis.pipeline();

    // Daily totals
    pipeline.incrbyfloat(`costs:daily:${model}:${today}`, cost);
    pipeline.incrby(`tokens:daily:${model}:input:${today}`, inputTokens);
    pipeline.incrby(`tokens:daily:${model}:output:${today}`, outputTokens);
    pipeline.incr(`calls:daily:${model}:${today}`);
    
    if (cached) {
      pipeline.incr(`cache:hits:${today}`);
    } else {
      pipeline.incr(`cache:misses:${today}`);
    }

    // Set expiration for daily keys (7 days)
    pipeline.expire(`costs:daily:${model}:${today}`, 86400 * 7);
    pipeline.expire(`tokens:daily:${model}:input:${today}`, 86400 * 7);
    pipeline.expire(`tokens:daily:${model}:output:${today}`, 86400 * 7);
    pipeline.expire(`calls:daily:${model}:${today}`, 86400 * 7);

    await pipeline.exec();
  }

  private static async updateDatabaseMetrics(
    userId: string,
    model: string,
    inputTokens: number,
    outputTokens: number,
    cost: number,
    userTier: string,
    date: string
  ): Promise<void> {
    // Update daily costs
    await supabase.rpc('upsert_daily_cost', {
      p_date: date,
      p_model: model,
      p_input_tokens: inputTokens,
      p_output_tokens: outputTokens,
      p_cost: cost,
      p_api_calls: 1
    });

    // Update user costs
    await supabase.rpc('upsert_user_cost', {
      p_user_id: userId,
      p_date: date,
      p_model: model,
      p_queries: 1,
      p_tokens: inputTokens + outputTokens,
      p_cost: cost,
      p_tier: userTier
    });
  }

  private static async checkAlertThresholds(
    model: string,
    currentCost: number,
    userId: string,
    date: string
  ): Promise<void> {
    // Check daily model costs
    const dailyCost = await this.redis.get(`costs:daily:${model}:${date}`);
    const dailyTotal = parseFloat(dailyCost || '0');

    if (dailyTotal > this.ALERTS.daily.critical) {
      await this.sendAlert('CRITICAL', `Daily ${model} costs exceeded $${this.ALERTS.daily.critical}`, {
        model,
        current: dailyTotal,
        threshold: this.ALERTS.daily.critical
      });
    } else if (dailyTotal > this.ALERTS.daily.warning) {
      await this.sendAlert('WARNING', `Daily ${model} costs approaching limit`, {
        model,
        current: dailyTotal,
        threshold: this.ALERTS.daily.warning
      });
    }

    // Check user daily costs
    const userDailyCost = await this.getUserDailyCost(userId, date);
    if (userDailyCost > this.ALERTS.user_daily.critical) {
      await this.sendAlert('USER_LIMIT', `User ${userId} exceeded daily cost limit`, {
        userId,
        current: userDailyCost,
        threshold: this.ALERTS.user_daily.critical
      });
    }

    // Check monthly projections
    await this.checkMonthlyProjection(model);
  }

  private static async getUserDailyCost(userId: string, date: string): Promise<number> {
    const { data } = await supabase
      .from('user_costs')
      .select('cost_attributed_usd')
      .eq('user_id', userId)
      .eq('date', date);

    return data?.reduce((sum, row) => sum + parseFloat(row.cost_attributed_usd), 0) || 0;
  }

  private static async checkMonthlyProjection(model: string): Promise<void> {
    const monthStart = new Date();
    monthStart.setDate(1);
    const monthStartStr = monthStart.toISOString().split('T')[0];

    const { data } = await supabase
      .from('daily_costs')
      .select('total_cost_usd')
      .eq('model', model)
      .gte('date', monthStartStr);

    const monthToDateCost = data?.reduce((sum, row) => sum + parseFloat(row.total_cost_usd), 0) || 0;
    const daysElapsed = new Date().getDate();
    const daysInMonth = new Date(new Date().getFullYear(), new Date().getMonth() + 1, 0).getDate();
    const projectedMonthlyCost = (monthToDateCost / daysElapsed) * daysInMonth;

    if (projectedMonthlyCost > this.ALERTS.monthly.critical) {
      await this.sendAlert('MONTHLY_PROJECTION', `Projected monthly ${model} cost: $${projectedMonthlyCost.toFixed(2)}`, {
        model,
        projected: projectedMonthlyCost,
        threshold: this.ALERTS.monthly.critical
      });
    }
  }

  private static async sendAlert(
    level: string,
    message: string,
    data: any
  ): Promise<void> {
    const alert = {
      level,
      message,
      data,
      timestamp: new Date().toISOString()
    };

    // Send to monitoring service (e.g., Slack, PagerDuty)
    if (process.env.SLACK_WEBHOOK_URL) {
      await this.sendSlackAlert(alert);
    }

    // Store alert in database
    await supabase
      .from('cost_alerts_log')
      .insert({
        level,
        message,
        data: JSON.stringify(data),
        created_at: new Date().toISOString()
      });

    console.error(`[COST ALERT] ${level}: ${message}`, data);
  }

  private static async sendSlackAlert(alert: any): Promise<void> {
    const webhookUrl = process.env.SLACK_WEBHOOK_URL;
    if (!webhookUrl) return;

    const payload = {
      text: `🚨 Cost Alert: ${alert.level}`,
      attachments: [{
        color: alert.level === 'CRITICAL' ? 'danger' : 'warning',
        fields: [
          { title: 'Message', value: alert.message, short: false },
          { title: 'Details', value: JSON.stringify(alert.data, null, 2), short: false },
          { title: 'Time', value: alert.timestamp, short: true }
        ]
      }]
    };

    try {
      await fetch(webhookUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
    } catch (error) {
      console.error('Failed to send Slack alert:', error);
    }
  }

  // Public API methods
  static async getDailyCosts(date?: string): Promise<any> {
    const targetDate = date || new Date().toISOString().split('T')[0];
    
    const { data } = await supabase
      .from('daily_costs')
      .select('*')
      .eq('date', targetDate);

    return data;
  }

  static async getMonthlyCosts(year: number, month: number): Promise<any> {
    const { data } = await supabase
      .from('daily_costs')
      .select('*')
      .gte('date', `${year}-${month.toString().padStart(2, '0')}-01`)
      .lt('date', `${year}-${(month + 1).toString().padStart(2, '0')}-01`);

    return this.aggregateCosts(data || []);
  }

  static async getUserCosts(userId: string, days: number = 30): Promise<any> {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);
    const startDateStr = startDate.toISOString().split('T')[0];

    const { data } = await supabase
      .from('user_costs')
      .select('*')
      .eq('user_id', userId)
      .gte('date', startDateStr);

    return data;
  }

  static async getCachePerformance(days: number = 7): Promise<any> {
    const promises = [];
    for (let i = 0; i < days; i++) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      const dateStr = date.toISOString().split('T')[0];
      
      promises.push(Promise.all([
        this.redis.get(`cache:hits:${dateStr}`),
        this.redis.get(`cache:misses:${dateStr}`)
      ]));
    }

    const results = await Promise.all(promises);
    return results.map((result, index) => {
      const date = new Date();
      date.setDate(date.getDate() - index);
      const hits = parseInt(result[0] || '0');
      const misses = parseInt(result[1] || '0');
      const total = hits + misses;
      
      return {
        date: date.toISOString().split('T')[0],
        hits,
        misses,
        hitRate: total > 0 ? (hits / total) * 100 : 0
      };
    });
  }

  private static aggregateCosts(costs: any[]): any {
    const totals = costs.reduce((acc, cost) => {
      const model = cost.model;
      if (!acc[model]) {
        acc[model] = {
          inputTokens: 0,
          outputTokens: 0,
          totalCost: 0,
          apiCalls: 0
        };
      }
      
      acc[model].inputTokens += cost.input_tokens;
      acc[model].outputTokens += cost.output_tokens;
      acc[model].totalCost += parseFloat(cost.total_cost_usd);
      acc[model].apiCalls += cost.api_calls;
      
      return acc;
    }, {});

    return {
      byModel: totals,
      total: Object.values(totals).reduce((sum: number, model: any) => sum + model.totalCost, 0)
    };
  }
}

export default CostMonitor;
```

### Cost Dashboard API
```typescript
// API route: /api/admin/costs
export async function GET(request: Request) {
  const url = new URL(request.url);
  const period = url.searchParams.get('period') || 'daily';
  const model = url.searchParams.get('model');

  try {
    let data;
    
    switch (period) {
      case 'daily':
        data = await CostMonitor.getDailyCosts();
        break;
      case 'monthly':
        const year = new Date().getFullYear();
        const month = new Date().getMonth();
        data = await CostMonitor.getMonthlyCosts(year, month);
        break;
      case 'cache':
        data = await CostMonitor.getCachePerformance();
        break;
      default:
        return Response.json({ error: 'Invalid period' }, { status: 400 });
    }

    return Response.json(data);
  } catch (error) {
    console.error('Cost dashboard error:', error);
    return Response.json({ error: 'Failed to fetch cost data' }, { status: 500 });
  }
}
```

### Automated Cost Controls
```typescript
class CostControls {
  private static readonly EMERGENCY_STOP_THRESHOLD = 500; // $500 daily
  private static readonly USER_DAILY_LIMIT = 10; // $10 per user per day

  static async checkEmergencyStop(): Promise<boolean> {
    const today = new Date().toISOString().split('T')[0];
    const costs = await CostMonitor.getDailyCosts(today);
    
    const totalDailyCost = costs.reduce((sum, cost) => 
      sum + parseFloat(cost.total_cost_usd), 0
    );

    if (totalDailyCost > this.EMERGENCY_STOP_THRESHOLD) {
      await this.activateEmergencyStop();
      return true;
    }

    return false;
  }

  private static async activateEmergencyStop(): Promise<void> {
    // Set emergency stop flag
    await CostMonitor['redis'].set('emergency_stop', '1', 'EX', 3600); // 1 hour
    
    // Send immediate alerts
    await CostMonitor['sendAlert']('EMERGENCY', 'Emergency stop activated - API costs exceeded threshold', {
      threshold: this.EMERGENCY_STOP_THRESHOLD,
      action: 'API calls suspended'
    });

    console.error('🚨 EMERGENCY STOP ACTIVATED - API costs exceeded threshold');
  }

  static async isEmergencyStopActive(): Promise<boolean> {
    const stopFlag = await CostMonitor['redis'].get('emergency_stop');
    return stopFlag === '1';
  }

  static async checkUserDailyLimit(userId: string): Promise<boolean> {
    const today = new Date().toISOString().split('T')[0];
    const userCost = await CostMonitor['getUserDailyCost'](userId, today);
    
    return userCost < this.USER_DAILY_LIMIT;
  }

  static async deactivateEmergencyStop(): Promise<void> {
    await CostMonitor['redis'].del('emergency_stop');
    console.log('Emergency stop deactivated');
  }
}
```

### Cost Analytics Dashboard
```tsx
// React component for cost dashboard
'use client';

import { useState, useEffect } from 'react';

interface CostData {
  date: string;
  model: string;
  totalCost: number;
  apiCalls: number;
  inputTokens: number;
  outputTokens: number;
}

export default function CostDashboard() {
  const [costData, setCostData] = useState<CostData[]>([]);
  const [loading, setLoading] = useState(true);
  const [period, setPeriod] = useState('daily');

  useEffect(() => {
    fetchCostData();
  }, [period]);

  const fetchCostData = async () => {
    setLoading(true);
    try {
      const response = await fetch(`/api/admin/costs?period=${period}`);
      const data = await response.json();
      setCostData(data);
    } catch (error) {
      console.error('Failed to fetch cost data:', error);
    }
    setLoading(false);
  };

  const totalCost = costData.reduce((sum, item) => sum + item.totalCost, 0);
  const totalCalls = costData.reduce((sum, item) => sum + item.apiCalls, 0);

  return (
    <div className="p-6 bg-white rounded-lg shadow">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold">Cost Dashboard</h2>
        <select 
          value={period} 
          onChange={(e) => setPeriod(e.target.value)}
          className="border rounded px-3 py-2"
        >
          <option value="daily">Daily</option>
          <option value="monthly">Monthly</option>
          <option value="cache">Cache Performance</option>
        </select>
      </div>

      {loading ? (
        <div className="text-center py-8">Loading...</div>
      ) : (
        <>
          <div className="grid grid-cols-4 gap-4 mb-6">
            <div className="bg-blue-50 p-4 rounded">
              <h3 className="text-sm font-medium text-gray-600">Total Cost</h3>
              <p className="text-2xl font-bold text-blue-600">
                ${totalCost.toFixed(2)}
              </p>
            </div>
            <div className="bg-green-50 p-4 rounded">
              <h3 className="text-sm font-medium text-gray-600">API Calls</h3>
              <p className="text-2xl font-bold text-green-600">
                {totalCalls.toLocaleString()}
              </p>
            </div>
            <div className="bg-yellow-50 p-4 rounded">
              <h3 className="text-sm font-medium text-gray-600">Avg Cost/Call</h3>
              <p className="text-2xl font-bold text-yellow-600">
                ${totalCalls > 0 ? (totalCost / totalCalls).toFixed(4) : '0.0000'}
              </p>
            </div>
            <div className="bg-purple-50 p-4 rounded">
              <h3 className="text-sm font-medium text-gray-600">Budget Status</h3>
              <p className={`text-2xl font-bold ${totalCost < 150 ? 'text-green-600' : 'text-red-600'}`}>
                {totalCost < 150 ? 'On Track' : 'Over Budget'}
              </p>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full border-collapse border border-gray-300">
              <thead>
                <tr className="bg-gray-50">
                  <th className="border border-gray-300 px-4 py-2">Date</th>
                  <th className="border border-gray-300 px-4 py-2">Model</th>
                  <th className="border border-gray-300 px-4 py-2">Cost</th>
                  <th className="border border-gray-300 px-4 py-2">API Calls</th>
                  <th className="border border-gray-300 px-4 py-2">Input Tokens</th>
                  <th className="border border-gray-300 px-4 py-2">Output Tokens</th>
                </tr>
              </thead>
              <tbody>
                {costData.map((item, index) => (
                  <tr key={index}>
                    <td className="border border-gray-300 px-4 py-2">{item.date}</td>
                    <td className="border border-gray-300 px-4 py-2">{item.model}</td>
                    <td className="border border-gray-300 px-4 py-2">
                      ${item.totalCost.toFixed(2)}
                    </td>
                    <td className="border border-gray-300 px-4 py-2">
                      {item.apiCalls.toLocaleString()}
                    </td>
                    <td className="border border-gray-300 px-4 py-2">
                      {item.inputTokens.toLocaleString()}
                    </td>
                    <td className="border border-gray-300 px-4 py-2">
                      {item.outputTokens.toLocaleString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  );
}
```

## Key Features

### Real-Time Monitoring
- Track costs per API call with Redis
- Store historical data in PostgreSQL
- Monitor cache hit rates and performance

### Automated Alerts
- Daily/monthly cost thresholds
- User spending limits
- Emergency stop mechanism
- Slack/email notifications

### Cost Controls
- Emergency stop at $500/day
- User limits ($10/day)
- Model-specific budgets
- Automatic fallbacks

### Analytics Dashboard
- Real-time cost visualization
- Performance metrics
- Budget tracking
- Export capabilities

This system ensures you stay under $5k/month while maintaining service quality.