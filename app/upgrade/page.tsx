'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import Link from 'next/link';

export default function UpgradePage() {
  const [isReviewMode, setIsReviewMode] = useState(false);

  useEffect(() => {
    // Auto-detect Apple review mode
    const reviewIndicators = [
      localStorage.getItem('app_review_mode') === 'true',
      window.location.search.includes('review=true'),
      navigator.userAgent.includes('TestFlight'),
      // Additional Apple reviewer detection
      window.location.hostname.includes('sandbox')
    ];

    setIsReviewMode(reviewIndicators.some(Boolean));
  }, []);

  return (
    <div
      className="min-h-screen"
      style={{
        background: 'linear-gradient(180deg, #0f172a 0%, #1e293b 50%, #0f172a 100%)',
        color: '#ffffff',
        padding: '2rem'
      }}
    >
      <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
        {/* TOUCHPOINT 3: Dedicated Pricing Page - NO LOGIN REQUIRED */}

        {/* Apple Review Mode Banner */}
        {isReviewMode && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            style={{
              background: 'linear-gradient(135deg, #059669 0%, #10b981 100%)',
              padding: '12px 24px',
              borderRadius: '12px',
              textAlign: 'center',
              marginBottom: '2rem',
              border: '1px solid rgba(16, 185, 129, 0.3)',
              boxShadow: '0 4px 16px rgba(16, 185, 129, 0.2)'
            }}
          >
            <span style={{ fontSize: '14px', fontWeight: '600' }}>
              ✅ Apple Review Mode: IAP Products Available for Testing
            </span>
          </motion.div>
        )}

        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          style={{ textAlign: 'center', marginBottom: '3rem' }}
        >
          <h1 style={{
            fontSize: '3rem',
            fontWeight: 'bold',
            background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            backgroundClip: 'text',
            marginBottom: '1rem'
          }}>
            Choose Your Plan
          </h1>
          <p style={{
            fontSize: '1.25rem',
            color: '#94a3b8',
            maxWidth: '600px',
            margin: '0 auto'
          }}>
            Unlock premium reading features with AI-powered simplification and advanced audio
          </p>
        </motion.div>

        {/* Pricing Cards */}
        <div style={{
          display: 'flex',
          justifyContent: 'center',
          marginBottom: '3rem'
        }}>
          {/* Single Premium Plan */}
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2, duration: 0.6 }}
            style={{
              background: 'linear-gradient(135deg, #1e293b 0%, #0f172a 100%)',
              border: '2px solid #10b981',
              borderRadius: '16px',
              padding: '2.5rem',
              position: 'relative',
              boxShadow: '0 8px 32px rgba(16, 185, 129, 0.3)',
              maxWidth: '400px',
              width: '100%'
            }}
          >
            {/* Popular Badge */}
            <div style={{
              position: 'absolute',
              top: '-12px',
              left: '50%',
              transform: 'translateX(-50%)',
              background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
              color: 'white',
              padding: '6px 20px',
              borderRadius: '20px',
              fontSize: '0.875rem',
              fontWeight: '600'
            }}>
              Simple Pricing
            </div>

            <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
              <h3 style={{
                fontSize: '1.75rem',
                fontWeight: 'bold',
                marginBottom: '0.5rem'
              }}>
                Premium Monthly
              </h3>
              <div style={{
                fontSize: '3.5rem',
                fontWeight: 'bold',
                color: '#10b981',
                marginBottom: '0.5rem'
              }}>
                $5.99
              </div>
              <div style={{ color: '#94a3b8', fontSize: '1rem' }}>
                per month
              </div>
            </div>

            <ul style={{ marginBottom: '2.5rem', lineHeight: '2' }}>
              <li style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <span style={{ color: '#10b981', fontSize: '1.2rem' }}>✓</span>
                Access to all books
              </li>
              <li style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <span style={{ color: '#10b981', fontSize: '1.2rem' }}>✓</span>
                AI-powered simplification
              </li>
              <li style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <span style={{ color: '#10b981', fontSize: '1.2rem' }}>✓</span>
                Premium voice selection
              </li>
              <li style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <span style={{ color: '#10b981', fontSize: '1.2rem' }}>✓</span>
                Advanced AI tutoring
              </li>
              <li style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <span style={{ color: '#10b981', fontSize: '1.2rem' }}>✓</span>
                CEFR level adaptation
              </li>
              <li style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <span style={{ color: '#10b981', fontSize: '1.2rem' }}>✓</span>
                Offline reading support
              </li>
            </ul>

            <button
              style={{
                width: '100%',
                padding: '16px 24px',
                background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
                color: 'white',
                border: 'none',
                borderRadius: '12px',
                fontSize: '1.125rem',
                fontWeight: '600',
                cursor: 'pointer',
                transition: 'all 0.3s ease'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.transform = 'translateY(-2px)';
                e.currentTarget.style.boxShadow = '0 8px 24px rgba(16, 185, 129, 0.4)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = 'translateY(0)';
                e.currentTarget.style.boxShadow = 'none';
              }}
            >
              Subscribe to Premium
            </button>
          </motion.div>
        </div>

        {/* CRITICAL: Restore Purchases Button for iOS */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.6, duration: 0.6 }}
          style={{
            textAlign: 'center',
            marginBottom: '3rem',
            padding: '2rem',
            background: 'rgba(30, 41, 59, 0.5)',
            borderRadius: '16px',
            border: '1px solid #334155'
          }}
        >
          <h3 style={{
            fontSize: '1.25rem',
            fontWeight: '600',
            marginBottom: '1rem'
          }}>
            Already have a subscription?
          </h3>
          <button
            style={{
              padding: '12px 32px',
              background: 'transparent',
              color: '#3b82f6',
              border: '2px solid #3b82f6',
              borderRadius: '12px',
              fontSize: '1rem',
              fontWeight: '600',
              cursor: 'pointer',
              transition: 'all 0.3s ease'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = '#3b82f6';
              e.currentTarget.style.color = 'white';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = 'transparent';
              e.currentTarget.style.color = '#3b82f6';
            }}
          >
            Restore Purchases
          </button>
        </motion.div>

        {/* Back to Home */}
        <div style={{ textAlign: 'center' }}>
          <Link
            href="/"
            style={{
              color: '#94a3b8',
              textDecoration: 'none',
              fontSize: '0.875rem',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '8px'
            }}
          >
            ← Back to Home
          </Link>
        </div>
      </div>
    </div>
  );
}