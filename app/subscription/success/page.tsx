'use client';

import { useEffect, useState, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { motion } from 'framer-motion';
import { CheckCircle, Sparkles, ArrowRight } from 'lucide-react';
import Link from 'next/link';

function SuccessContent() {
  const searchParams = useSearchParams();
  const sessionId = searchParams.get('session_id');
  const [loading, setLoading] = useState(true);
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    // Verify the session was successful
    if (sessionId) {
      // In a real app, you might want to verify the session with your backend
      setSuccess(true);
    }
    setLoading(false);
  }, [sessionId]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-green-50 to-white flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-500 mx-auto mb-4"></div>
          <p className="text-gray-600">Confirming your subscription...</p>
        </div>
      </div>
    );
  }

  if (!success) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-red-50 to-white flex items-center justify-center">
        <div className="text-center max-w-md mx-auto px-4">
          <div className="text-red-500 mb-4">
            <svg className="w-16 h-16 mx-auto" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </div>
          <h1 className="text-2xl font-bold text-gray-900 mb-4">Subscription Failed</h1>
          <p className="text-gray-600 mb-6">
            We couldn't confirm your subscription. Please try again or contact support.
          </p>
          <Link
            href="/subscription/pricing"
            className="inline-flex items-center px-6 py-3 border border-transparent text-base font-medium rounded-lg shadow-sm text-white bg-purple-600 hover:bg-purple-700"
          >
            Try Again
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-green-50 to-white flex items-center justify-center">
      <div className="max-w-2xl mx-auto px-4 text-center">
        <motion.div
          initial={{ opacity: 0, scale: 0.5 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.5 }}
          className="mb-8"
        >
          <CheckCircle className="w-24 h-24 text-green-500 mx-auto mb-6" />
          
          <motion.h1
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="text-4xl md:text-5xl font-bold text-gray-900 mb-4"
          >
            Welcome to BookBridge Premium!
          </motion.h1>

          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="text-xl text-gray-600 mb-8"
          >
            Your subscription is now active. Enjoy unlimited book analysis, 
            voice features, and all the premium benefits!
          </motion.p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="bg-white rounded-2xl shadow-xl p-8 mb-8"
        >
          <Sparkles className="w-12 h-12 text-purple-500 mx-auto mb-4" />
          <h2 className="text-2xl font-semibold text-gray-900 mb-4">What's Next?</h2>
          
          <div className="space-y-4 text-left">
            <div className="flex items-start">
              <div className="flex-shrink-0 w-6 h-6 bg-purple-100 rounded-full flex items-center justify-center mr-3 mt-0.5">
                <span className="text-purple-600 text-sm font-medium">1</span>
              </div>
              <div>
                <h3 className="font-medium text-gray-900">Start Analyzing Books</h3>
                <p className="text-gray-600">Upload any book or browse our catalog for unlimited AI-powered analysis.</p>
              </div>
            </div>
            
            <div className="flex items-start">
              <div className="flex-shrink-0 w-6 h-6 bg-purple-100 rounded-full flex items-center justify-center mr-3 mt-0.5">
                <span className="text-purple-600 text-sm font-medium">2</span>
              </div>
              <div>
                <h3 className="font-medium text-gray-900">Try Voice Features</h3>
                <p className="text-gray-600">Experience our AI narrator and voice-guided book exploration.</p>
              </div>
            </div>
            
            <div className="flex items-start">
              <div className="flex-shrink-0 w-6 h-6 bg-purple-100 rounded-full flex items-center justify-center mr-3 mt-0.5">
                <span className="text-purple-600 text-sm font-medium">3</span>
              </div>
              <div>
                <h3 className="font-medium text-gray-900">Export Your Notes</h3>
                <p className="text-gray-600">Save and export your insights, highlights, and AI conversations.</p>
              </div>
            </div>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
          className="space-y-4"
        >
          <Link
            href="/library"
            className="inline-flex items-center px-8 py-4 border border-transparent text-lg font-medium rounded-xl shadow-sm text-white bg-gradient-to-r from-purple-500 to-blue-500 hover:from-purple-600 hover:to-blue-600 transition-all"
          >
            Go to Your Library
            <ArrowRight className="ml-2 w-5 h-5" />
          </Link>
          
          <div className="text-center">
            <Link
              href="/subscription/manage"
              className="text-purple-600 hover:text-purple-700 hover:underline"
            >
              Manage your subscription
            </Link>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.6 }}
          className="mt-12 text-sm text-gray-500"
        >
          <p>
            Questions? Contact us at{' '}
            <a href="mailto:support@bookbridge.ai" className="text-purple-600 hover:underline">
              support@bookbridge.ai
            </a>
          </p>
        </motion.div>
      </div>
    </div>
  );
}

export default function SubscriptionSuccessPage() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center">Loading...</div>}>
      <SuccessContent />
    </Suspense>
  );
}