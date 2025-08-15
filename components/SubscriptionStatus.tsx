'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { useSubscription } from '@/hooks/useSubscription';
import { Sparkles, BookOpen, Zap } from 'lucide-react';

export function SubscriptionStatus() {
  const { 
    remainingAnalyses, 
    isPremium, 
    isStudent, 
    isLoading 
  } = useSubscription();

  if (isLoading) {
    return (
      <div className="flex items-center space-x-2 text-sm text-gray-400">
        <BookOpen className="w-4 h-4 animate-pulse" />
        <span className="font-medium">Loading...</span>
      </div>
    );
  }

  const getStatusColor = () => {
    if (isPremium || isStudent) return 'text-purple-400';
    if (remainingAnalyses === 0) return 'text-red-400';
    if (remainingAnalyses <= 1) return 'text-yellow-400';
    return 'text-green-400';
  };

  const getStatusIcon = () => {
    if (isPremium || isStudent) return <Sparkles className="w-4 h-4" />;
    if (remainingAnalyses === 0) return <Zap className="w-4 h-4" />;
    return <BookOpen className="w-4 h-4" />;
  };

  const getStatusText = () => {
    if (isPremium) return 'Premium';
    if (isStudent) return 'Student';
    if (remainingAnalyses === 0) return 'Limit Reached';
    return `${remainingAnalyses} book${remainingAnalyses === 1 ? '' : 's'} left`;
  };

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      className={`flex items-center space-x-2 text-sm ${getStatusColor()}`}
    >
      {getStatusIcon()}
      <span className="font-medium">{getStatusText()}</span>
    </motion.div>
  );
}