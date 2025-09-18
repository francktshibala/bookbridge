'use client';

import React from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';

interface PremiumGateProps {
  feature: string;
  children: React.ReactNode;
  userIsPremium?: boolean;
}

export function PremiumGate({ feature, children, userIsPremium = false }: PremiumGateProps) {
  // If user is premium, show the content
  if (userIsPremium) {
    return <>{children}</>;
  }

  // TOUCHPOINT 4: Premium feature gate with upgrade CTA
  return (
    <div style={{ position: 'relative' }}>
      {/* Blurred content */}
      <div style={{
        filter: 'blur(4px)',
        opacity: 0.5,
        pointerEvents: 'none',
        userSelect: 'none'
      }}>
        {children}
      </div>

      {/* Premium overlay */}
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.3 }}
        style={{
          position: 'absolute',
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
          background: 'linear-gradient(135deg, rgba(15, 23, 42, 0.95) 0%, rgba(30, 41, 59, 0.95) 100%)',
          backdropFilter: 'blur(20px)',
          border: '2px solid #10b981',
          borderRadius: '16px',
          padding: '2rem',
          textAlign: 'center',
          maxWidth: '400px',
          width: '90%',
          boxShadow: '0 20px 40px rgba(0, 0, 0, 0.3), 0 0 0 1px rgba(16, 185, 129, 0.2)',
          zIndex: 10
        }}
      >
        <div style={{
          width: '60px',
          height: '60px',
          borderRadius: '50%',
          background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          margin: '0 auto 1rem auto',
          boxShadow: '0 8px 24px rgba(16, 185, 129, 0.3)'
        }}>
          <span style={{ fontSize: '24px' }}>🔒</span>
        </div>

        <h3 style={{
          fontSize: '1.5rem',
          fontWeight: 'bold',
          color: '#ffffff',
          marginBottom: '0.5rem'
        }}>
          Premium Feature
        </h3>

        <p style={{
          color: '#94a3b8',
          marginBottom: '1.5rem',
          lineHeight: '1.6'
        }}>
          {feature} requires Premium access. Upgrade to unlock advanced features and premium voices.
        </p>

        <div style={{
          display: 'flex',
          flexDirection: 'column',
          gap: '12px',
          alignItems: 'center'
        }}>
          <motion.div
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
          >
            <Link
              href="/upgrade"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '8px',
                background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
                color: 'white',
                padding: '12px 24px',
                borderRadius: '12px',
                textDecoration: 'none',
                fontSize: '1rem',
                fontWeight: '600',
                transition: 'all 0.3s ease',
                boxShadow: '0 4px 16px rgba(16, 185, 129, 0.3)'
              }}
            >
              <span>🚀</span>
              Upgrade to Premium
            </Link>
          </motion.div>

          <div style={{
            fontSize: '0.875rem',
            color: '#64748b'
          }}>
            Premium $5.99/mo
          </div>
        </div>
      </motion.div>
    </div>
  );
}

export default PremiumGate;