'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { AccessibleWrapper } from '@/components/AccessibleWrapper';
import { useAccessibility } from '@/contexts/AccessibilityContext';
import { supabase } from '@/lib/supabase/client';
import { ArrowLeft, Mail, Lock, User, CheckCircle } from 'lucide-react';
import Link from 'next/link';

export default function SignupPage() {
  const router = useRouter();
  const { announceToScreenReader } = useAccessibility();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);

    const formData = new FormData(e.currentTarget);
    const email = formData.get('email') as string;
    const password = formData.get('password') as string;
    const name = formData.get('name') as string;

    try {
      const { error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            name: name,
          },
        },
      });

      if (error) {
        throw error;
      }

      setSuccess(true);
      announceToScreenReader('Account created successfully! Please check your email to verify your account.');
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Signup failed';
      setError(errorMessage);
      announceToScreenReader(`Signup failed: ${errorMessage}`, 'assertive');
    } finally {
      setIsLoading(false);
    }
  };

  if (success) {
    return (
      <div className="page-container magical-bg min-h-screen" style={{ backgroundColor: '#0f172a', color: '#ffffff' }}>
        <div className="fixed inset-0 pointer-events-none" style={{
          background: `
            radial-gradient(circle at 20% 50%, rgba(102, 126, 234, 0.15) 0%, transparent 50%),
            radial-gradient(circle at 80% 80%, rgba(118, 75, 162, 0.12) 0%, transparent 50%),
            radial-gradient(circle at 40% 20%, rgba(240, 147, 251, 0.08) 0%, transparent 50%)
          `
        }} />
        
        <div className="relative flex items-center justify-center min-h-screen py-12 px-12">
          <div className="w-full max-w-md mx-auto">
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.5 }}
          >
            <motion.div
              style={{
                background: 'var(--surface-elevated)',
                borderRadius: '24px',
                boxShadow: '0 4px 6px rgba(0, 0, 0, 0.15), 0 10px 25px rgba(0, 0, 0, 0.25), 0 2px 4px rgba(0, 0, 0, 0.1)',
                border: '1px solid var(--border-light)',
                padding: '40px',
                backdropFilter: 'blur(10px)',
                textAlign: 'center'
              }}
            >
              <AccessibleWrapper
                as="div"
                role="alert"
                aria-live="polite"
              >
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ delay: 0.2, type: "spring", stiffness: 200 }}
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    width: '80px',
                    height: '80px',
                    background: 'linear-gradient(135deg, #22c55e 0%, #16a34a 100%)',
                    borderRadius: '50%',
                    marginBottom: '24px',
                    boxShadow: '0 4px 12px rgba(34, 197, 94, 0.4)'
                  }}
                >
                  <CheckCircle className="w-8 h-8" style={{ color: '#ffffff' }} />
                </motion.div>
                
                <h1 style={{
                  fontSize: '2rem',
                  fontWeight: '800',
                  color: 'var(--text-primary)',
                  marginBottom: '16px',
                  fontFamily: '"Inter", "Segoe UI", system-ui, sans-serif'
                }}>
                  Account Created Successfully!
                </h1>
                
                <p style={{
                  fontSize: '16px',
                  color: 'var(--text-secondary)',
                  marginBottom: '32px',
                  lineHeight: '1.6',
                  fontFamily: '"Inter", "Segoe UI", system-ui, sans-serif'
                }}>
                  Please check your email and click the verification link to activate your account.
                </p>
                
                <motion.div
                  whileHover={{ scale: 1.02, y: -2 }}
                  whileTap={{ scale: 0.98 }}
                >
                  <Link
                    href="/auth/login"
                    style={{
                      display: 'inline-block',
                      padding: '16px 32px',
                      background: 'linear-gradient(135deg, var(--brand-primary) 0%, var(--brand-secondary) 100%)',
                      color: '#ffffff',
                      textDecoration: 'none',
                      borderRadius: '16px',
                      fontSize: '1.1rem',
                      fontWeight: '700',
                      fontFamily: '"Inter", "Segoe UI", system-ui, sans-serif',
                      boxShadow: '0 8px 25px rgba(102, 126, 234, 0.4)',
                      transition: 'all 0.3s ease'
                    }}
                  >
                    Go to Login
                  </Link>
                </motion.div>
              </AccessibleWrapper>
            </motion.div>
          </motion.div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="page-container magical-bg min-h-screen" style={{ backgroundColor: '#0f172a', color: '#ffffff' }}>
      {/* Magical Portfolio Background */}
      <div className="fixed inset-0 pointer-events-none" style={{
        background: `
          radial-gradient(circle at 20% 50%, rgba(102, 126, 234, 0.15) 0%, transparent 50%),
          radial-gradient(circle at 80% 80%, rgba(118, 75, 162, 0.12) 0%, transparent 50%),
          radial-gradient(circle at 40% 20%, rgba(240, 147, 251, 0.08) 0%, transparent 50%)
        `
      }} />
      
      <div className="relative flex items-center justify-center min-h-screen py-12 px-12">
        <div className="w-full max-w-md mx-auto">
        {/* Back Navigation */}
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.4 }}
          className="absolute top-8 left-8"
        >
          <Link 
            href="/"
            className="inline-flex items-center gap-2 text-white/70 hover:text-white transition-colors font-medium"
            style={{
              textDecoration: 'none',
              fontSize: '16px',
              fontFamily: '"Inter", "Segoe UI", system-ui, sans-serif'
            }}
          >
            <ArrowLeft className="w-5 h-5" />
            <span>Back to Home</span>
          </Link>
        </motion.div>

        {/* Premium Auth Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="text-center mb-8"
        >
          <AccessibleWrapper as="header">
            <h1 className="text-gradient" style={{
              fontSize: 'var(--text-4xl)',
              fontWeight: '800',
              marginBottom: '1rem',
              lineHeight: '1.2',
              background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              backgroundClip: 'text',
              fontFamily: '"Inter", "Segoe UI", system-ui, sans-serif'
            }}>
              Create your BookBridge account
            </h1>
            <p style={{
              fontSize: 'var(--text-lg)',
              color: 'var(--text-secondary)',
              fontFamily: '"Inter", "Segoe UI", system-ui, sans-serif',
              lineHeight: '1.6'
            }}>
              Join our accessible AI-powered book companion
            </p>
          </AccessibleWrapper>
        </motion.div>

        {/* Premium Auth Card */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.1 }}
          style={{
            background: 'var(--surface-elevated)',
            borderRadius: '24px',
            boxShadow: '0 4px 6px rgba(0, 0, 0, 0.15), 0 10px 25px rgba(0, 0, 0, 0.25), 0 2px 4px rgba(0, 0, 0, 0.1)',
            border: '1px solid var(--border-light)',
            padding: '40px',
            backdropFilter: 'blur(10px)'
          }}
        >
          <AccessibleWrapper as="section" ariaLabelledBy="signup-form-heading">
            <h2 id="signup-form-heading" className="sr-only">
              Signup Form
            </h2>

            <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
              {/* Premium Name Input */}
              <div>
                <label htmlFor="name" style={{
                  display: 'block',
                  fontSize: '14px',
                  fontWeight: '700',
                  color: 'var(--text-primary)',
                  marginBottom: '8px',
                  fontFamily: '"Inter", "Segoe UI", system-ui, sans-serif'
                }}>
                  Full Name
                </label>
                <div style={{ position: 'relative' }}>
                  <User className="w-5 h-5" style={{
                    position: 'absolute',
                    left: '12px',
                    top: '50%',
                    transform: 'translateY(-50%)',
                    color: 'var(--text-secondary)',
                    zIndex: 1
                  }} />
                  <input
                    id="name"
                    name="name"
                    type="text"
                    autoComplete="name"
                    required
                    disabled={isLoading}
                    className="input-styled"
                    style={{
                      width: '100%',
                      padding: '12px 16px 12px 44px',
                      color: 'var(--text-primary)',
                      background: 'var(--surface-elevated)',
                      border: '2px solid var(--border-light)',
                      borderRadius: '12px',
                      fontSize: '16px',
                      fontFamily: '"Inter", "Segoe UI", system-ui, sans-serif',
                      outline: 'none',
                      transition: 'all 0.3s ease',
                      opacity: isLoading ? 0.5 : 1
                    }}
                    placeholder="Enter your full name"
                  />
                </div>
              </div>

              {/* Premium Email Input */}
              <div>
                <label htmlFor="email" style={{
                  display: 'block',
                  fontSize: '14px',
                  fontWeight: '700',
                  color: 'var(--text-primary)',
                  marginBottom: '8px',
                  fontFamily: '"Inter", "Segoe UI", system-ui, sans-serif'
                }}>
                  Email address
                </label>
                <div style={{ position: 'relative' }}>
                  <Mail className="w-5 h-5" style={{
                    position: 'absolute',
                    left: '12px',
                    top: '50%',
                    transform: 'translateY(-50%)',
                    color: 'var(--text-secondary)',
                    zIndex: 1
                  }} />
                  <input
                    id="email"
                    name="email"
                    type="email"
                    autoComplete="email"
                    required
                    disabled={isLoading}
                    className="input-styled"
                    style={{
                      width: '100%',
                      padding: '12px 16px 12px 44px',
                      color: 'var(--text-primary)',
                      background: 'var(--surface-elevated)',
                      border: '2px solid var(--border-light)',
                      borderRadius: '12px',
                      fontSize: '16px',
                      fontFamily: '"Inter", "Segoe UI", system-ui, sans-serif',
                      outline: 'none',
                      transition: 'all 0.3s ease',
                      opacity: isLoading ? 0.5 : 1
                    }}
                    placeholder="Enter your email"
                  />
                </div>
              </div>

              {/* Premium Password Input */}
              <div>
                <label htmlFor="password" style={{
                  display: 'block',
                  fontSize: '14px',
                  fontWeight: '700',
                  color: 'var(--text-primary)',
                  marginBottom: '8px',
                  fontFamily: '"Inter", "Segoe UI", system-ui, sans-serif'
                }}>
                  Password
                </label>
                <div style={{ position: 'relative' }}>
                  <Lock className="w-5 h-5" style={{
                    position: 'absolute',
                    left: '12px',
                    top: '50%',
                    transform: 'translateY(-50%)',
                    color: 'var(--text-secondary)',
                    zIndex: 1
                  }} />
                  <input
                    id="password"
                    name="password"
                    type="password"
                    autoComplete="new-password"
                    minLength={6}
                    required
                    disabled={isLoading}
                    className="input-styled"
                    style={{
                      width: '100%',
                      padding: '12px 16px 12px 44px',
                      color: 'var(--text-primary)',
                      background: 'var(--surface-elevated)',
                      border: '2px solid var(--border-light)',
                      borderRadius: '12px',
                      fontSize: '16px',
                      fontFamily: '"Inter", "Segoe UI", system-ui, sans-serif',
                      outline: 'none',
                      transition: 'all 0.3s ease',
                      opacity: isLoading ? 0.5 : 1
                    }}
                    placeholder="Create a password (min 6 characters)"
                    aria-describedby="password-help"
                  />
                </div>
                <div id="password-help" style={{
                  fontSize: '12px',
                  color: 'var(--text-secondary)',
                  marginTop: '6px',
                  opacity: 0.8,
                  fontFamily: '"Inter", "Segoe UI", system-ui, sans-serif'
                }}>
                  Password must be at least 6 characters long
                </div>
              </div>

              {/* Premium Error Message */}
              {error && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ duration: 0.3 }}
                >
                  <AccessibleWrapper
                    as="div"
                    role="alert"
                    aria-live="assertive"
                    style={{
                      padding: '16px',
                      borderRadius: '12px',
                      background: 'rgba(239, 68, 68, 0.1)',
                      border: '1px solid rgba(239, 68, 68, 0.3)',
                      backdropFilter: 'blur(10px)'
                    }}
                  >
                    <div style={{
                      fontSize: '14px',
                      color: '#ef4444',
                      fontWeight: '600',
                      fontFamily: '"Inter", "Segoe UI", system-ui, sans-serif'
                    }}>{error}</div>
                  </AccessibleWrapper>
                </motion.div>
              )}

              {/* Premium Submit Button */}
              <motion.button
                type="submit"
                disabled={isLoading}
                whileHover={{ 
                  scale: isLoading ? 1 : 1.02,
                  boxShadow: isLoading ? undefined : '0 12px 40px rgba(102, 126, 234, 0.6), 0 0 0 1px rgba(255,255,255,0.1)',
                  y: isLoading ? 0 : -3
                }}
                whileTap={{ scale: isLoading ? 1 : 0.98 }}
                style={{
                  width: '100%',
                  padding: '16px 32px',
                  background: 'linear-gradient(135deg, var(--brand-primary) 0%, var(--brand-secondary) 50%, #8b5cf6 100%)',
                  color: '#ffffff',
                  border: 'none',
                  borderRadius: '16px',
                  fontSize: '1.1rem',
                  fontWeight: '800',
                  fontFamily: '"Inter", "Segoe UI", system-ui, sans-serif',
                  cursor: isLoading ? 'not-allowed' : 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '8px',
                  position: 'relative',
                  overflow: 'hidden',
                  transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                  boxShadow: '0 8px 25px rgba(102, 126, 234, 0.4), inset 0 1px 0 rgba(255,255,255,0.2)',
                  letterSpacing: '0.02em',
                  textShadow: '0 1px 2px rgba(0,0,0,0.2)',
                  opacity: isLoading ? 0.7 : 1
                }}
              >
                {/* Enhanced Shimmer Effect */}
                {!isLoading && (
                  <div style={{
                    position: 'absolute',
                    top: 0,
                    left: '-100%',
                    width: '100%',
                    height: '100%',
                    background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.4), transparent)',
                    animation: 'shimmer 3s infinite',
                    zIndex: 1
                  }} />
                )}
                
                {isLoading ? (
                  <>
                    <motion.div
                      animate={{ rotate: 360 }}
                      transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                      style={{
                        width: '20px',
                        height: '20px',
                        border: '2px solid #ffffff',
                        borderTop: '2px solid transparent',
                        borderRadius: '50%'
                      }}
                    />
                    <span style={{ zIndex: 2 }}>Creating account...</span>
                  </>
                ) : (
                  <span style={{ 
                    zIndex: 2,
                    background: 'linear-gradient(135deg, #ffffff 0%, #f0f9ff 100%)',
                    WebkitBackgroundClip: 'text',
                    WebkitTextFillColor: 'transparent',
                    backgroundClip: 'text'
                  }}>Create account</span>
                )}
              </motion.button>

              {/* Premium Signup Link */}
              <div style={{ textAlign: 'center', marginTop: '8px' }}>
                <p style={{
                  fontSize: '14px',
                  color: 'var(--text-secondary)',
                  fontFamily: '"Inter", "Segoe UI", system-ui, sans-serif'
                }}>
                  Already have an account?{' '}
                  <Link
                    href="/auth/login"
                    style={{
                      fontWeight: '600',
                      background: 'linear-gradient(135deg, var(--brand-primary) 0%, var(--brand-secondary) 100%)',
                      WebkitBackgroundClip: 'text',
                      WebkitTextFillColor: 'transparent',
                      backgroundClip: 'text',
                      textDecoration: 'none',
                      transition: 'all 0.3s ease'
                    }}
                    className="hover:underline focus:outline-none focus:underline"
                  >
                    Sign in
                  </Link>
                </p>
              </div>
            </form>
          </AccessibleWrapper>
        </motion.div>
        </div>
      </div>
    </div>
  );
}