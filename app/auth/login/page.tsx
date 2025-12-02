'use client';

import React, { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { motion } from 'framer-motion';
import { AccessibleWrapper } from '@/components/AccessibleWrapper';
import { useAccessibility } from '@/contexts/AccessibilityContext';
import { useIsMobile } from '@/hooks/useIsMobile';
import { supabase } from '@/lib/supabase/client';
import { ArrowLeft, Mail, Lock } from 'lucide-react';
import Link from 'next/link';
import { trackEvent } from '@/lib/analytics/posthog';

function LoginPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { announceToScreenReader } = useAccessibility();
  const { isMobile, windowWidth } = useIsMobile();
  const isVerySmall = windowWidth < 375; // iPhone SE and smaller
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [resendingEmail, setResendingEmail] = useState(false);

  // Read error from URL (e.g., from expired verification link)
  useEffect(() => {
    const urlError = searchParams.get('error');
    const urlMessage = searchParams.get('message');
    if (urlError || urlMessage) {
      setError(urlMessage || urlError || null);
      if (urlMessage) {
        announceToScreenReader(urlMessage, 'assertive');
      }
    }
  }, [searchParams, announceToScreenReader]);

  // Resend confirmation email
  const handleResendConfirmation = async (email: string) => {
    setResendingEmail(true);
    try {
      const { error } = await supabase.auth.resend({
        type: 'signup',
        email: email,
        options: {
          emailRedirectTo: `${process.env.NEXT_PUBLIC_APP_URL || window.location.origin}/auth/callback?type=signup`,
        },
      });
      
      if (error) throw error;
      
      setError(null);
      announceToScreenReader('New confirmation email sent! Please check your inbox.');
      // Show success message
      setError('New confirmation email sent! Please check your inbox.');
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to resend email';
      setError(errorMessage);
      announceToScreenReader(`Failed to resend: ${errorMessage}`, 'assertive');
    } finally {
      setResendingEmail(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);

    const formData = new FormData(e.currentTarget);
    const email = formData.get('email') as string;
    const password = formData.get('password') as string;

    try {
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        throw error;
      }

      // Track successful login (Gate 2: First Use)
      trackEvent('user_logged_in', {
        login_method: 'email',
        timestamp: new Date().toISOString(),
      });

      announceToScreenReader('Login successful! Redirecting to library.');
      router.push('/library');
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Login failed';
      setError(errorMessage);
      announceToScreenReader(`Login failed: ${errorMessage}`, 'assertive');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="page-container min-h-screen bg-[var(--bg-primary)] text-[var(--text-primary)]">
      {/* Neo-Classic Theme Background */}
      <div className="fixed inset-0 pointer-events-none" style={{
        background: `
          radial-gradient(circle at 20% 50%, var(--accent-primary)/15 0%, transparent 50%),
          radial-gradient(circle at 80% 80%, var(--accent-secondary)/12 0%, transparent 50%),
          radial-gradient(circle at 40% 20%, var(--accent-light)/8 0%, transparent 50%)
        `
      }} />
      
      <div className="relative flex items-center justify-center min-h-screen" style={{
        padding: isVerySmall ? '4px 0px' : (isMobile ? '8px 4px' : '48px 48px')
      }}>
        <div className="w-full max-w-md mx-auto">
        {/* Back Navigation - Moved to natural flow */}
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          className={isVerySmall ? "mb-4" : "mb-6"}
        >
          <Link 
            href="/"
            className="inline-flex items-center gap-2 text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors font-medium"
            style={{
              textDecoration: 'none',
              fontSize: isVerySmall ? '14px' : '16px',
              fontFamily: 'Source Serif Pro, Georgia, serif'
            }}
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Back to Home</span>
          </Link>
        </motion.div>

        {/* Premium Auth Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className={isVerySmall ? "text-center mb-4" : "text-center mb-8"}
        >
          <AccessibleWrapper as="header">
            <h1 style={{
              fontSize: isVerySmall ? '22px' : (isMobile ? '28px' : '2.5rem'),
              fontWeight: '700',
              marginBottom: isVerySmall ? '0.5rem' : '1rem',
              lineHeight: isVerySmall ? '1.15' : '1.2',
              color: 'var(--text-accent)',
              fontFamily: 'Playfair Display, serif',
              wordBreak: 'break-word',
              hyphens: 'auto'
            }}>
              Sign in to BookBridge
            </h1>
            <p style={{
              fontSize: isVerySmall ? '14px' : (isMobile ? '16px' : '1.125rem'),
              color: 'var(--text-secondary)',
              fontFamily: 'Source Serif Pro, Georgia, serif',
              lineHeight: '1.6'
            }}>
              Access your AI-powered book companion
            </p>
          </AccessibleWrapper>
        </motion.div>

        {/* Premium Auth Card */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.1 }}
          style={{
            background: 'var(--bg-secondary)',
            borderRadius: '24px',
            boxShadow: '0 4px 6px var(--shadow-soft), 0 10px 25px var(--shadow-medium), 0 2px 4px var(--shadow-light)',
            border: '2px solid var(--border-light)',
            padding: isVerySmall ? '16px 8px' : (isMobile ? '24px 16px' : '40px'),
            backdropFilter: 'blur(10px)'
          }}
        >
          <AccessibleWrapper as="section" ariaLabelledBy="login-form-heading">
            <h2 id="login-form-heading" className="sr-only">
              Login Form
            </h2>

            <form onSubmit={handleSubmit} style={{ 
              display: 'flex', 
              flexDirection: 'column', 
              gap: isVerySmall ? '16px' : '24px' 
            }}>
              {/* Premium Email Input */}
              <div>
                <label htmlFor="email" style={{
                  display: 'block',
                  fontSize: '14px',
                  fontWeight: '700',
                  color: 'var(--text-primary)',
                  marginBottom: '8px',
                  fontFamily: 'Source Serif Pro, Georgia, serif'
                }}>
                  Email address
                </label>
                <div style={{ position: 'relative' }}>
                  <Mail className="w-5 h-5" style={{
                    position: 'absolute',
                    left: isVerySmall ? '14px' : (isMobile ? '16px' : '12px'),
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
                      padding: isVerySmall ? '14px 12px 14px 48px' : (isMobile ? '16px 16px 16px 52px' : '12px 16px 12px 44px'),
                      color: 'var(--text-primary)',
                      background: 'var(--bg-tertiary)',
                      border: '2px solid var(--border-light)',
                      borderRadius: '12px',
                      fontSize: '16px',
                      fontFamily: 'Source Serif Pro, Georgia, serif',
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
                  fontFamily: 'Source Serif Pro, Georgia, serif'
                }}>
                  Password
                </label>
                <div style={{ position: 'relative' }}>
                  <Lock className="w-5 h-5" style={{
                    position: 'absolute',
                    left: isVerySmall ? '14px' : (isMobile ? '16px' : '12px'),
                    top: '50%',
                    transform: 'translateY(-50%)',
                    color: 'var(--text-secondary)',
                    zIndex: 1
                  }} />
                  <input
                    id="password"
                    name="password"
                    type="password"
                    autoComplete="current-password"
                    required
                    disabled={isLoading}
                    className="input-styled"
                    style={{
                      width: '100%',
                      padding: isVerySmall ? '14px 12px 14px 48px' : (isMobile ? '16px 16px 16px 52px' : '12px 16px 12px 44px'),
                      color: 'var(--text-primary)',
                      background: 'var(--bg-tertiary)',
                      border: '2px solid var(--border-light)',
                      borderRadius: '12px',
                      fontSize: '16px',
                      fontFamily: 'Source Serif Pro, Georgia, serif',
                      outline: 'none',
                      transition: 'all 0.3s ease',
                      opacity: isLoading ? 0.5 : 1
                    }}
                    placeholder="Enter your password"
                  />
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
                      background: error.includes('expired') || error.includes('New confirmation') 
                        ? 'rgba(34, 197, 94, 0.1)' 
                        : 'rgba(239, 68, 68, 0.1)',
                      border: `1px solid ${error.includes('expired') || error.includes('New confirmation')
                        ? 'rgba(34, 197, 94, 0.3)'
                        : 'rgba(239, 68, 68, 0.3)'}`,
                      backdropFilter: 'blur(10px)'
                    }}
                  >
                    <div style={{
                      fontSize: '14px',
                      color: error.includes('expired') || error.includes('New confirmation')
                        ? '#16a34a'
                        : 'var(--error-text)',
                      fontWeight: '600',
                      fontFamily: 'Source Serif Pro, Georgia, serif',
                      marginBottom: error.includes('expired') ? '12px' : '0'
                    }}>{error}</div>
                    {error.includes('expired') && (
                      <button
                        type="button"
                        onClick={() => {
                          const email = (document.getElementById('email') as HTMLInputElement)?.value;
                          if (email) {
                            handleResendConfirmation(email);
                          } else {
                            setError('Please enter your email address first');
                          }
                        }}
                        disabled={resendingEmail}
                        style={{
                          marginTop: '8px',
                          padding: '8px 16px',
                          background: 'var(--accent-primary)',
                          color: 'white',
                          border: 'none',
                          borderRadius: '8px',
                          fontSize: '13px',
                          fontWeight: '600',
                          cursor: resendingEmail ? 'not-allowed' : 'pointer',
                          opacity: resendingEmail ? 0.6 : 1,
                          fontFamily: 'Source Serif Pro, Georgia, serif'
                        }}
                      >
                        {resendingEmail ? 'Sending...' : 'Resend Confirmation Email'}
                      </button>
                    )}
                  </AccessibleWrapper>
                </motion.div>
              )}

              {/* Premium Submit Button */}
              <motion.button
                type="submit"
                disabled={isLoading}
                whileHover={{ 
                  scale: isLoading ? 1 : 1.02,
                  boxShadow: isLoading ? undefined : '0 4px 6px var(--shadow-soft), 0 10px 25px var(--shadow-medium)',
                  y: isLoading ? 0 : -3
                }}
                whileTap={{ scale: isLoading ? 1 : 0.98 }}
                style={{
                  width: '100%',
                  padding: '16px 32px',
                  background: 'var(--accent-primary)',
                  color: 'var(--bg-primary)',
                  border: 'none',
                  borderRadius: '16px',
                  fontSize: '1.1rem',
                  fontWeight: '800',
                  fontFamily: 'Source Serif Pro, Georgia, serif',
                  cursor: isLoading ? 'not-allowed' : 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '8px',
                  position: 'relative',
                  overflow: 'hidden',
                  transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                  boxShadow: '0 4px 6px var(--shadow-soft), 0 10px 25px var(--shadow-medium)',
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
                        border: '2px solid var(--bg-primary)',
                        borderTop: '2px solid transparent',
                        borderRadius: '50%'
                      }}
                    />
                    <span style={{ zIndex: 2 }}>Signing in...</span>
                  </>
                ) : (
                  <span style={{
                    zIndex: 2,
                    color: 'var(--bg-primary)'
                  }}>Sign in</span>
                )}
              </motion.button>

              {/* Premium Signup Link */}
              <div style={{ textAlign: 'center', marginTop: '8px' }}>
                <p style={{
                  fontSize: '14px',
                  color: 'var(--text-secondary)',
                  fontFamily: 'Source Serif Pro, Georgia, serif'
                }}>
                  Don't have an account?{' '}
                  <Link
                    href="/auth/signup"
                    style={{
                      fontWeight: '600',
                      color: 'var(--accent-primary)',
                      textDecoration: 'none',
                      transition: 'all 0.3s ease'
                    }}
                    className="hover:underline focus:outline-none focus:underline"
                  >
                    Sign up
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

export default function LoginPage() {
  return (
    <Suspense fallback={
      <div className="page-container min-h-screen bg-[var(--bg-primary)] flex items-center justify-center">
        <div style={{ color: 'var(--text-primary)' }}>Loading...</div>
      </div>
    }>
      <LoginPageContent />
    </Suspense>
  );
}