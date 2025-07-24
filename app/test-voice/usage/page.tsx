'use client';

import { useEffect, useState } from 'react';
import { voiceUsageTracker } from '@/lib/voice-usage-tracker';
import { motion } from 'framer-motion';

export default function VoiceUsagePage() {
  const [stats, setStats] = useState<any>(null);
  const [monthlyUsage, setMonthlyUsage] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadStats() {
      try {
        const generalStats = await voiceUsageTracker.getUsageStats();
        const monthly = await voiceUsageTracker.getMonthlyUsage();
        setStats(generalStats);
        setMonthlyUsage(monthly);
      } catch (error) {
        console.error('Failed to load stats:', error);
      } finally {
        setLoading(false);
      }
    }

    loadStats();
    
    // Refresh every 5 seconds
    const interval = setInterval(loadStats, 5000);
    return () => clearInterval(interval);
  }, []);

  if (loading) {
    return (
      <div className="container mx-auto p-8">
        <p>Loading usage stats...</p>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-8 max-w-4xl">
      <h1 className="text-3xl font-bold mb-8">Voice Usage Dashboard</h1>
      
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white rounded-lg shadow-lg p-6"
        >
          <h2 className="text-lg font-semibold text-gray-600 mb-2">Total Characters</h2>
          <p className="text-3xl font-bold text-purple-600">
            {stats?.total_characters?.toLocaleString() || 0}
          </p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="bg-white rounded-lg shadow-lg p-6"
        >
          <h2 className="text-lg font-semibold text-gray-600 mb-2">Premium Usage</h2>
          <p className="text-3xl font-bold text-green-600">
            {stats?.premium_usage_percentage?.toFixed(1) || 0}%
          </p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="bg-white rounded-lg shadow-lg p-6"
        >
          <h2 className="text-lg font-semibold text-gray-600 mb-2">Estimated Cost</h2>
          <p className="text-3xl font-bold text-blue-600">
            ${monthlyUsage?.estimated_cost?.toFixed(2) || '0.00'}
          </p>
        </motion.div>
      </div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
        className="bg-white rounded-lg shadow-lg p-6"
      >
        <h2 className="text-xl font-semibold mb-4">Usage by Provider</h2>
        <div className="space-y-3">
          <div className="flex justify-between items-center">
            <span className="font-medium">Web Speech (Free)</span>
            <span className="text-gray-600">
              {stats?.by_provider?.['web-speech']?.toLocaleString() || 0} characters
            </span>
          </div>
          <div className="flex justify-between items-center">
            <span className="font-medium">ElevenLabs (Premium)</span>
            <span className="text-gray-600">
              {stats?.by_provider?.['elevenlabs']?.toLocaleString() || 0} characters
            </span>
          </div>
          <div className="flex justify-between items-center">
            <span className="font-medium">OpenAI TTS</span>
            <span className="text-gray-600">
              {stats?.by_provider?.['openai']?.toLocaleString() || 0} characters
            </span>
          </div>
        </div>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4 }}
        className="mt-6 p-4 bg-purple-50 rounded-lg"
      >
        <p className="text-sm text-purple-700">
          <strong>Note:</strong> Usage tracking helps monitor API costs. 
          ElevenLabs: ~1000 chars/credit. OpenAI: $15/1M chars.
        </p>
      </motion.div>
    </div>
  );
}