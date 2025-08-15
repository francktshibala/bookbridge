'use client';

import { useState } from 'react';
import { useSubscription } from '@/hooks/useSubscription';
import { motion } from 'framer-motion';
import { 
  CreditCard, 
  Calendar, 
  Settings, 
  AlertTriangle, 
  CheckCircle,
  Sparkles,
  GraduationCap,
  BookOpen
} from 'lucide-react';
import Link from 'next/link';

export default function ManageSubscriptionPage() {
  const [loading, setLoading] = useState<string | null>(null);
  const { 
    user, 
    subscription, 
    usage, 
    remainingAnalyses,
    isPremium, 
    isStudent, 
    isFreeTier,
    isLoading 
  } = useSubscription();

  const handleBillingPortal = async () => {
    setLoading('portal');
    
    try {
      const response = await fetch('/api/subscription/manage', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ action: 'portal' }),
      });

      const { url } = await response.json();
      
      if (url) {
        window.location.href = url;
      }
    } catch (error) {
      console.error('Failed to open billing portal:', error);
      alert('Failed to open billing portal. Please try again.');
    } finally {
      setLoading(null);
    }
  };

  const handleCancelSubscription = async () => {
    if (!confirm('Are you sure you want to cancel your subscription? You will lose access to premium features at the end of your current billing period.')) {
      return;
    }

    setLoading('cancel');
    
    try {
      const response = await fetch('/api/subscription/manage', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ action: 'cancel' }),
      });

      const result = await response.json();
      
      if (response.ok) {
        alert(result.message);
        window.location.reload();
      } else {
        alert(result.error || 'Failed to cancel subscription');
      }
    } catch (error) {
      console.error('Failed to cancel subscription:', error);
      alert('Failed to cancel subscription. Please try again.');
    } finally {
      setLoading(null);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-500 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading subscription details...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center max-w-md mx-auto px-4">
          <AlertTriangle className="w-16 h-16 text-yellow-500 mx-auto mb-4" />
          <h1 className="text-2xl font-bold text-gray-900 mb-4">Access Required</h1>
          <p className="text-gray-600 mb-6">Please log in to manage your subscription.</p>
          <Link
            href="/auth/login"
            className="inline-flex items-center px-6 py-3 border border-transparent text-base font-medium rounded-lg shadow-sm text-white bg-purple-600 hover:bg-purple-700"
          >
            Log In
          </Link>
        </div>
      </div>
    );
  }

  const getSubscriptionIcon = () => {
    if (isPremium) return <Sparkles className="w-8 h-8 text-purple-500" />;
    if (isStudent) return <GraduationCap className="w-8 h-8 text-blue-500" />;
    return <BookOpen className="w-8 h-8 text-gray-500" />;
  };

  const getSubscriptionColor = () => {
    if (isPremium) return 'purple';
    if (isStudent) return 'blue';
    return 'gray';
  };

  const color = getSubscriptionColor();

  return (
    <div className="min-h-screen bg-gray-50 py-12">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-12"
        >
          <h1 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
            Manage Your Subscription
          </h1>
          <p className="text-lg text-gray-600">
            View and manage your BookBridge subscription details
          </p>
        </motion.div>

        <div className="space-y-8">
          {/* Current Plan */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white rounded-2xl shadow-lg p-8"
          >
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center">
                {getSubscriptionIcon()}
                <div className="ml-4">
                  <h2 className="text-2xl font-bold text-gray-900">
                    {isPremium ? 'Premium Plan' : isStudent ? 'Student Plan' : 'Free Plan'}
                  </h2>
                  <p className="text-gray-600">
                    {isPremium ? '$4/month' : isStudent ? '$2/month' : 'No cost'}
                  </p>
                </div>
              </div>
              
              {(isPremium || isStudent) && (
                <div className={`px-4 py-2 rounded-full text-sm font-medium bg-${color}-100 text-${color}-800`}>
                  Active
                </div>
              )}
            </div>

            <div className="grid md:grid-cols-2 gap-6">
              <div className="space-y-4">
                <div>
                  <h3 className="font-semibold text-gray-900 mb-2">Usage This Month</h3>
                  <div className="bg-gray-50 rounded-lg p-4">
                    <div className="flex justify-between items-center">
                      <span className="text-gray-600">Books Analyzed</span>
                      <span className="font-semibold">
                        {usage?.bookAnalysesCount || 0}
                        {isFreeTier && ' / 3'}
                      </span>
                    </div>
                    {isFreeTier && (
                      <div className="mt-2">
                        <div className="w-full bg-gray-200 rounded-full h-2">
                          <div 
                            className="bg-purple-500 h-2 rounded-full transition-all"
                            style={{ 
                              width: `${Math.min(((usage?.bookAnalysesCount || 0) / 3) * 100, 100)}%` 
                            }}
                          />
                        </div>
                        <p className="text-sm text-gray-500 mt-1">
                          {remainingAnalyses} books remaining
                        </p>
                      </div>
                    )}
                  </div>
                </div>

                <div>
                  <h3 className="font-semibold text-gray-900 mb-2">Plan Features</h3>
                  <ul className="space-y-2 text-sm text-gray-600">
                    {isFreeTier ? (
                      <>
                        <li className="flex items-center">
                          <CheckCircle className="w-4 h-4 text-green-500 mr-2" />
                          3 book analyses per month
                        </li>
                        <li className="flex items-center">
                          <CheckCircle className="w-4 h-4 text-green-500 mr-2" />
                          Unlimited public domain books
                        </li>
                      </>
                    ) : (
                      <>
                        <li className="flex items-center">
                          <CheckCircle className="w-4 h-4 text-green-500 mr-2" />
                          Unlimited book analysis
                        </li>
                        <li className="flex items-center">
                          <CheckCircle className="w-4 h-4 text-green-500 mr-2" />
                          Voice features & audio generation
                        </li>
                        <li className="flex items-center">
                          <CheckCircle className="w-4 h-4 text-green-500 mr-2" />
                          Export notes and highlights
                        </li>
                        {isPremium && (
                          <li className="flex items-center">
                            <CheckCircle className="w-4 h-4 text-green-500 mr-2" />
                            Priority customer support
                          </li>
                        )}
                      </>
                    )}
                  </ul>
                </div>
              </div>

              <div className="space-y-4">
                {subscription?.currentPeriodEnd && (
                  <div>
                    <h3 className="font-semibold text-gray-900 mb-2">Billing</h3>
                    <div className="bg-gray-50 rounded-lg p-4">
                      <div className="flex items-center justify-between">
                        <span className="text-gray-600">Next billing date</span>
                        <span className="font-semibold">
                          {new Date(subscription.currentPeriodEnd).toLocaleDateString()}
                        </span>
                      </div>
                      {subscription.cancelAtPeriodEnd && (
                        <div className="mt-2 p-2 bg-yellow-100 rounded text-yellow-800 text-sm">
                          <AlertTriangle className="w-4 h-4 inline mr-1" />
                          Subscription will be cancelled on this date
                        </div>
                      )}
                    </div>
                  </div>
                )}

                <div>
                  <h3 className="font-semibold text-gray-900 mb-2">Account</h3>
                  <div className="bg-gray-50 rounded-lg p-4 space-y-2">
                    <div className="flex justify-between">
                      <span className="text-gray-600">Email</span>
                      <span className="font-medium">{user.email}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">User ID</span>
                      <span className="font-mono text-sm">{user.id.slice(0, 8)}...</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </motion.div>

          {/* Actions */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="bg-white rounded-2xl shadow-lg p-8"
          >
            <h2 className="text-xl font-bold text-gray-900 mb-6">Actions</h2>
            
            <div className="grid md:grid-cols-2 gap-6">
              {isFreeTier ? (
                <Link
                  href="/subscription/pricing"
                  className="flex items-center justify-center px-6 py-4 border-2 border-purple-500 text-purple-600 rounded-xl hover:bg-purple-50 transition-all font-semibold"
                >
                  <Sparkles className="w-5 h-5 mr-2" />
                  Upgrade to Premium
                </Link>
              ) : (
                <button
                  onClick={handleBillingPortal}
                  disabled={loading === 'portal'}
                  className="flex items-center justify-center px-6 py-4 bg-gray-900 text-white rounded-xl hover:bg-gray-800 transition-all font-semibold disabled:opacity-50"
                >
                  <CreditCard className="w-5 h-5 mr-2" />
                  {loading === 'portal' ? 'Loading...' : 'Manage Billing'}
                </button>
              )}

              {(isPremium || isStudent) && !subscription?.cancelAtPeriodEnd && (
                <button
                  onClick={handleCancelSubscription}
                  disabled={loading === 'cancel'}
                  className="flex items-center justify-center px-6 py-4 border-2 border-red-500 text-red-600 rounded-xl hover:bg-red-50 transition-all font-semibold disabled:opacity-50"
                >
                  <AlertTriangle className="w-5 h-5 mr-2" />
                  {loading === 'cancel' ? 'Processing...' : 'Cancel Subscription'}
                </button>
              )}
            </div>
          </motion.div>

          {/* Navigation */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="text-center"
          >
            <Link
              href="/library"
              className="inline-flex items-center text-purple-600 hover:text-purple-700 hover:underline"
            >
              ← Back to Library
            </Link>
          </motion.div>
        </div>
      </div>
    </div>
  );
}