'use client';

import { useState } from 'react';
import { loadStripe } from '@stripe/stripe-js';
import { useSubscription } from '@/hooks/useSubscription';
import { PRICING } from '@/types/subscription';
import { motion } from 'framer-motion';
import { Check, Sparkles, GraduationCap, BookOpen, Mic, Download, Headphones } from 'lucide-react';

const stripePromise = loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY!);

export default function PricingPage() {
  const [loading, setLoading] = useState<string | null>(null);
  const { user, subscription, isPremium, isStudent } = useSubscription();

  const handleSubscribe = async (tier: 'premium' | 'student') => {
    if (!user) {
      // Redirect to login
      window.location.href = '/auth/login';
      return;
    }

    setLoading(tier);

    try {
      const response = await fetch('/api/stripe/create-checkout-session', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          tier,
          userId: user.id,
          userEmail: user.email
        }),
      });

      const { sessionId, url } = await response.json();

      if (url) {
        window.location.href = url;
      } else {
        const stripe = await stripePromise;
        if (stripe) {
          await stripe.redirectToCheckout({ sessionId });
        }
      }
    } catch (error) {
      console.error('Failed to create checkout session:', error);
      alert('Failed to start checkout. Please try again.');
    } finally {
      setLoading(null);
    }
  };

  const PricingCard = ({ 
    title, 
    price, 
    tier, 
    icon: Icon, 
    features, 
    isPopular = false,
    isCurrentPlan = false 
  }: {
    title: string;
    price: string;
    tier: 'premium' | 'student';
    icon: any;
    features: string[];
    isPopular?: boolean;
    isCurrentPlan?: boolean;
  }) => (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className={`relative bg-white rounded-2xl shadow-xl p-8 ${
        isPopular ? 'ring-2 ring-purple-500 scale-105' : ''
      }`}
    >
      {isPopular && (
        <div className="absolute -top-4 left-1/2 transform -translate-x-1/2">
          <span className="bg-gradient-to-r from-purple-500 to-blue-500 text-white px-4 py-1 rounded-full text-sm font-medium">
            Most Popular
          </span>
        </div>
      )}

      <div className="text-center mb-6">
        <Icon className="w-12 h-12 mx-auto mb-4 text-purple-500" />
        <h3 className="text-2xl font-bold text-gray-900 mb-2">{title}</h3>
        <div className="text-4xl font-bold text-gray-900">
          {price}
          <span className="text-lg font-normal text-gray-500">/month</span>
        </div>
      </div>

      <ul className="space-y-4 mb-8">
        {features.map((feature, index) => (
          <li key={index} className="flex items-start">
            <Check className="w-5 h-5 text-green-500 mr-3 mt-0.5 flex-shrink-0" />
            <span className="text-gray-700">{feature}</span>
          </li>
        ))}
      </ul>

      <button
        onClick={() => handleSubscribe(tier)}
        disabled={loading === tier || isCurrentPlan}
        className={`w-full py-3 px-6 rounded-xl font-semibold transition-all ${
          isCurrentPlan
            ? 'bg-gray-100 text-gray-500 cursor-not-allowed'
            : isPopular
            ? 'bg-gradient-to-r from-purple-500 to-blue-500 text-white hover:from-purple-600 hover:to-blue-600 shadow-lg hover:shadow-xl'
            : 'bg-gray-900 text-white hover:bg-gray-800'
        }`}
      >
        {loading === tier ? (
          <span className="flex items-center justify-center">
            <svg className="animate-spin -ml-1 mr-3 h-5 w-5" viewBox="0 0 24 24">
              <circle
                className="opacity-25"
                cx="12"
                cy="12"
                r="10"
                stroke="currentColor"
                strokeWidth="4"
                fill="none"
              />
              <path
                className="opacity-75"
                fill="currentColor"
                d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
              />
            </svg>
            Processing...
          </span>
        ) : isCurrentPlan ? (
          'Current Plan'
        ) : (
          `Get ${title}`
        )}
      </button>
    </motion.div>
  );

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-50 to-white py-12">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="text-center mb-16">
          <motion.h1
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-4xl md:text-5xl font-bold text-gray-900 mb-4"
          >
            Choose Your BookBridge Plan
          </motion.h1>
          <motion.p
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="text-xl text-gray-600 max-w-2xl mx-auto"
          >
            Unlock the full potential of AI-powered book analysis with unlimited access, 
            voice features, and priority support.
          </motion.p>
        </div>

        {/* Free Tier Info */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="bg-blue-50 rounded-2xl p-6 mb-12 max-w-2xl mx-auto"
        >
          <div className="text-center">
            <BookOpen className="w-8 h-8 mx-auto mb-3 text-blue-500" />
            <h3 className="text-lg font-semibold text-blue-900 mb-2">Free Tier</h3>
            <p className="text-blue-700">
              Start with 3 book analyses per month and unlimited public domain books. 
              Perfect for getting started with BookBridge.
            </p>
          </div>
        </motion.div>

        {/* Pricing Cards */}
        <div className="grid md:grid-cols-2 gap-8 max-w-4xl mx-auto mb-16">
          <PricingCard
            title="Premium"
            price="$4"
            tier="premium"
            icon={Sparkles}
            isPopular={true}
            isCurrentPlan={isPremium}
            features={[
              'Unlimited book analysis',
              'Advanced AI conversations',
              'Voice features & audio generation',
              'Export notes and highlights',
              'Priority customer support',
              'Early access to new features',
              'Advanced analytics dashboard'
            ]}
          />

          <PricingCard
            title="Student"
            price="$2"
            tier="student"
            icon={GraduationCap}
            isCurrentPlan={isStudent}
            features={[
              'Unlimited book analysis',
              'Advanced AI conversations',
              'Voice features & audio generation',
              'Export notes and highlights',
              'Student-focused features',
              'Study group collaboration',
              'Academic citation tools'
            ]}
          />
        </div>

        {/* Feature Comparison */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="bg-white rounded-2xl shadow-xl p-8 max-w-4xl mx-auto"
        >
          <h3 className="text-2xl font-bold text-center text-gray-900 mb-8">
            Feature Comparison
          </h3>
          
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b-2 border-gray-200">
                  <th className="text-left py-3 px-4">Feature</th>
                  <th className="text-center py-3 px-4">Free</th>
                  <th className="text-center py-3 px-4">Premium</th>
                  <th className="text-center py-3 px-4">Student</th>
                </tr>
              </thead>
              <tbody className="text-sm">
                <tr className="border-b border-gray-100">
                  <td className="py-3 px-4 flex items-center">
                    <BookOpen className="w-4 h-4 mr-2 text-gray-500" />
                    Monthly book analyses
                  </td>
                  <td className="text-center py-3 px-4">3</td>
                  <td className="text-center py-3 px-4">Unlimited</td>
                  <td className="text-center py-3 px-4">Unlimited</td>
                </tr>
                <tr className="border-b border-gray-100">
                  <td className="py-3 px-4 flex items-center">
                    <Mic className="w-4 h-4 mr-2 text-gray-500" />
                    Voice features
                  </td>
                  <td className="text-center py-3 px-4">❌</td>
                  <td className="text-center py-3 px-4">✅</td>
                  <td className="text-center py-3 px-4">✅</td>
                </tr>
                <tr className="border-b border-gray-100">
                  <td className="py-3 px-4 flex items-center">
                    <Download className="w-4 h-4 mr-2 text-gray-500" />
                    Export capabilities
                  </td>
                  <td className="text-center py-3 px-4">❌</td>
                  <td className="text-center py-3 px-4">✅</td>
                  <td className="text-center py-3 px-4">✅</td>
                </tr>
                <tr className="border-b border-gray-100">
                  <td className="py-3 px-4 flex items-center">
                    <Headphones className="w-4 h-4 mr-2 text-gray-500" />
                    Priority support
                  </td>
                  <td className="text-center py-3 px-4">❌</td>
                  <td className="text-center py-3 px-4">✅</td>
                  <td className="text-center py-3 px-4">❌</td>
                </tr>
              </tbody>
            </table>
          </div>
        </motion.div>

        {/* CTA */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
          className="text-center mt-16"
        >
          <p className="text-gray-600 mb-4">
            Have questions? <a href="/contact" className="text-purple-600 hover:underline">Contact us</a>
          </p>
          <p className="text-sm text-gray-500">
            Cancel anytime. No hidden fees. 30-day money-back guarantee.
          </p>
        </motion.div>
      </div>
    </div>
  );
}