'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { AccessibleWrapper } from '@/components/AccessibleWrapper';
import { useAccessibility } from '@/contexts/AccessibilityContext';
import { useIsMobile } from '@/hooks/useIsMobile';
import { supabase } from '@/lib/supabase/client';
import { ArrowLeft, Mail, Lock, User, CheckCircle } from 'lucide-react';
import Link from 'next/link';
import { trackSignupStarted, trackUserSignedUp, trackSignupAbandoned } from '@/lib/analytics/posthog';

export default function SignupPage() {
  const router = useRouter();
  const { announceToScreenReader } = useAccessibility();
  const { isMobile } = useIsMobile();
  const { windowWidth } = useIsMobile();
  const isVerySmall = windowWidth < 375; // iPhone SE and smaller
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [hasTrackedStarted, setHasTrackedStarted] = useState(false);

  // Track signup started on component mount
  useEffect(() => {
    if (!hasTrackedStarted) {
      trackSignupStarted('signup_page');
      setHasTrackedStarted(true);
    }
  }, [hasTrackedStarted]);

  // Track signup abandonment on unmount (user leaves page without completing)
  useEffect(() => {
    return () => {
      if (!success && hasTrackedStarted) {
        // Only track abandonment if user started but didn't complete
        trackSignupAbandoned('signup_page', 'page_unmount');
      }
    };
  }, [success, hasTrackedStarted]);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);

    const formData = new FormData(e.currentTarget);
    const email = formData.get('email') as string;
    const password = formData.get('password') as string;
    const name = formData.get('name') as string;

    try {
      // Better URL detection for email redirects
      // Priority: 1. Explicit env var, 2. Vercel URL, 3. Current origin (if production), 4. localhost fallback
      const getAppUrl = () => {
        // 1. Check explicit env var (highest priority - set in Render/Vercel)
        if (process.env.NEXT_PUBLIC_APP_URL) {
          return process.env.NEXT_PUBLIC_APP_URL;
        }
        
        // 2. Check Vercel URL (if deployed on Vercel)
        if (process.env.NEXT_PUBLIC_VERCEL_URL) {
          return `https://${process.env.NEXT_PUBLIC_VERCEL_URL}`;
        }
        
        // 3. Check if we're in production (not localhost)
        if (typeof window !== 'undefined') {
          const origin = window.location.origin;
          // If not localhost, use it (production)
          if (!origin.includes('localhost') && !origin.includes('127.0.0.1')) {
            return origin;
          }
        }
        
        // 4. Fallback to localhost for dev
        return 'http://localhost:3000';
      };
      
      const appUrl = getAppUrl();
      console.log('[Signup] Using redirect URL:', `${appUrl}/auth/callback?type=signup`);
      
      const { error, data } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            name: name,
          },
          emailRedirectTo: `${appUrl}/auth/callback?type=signup`,
        },
      });

      if (error) {
        // Track signup abandonment on error
        trackSignupAbandoned('signup_page', 'signup_submit_error');
        
        // Check if it's an email sending error (SMTP issue)
        // Supabase might fail to send email but account is still created
        if (error.message?.includes('email') || error.message?.includes('smtp') || error.message?.includes('confirmation')) {
          console.warn('[Signup] Email sending error, but account may have been created:', error);
          // Still show success - user can request new confirmation email
          setSuccess(true);
          announceToScreenReader('Account created! If you don\'t receive an email, please check your spam folder or request a new confirmation email from the login page.');
          return;
        }
        
        throw error;
      }

      // Track successful signup (Gate 1)
      trackUserSignedUp('signup_page', 'email', email);

      // Note: Supabase sends confirmation email automatically
      // Resend welcome email is optional and can be disabled to avoid duplicate emails
      // If you want to keep Resend email, uncomment below:
      /*
      try {
        await fetch('/api/auth/send-confirmation', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email, name }),
        });
      } catch (emailError) {
        // Log but don't fail signup - Supabase will still send its own email as fallback
        console.error('[Signup] Failed to send Resend confirmation email:', emailError);
      }
      */

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
      <div className="page-container min-h-screen bg-[var(--bg-primary)] text-[var(--text-primary)]">
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
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.5 }}
          >
            <motion.div
              style={{
                background: 'var(--bg-secondary)',
                borderRadius: '24px',
                boxShadow: '0 4px 6px var(--shadow-soft), 0 10px 25px var(--shadow-medium), 0 2px 4px var(--shadow-light)',
                border: '2px solid var(--border-light)',
                padding: isVerySmall ? '16px 8px' : (isMobile ? '24px 16px' : '40px'),
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
                  fontSize: isVerySmall ? '20px' : (isMobile ? '24px' : '2rem'),
                  fontWeight: '700',
                  color: 'var(--text-accent)',
                  marginBottom: '16px',
                  fontFamily: 'Playfair Display, serif'
                }}>
                  Account Created Successfully!
                </h1>
                
                <p style={{
                  fontSize: '16px',
                  color: 'var(--text-secondary)',
                  marginBottom: '32px',
                  lineHeight: '1.6',
                  fontFamily: 'Source Serif Pro, Georgia, serif'
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
                      background: 'var(--accent-primary)',
                      color: 'var(--bg-primary)',
                      textDecoration: 'none',
                      borderRadius: '16px',
                      fontSize: '1.1rem',
                      fontWeight: '700',
                      fontFamily: 'Source Serif Pro, Georgia, serif',
                      boxShadow: '0 8px 25px var(--shadow-medium)',
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
              Create your BookBridge account
            </h1>
            <p style={{
              fontSize: isVerySmall ? '14px' : (isMobile ? '16px' : '1.125rem'),
              color: 'var(--text-secondary)',
              fontFamily: 'Source Serif Pro, Georgia, serif',
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
            background: 'var(--bg-secondary)',
            borderRadius: '24px',
            boxShadow: '0 4px 6px var(--shadow-soft), 0 10px 25px var(--shadow-medium), 0 2px 4px var(--shadow-light)',
            border: '2px solid var(--border-light)',
            padding: isMobile ? '24px 16px' : '40px',
            backdropFilter: 'blur(10px)'
          }}
        >
          <AccessibleWrapper as="section" ariaLabelledBy="signup-form-heading">
            <h2 id="signup-form-heading" className="sr-only">
              Signup Form
            </h2>

            <form onSubmit={handleSubmit} style={{ 
              display: 'flex', 
              flexDirection: 'column', 
              gap: isVerySmall ? '16px' : '24px' 
            }}>
              {/* Premium Name Input */}
              <div>
                <label htmlFor="name" style={{
                  display: 'block',
                  fontSize: '14px',
                  fontWeight: '700',
                  color: 'var(--text-primary)',
                  marginBottom: '8px',
                  fontFamily: 'Source Serif Pro, Georgia, serif'
                }}>
                  Full Name
                </label>
                <div style={{ position: 'relative' }}>
                  <User className="w-5 h-5" style={{
                    position: 'absolute',
                    left: isVerySmall ? '14px' : (isMobile ? '16px' : '12px'),
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
                    autoComplete="new-password"
                    minLength={6}
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
                    placeholder="Create a password (min 6 characters)"
                    aria-describedby="password-help"
                  />
                </div>
                <div id="password-help" style={{
                  fontSize: '12px',
                  color: 'var(--text-secondary)',
                  marginTop: '6px',
                  opacity: 0.8,
                  fontFamily: 'Source Serif Pro, Georgia, serif'
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
                      fontFamily: 'Source Serif Pro, Georgia, serif'
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
                  boxShadow: isLoading ? undefined : '0 12px 40px var(--shadow-heavy), 0 0 0 1px rgba(255,255,255,0.1)',
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
                  boxShadow: '0 8px 25px var(--shadow-medium), inset 0 1px 0 rgba(255,255,255,0.2)',
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
                  fontFamily: 'Source Serif Pro, Georgia, serif'
                }}>
                  Already have an account?{' '}
                  <Link
                    href="/auth/login"
                    style={{
                      fontWeight: '600',
                      color: 'var(--accent-primary)',
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