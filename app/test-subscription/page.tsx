'use client';

import { useSubscription } from '@/hooks/useSubscription';
import { useEffect } from 'react';

export default function TestSubscriptionPage() {
  const { 
    user,
    subscription, 
    usage, 
    isLoading, 
    remainingAnalyses,
    isPremium,
    isStudent,
    isFreeTier
  } = useSubscription();

  useEffect(() => {
    console.log('=== SUBSCRIPTION TEST RESULTS ===');
    console.log('User:', user?.id);
    console.log('Subscription:', subscription);
    console.log('Usage:', usage);
    console.log('Is Loading:', isLoading);
    console.log('Remaining Analyses:', remainingAnalyses);
    console.log('Is Premium:', isPremium);
    console.log('Is Student:', isStudent);
    console.log('Is Free Tier:', isFreeTier);
    console.log('================================');
  }, [user, subscription, usage, isLoading, remainingAnalyses, isPremium, isStudent, isFreeTier]);

  if (isLoading) {
    return (
      <div className="p-8">
        <h1 className="text-2xl font-bold mb-4">Testing Subscription System</h1>
        <p>Loading subscription data...</p>
      </div>
    );
  }

  return (
    <div className="p-8 max-w-2xl">
      <h1 className="text-2xl font-bold mb-6">Subscription System Test Results</h1>
      
      <div className="space-y-4">
        <div className="bg-gray-100 p-4 rounded">
          <h2 className="font-semibold">User Status</h2>
          <p>User ID: {user?.id || 'Not logged in'}</p>
          <p>Email: {user?.email || 'N/A'}</p>
        </div>

        <div className="bg-blue-100 p-4 rounded">
          <h2 className="font-semibold">Subscription Data</h2>
          <p>Tier: {subscription?.tier || 'None'}</p>
          <p>ID: {subscription?.id || 'None'}</p>
          <p>Student Verified: {subscription?.isStudentVerified ? 'Yes' : 'No'}</p>
        </div>

        <div className="bg-green-100 p-4 rounded">
          <h2 className="font-semibold">Usage Data</h2>
          <p>Book Analyses Count: {usage?.bookAnalysesCount || 0}</p>
          <p>Remaining Analyses: {remainingAnalyses}</p>
          <p>Last Reset: {usage?.lastResetDate ? new Date(usage.lastResetDate).toLocaleDateString() : 'N/A'}</p>
        </div>

        <div className="bg-purple-100 p-4 rounded">
          <h2 className="font-semibold">Subscription Status</h2>
          <p>Is Free Tier: {isFreeTier ? 'Yes' : 'No'}</p>
          <p>Is Premium: {isPremium ? 'Yes' : 'No'}</p>
          <p>Is Student: {isStudent ? 'Yes' : 'No'}</p>
        </div>

        <div className="bg-yellow-100 p-4 rounded">
          <h2 className="font-semibold">What You Should See</h2>
          <ul className="list-disc ml-4">
            <li>If logged in: Real database data or fallback with user ID</li>
            <li>If not logged in: No subscription/usage data</li>
            <li>Check browser console for detailed logs</li>
            <li>Remaining analyses should show correct calculation</li>
          </ul>
        </div>
      </div>

      <div className="mt-6">
        <a href="/" className="text-blue-500 underline">← Back to Home</a>
      </div>
    </div>
  );
}