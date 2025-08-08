'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Subscription, UsageTracking, SUBSCRIPTION_LIMITS } from '@/types/subscription';
import { supabase } from '@/lib/supabase/client';
import { User } from '@supabase/supabase-js';

interface UseSubscriptionReturn {
  user: User | null;
  subscription: Subscription | null;
  usage: UsageTracking | null;
  isLoading: boolean;
  remainingAnalyses: number;
  canUseVoiceFeatures: boolean;
  isFreeTier: boolean;
  isPremium: boolean;
  isStudent: boolean;
  refetch: () => Promise<void>;
}

export function useSubscription(): UseSubscriptionReturn {
  const [user, setUser] = useState<User | null>(null);
  const [subscription, setSubscription] = useState<Subscription | null>(null);
  const [usage, setUsage] = useState<UsageTracking | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const router = useRouter();

  const fetchSubscriptionData = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        setUser(null);
        setSubscription(null);
        setUsage(null);
        return;
      }

      setUser(user);

      // Fetch subscription
      const { data: subData, error: subError } = await supabase
        .from('subscriptions')
        .select('*')
        .eq('userId', user.id)
        .single();

      console.log('Subscription query result:', { subData, subError, userId: user.id });

      if (subError) {
        console.warn('Subscription table not accessible, using default free tier');
        // Use default free subscription if table doesn't exist
        setSubscription({
          id: 'temp-' + user.id,
          userId: user.id,
          tier: 'free',
          cancelAtPeriodEnd: false,
          isStudentVerified: false,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        } as any);
      } else if (subData) {
        setSubscription(subData);
      }

      // Fetch usage
      const { data: usageData, error: usageError } = await supabase
        .from('usage_tracking')
        .select('*')
        .eq('userId', user.id)
        .single();

      console.log('Usage query result:', { usageData, usageError, userId: user.id });

      if (usageError) {
        console.warn('Usage tracking table not accessible, using default usage');
        // Use default usage if table doesn't exist
        setUsage({
          id: 'temp-' + user.id,
          userId: user.id,
          bookAnalysesCount: 0,
          lastResetDate: new Date().toISOString(),
          currentMonthStart: new Date().toISOString(),
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        } as any);
      } else if (usageData) {
        setUsage(usageData);
      }
    } catch (error) {
      console.error('Error fetching subscription data:', error);
      // Fallback to guest mode if auth fails
      setUser(null);
      setSubscription(null);
      setUsage(null);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchSubscriptionData();
    // Note: Auth state changes are handled by AuthProvider
    // No need for duplicate auth listeners here
  }, []);

  const tier = subscription?.tier || 'free';
  const limits = SUBSCRIPTION_LIMITS[tier];
  
  let remainingAnalyses = limits.monthlyBookLimit;
  if (tier === 'free' && usage) {
    remainingAnalyses = Math.max(0, limits.monthlyBookLimit - usage.bookAnalysesCount);
  }

  return {
    user,
    subscription,
    usage,
    isLoading,
    remainingAnalyses,
    canUseVoiceFeatures: limits.canUseVoiceFeatures,
    isFreeTier: tier === 'free',
    isPremium: tier === 'premium',
    isStudent: tier === 'student',
    refetch: fetchSubscriptionData,
  };
}