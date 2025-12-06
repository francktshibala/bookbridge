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
import { trackEvent, trackLoginError } from '@/lib/analytics/posthog';
import { mapAuthError } from '@/lib/utils/auth-errors';
import posthog from 'posthog-js';
import type { Session } from '@supabase/supabase-js';

function LoginPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { announceToScreenReader } = useAccessibility();
  const { isMobile, windowWidth } = useIsMobile();
  const isVerySmall = windowWidth < 375; // iPhone SE and smaller
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [resendingEmail, setResendingEmail] = useState(false);

  const logAuthFlow = (message: string, details?: Record<string, unknown>) => {
    if (details) {
      console.log(`[Login] ${message}`, details);
      return;
    }
    console.log(`[Login] ${message}`);
  };

  const maskEmail = (value: string) => {
    if (!value) return 'unknown';
    const [local, domain] = value.split('@');
    if (!domain) {
      return `${local.slice(0, 2)}***`;
    }
    return `${local.slice(0, 2)}***@${domain}`;
  };

  const waitForStableSession = async () => {
    logAuthFlow('Ensuring Supabase session is ready before redirect');
    const initialSessionCheck = await supabase.auth.getSession();
    if (initialSessionCheck.data.session?.user) {
      logAuthFlow('Session already available immediately after login');
      return initialSessionCheck.data.session;
    }

    return new Promise<Session | null>((resolve) => {
      let resolved = false;
      let attempts = 0;
      let pollIntervalId: ReturnType<typeof setInterval> | null = null;
      let fallbackTimeoutId: ReturnType<typeof setTimeout> | null = null;
      let authSubscription: { unsubscribe: () => void } | null = null;

      const cleanup = () => {
        if (pollIntervalId) {
          clearInterval(pollIntervalId);
          pollIntervalId = null;
        }
        if (fallbackTimeoutId) {
          clearTimeout(fallbackTimeoutId);
          fallbackTimeoutId = null;
        }
        if (authSubscription) {
          authSubscription.unsubscribe();
          authSubscription = null;
        }
      };

      const finish = (session: Session | null, reason: string) => {
        if (resolved) return;
        resolved = true;
        cleanup();
        logAuthFlow(`Session wait resolved (${reason})`, { hasSession: !!session?.user });
        resolve(session);
      };

      const { data } = supabase.auth.onAuthStateChange((event, session) => {
        logAuthFlow('onAuthStateChange event received', { event, hasUser: !!session?.user });
        if ((event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED') && session?.user) {
          finish(session, `auth event ${event}`);
        }
      });
      authSubscription = data.subscription;

      pollIntervalId = setInterval(async () => {
        attempts += 1;
        const { data: sessionData } = await supabase.auth.getSession();
        const hasSession = !!sessionData.session?.user;
        logAuthFlow(`Session poll attempt ${attempts}`, { hasSession });
        if (hasSession || attempts >= 10) {
          finish(sessionData.session ?? null, hasSession ? 'poll success' : 'poll limit reached');
        }
      }, 150);

      fallbackTimeoutId = setTimeout(async () => {
        const { data: sessionData } = await supabase.auth.getSession();
        finish(sessionData.session ?? null, 'fallback timeout');
      }, 3000);
    });
  };

      // Read error from URL (e.g., from expired verification link)
  useEffect(() => {
    const urlError = searchParams.get('error');
    const urlMessage = searchParams.get('message');
    if (urlError || urlMessage) {
      // Map URL error to user-friendly message
      const mappedError = urlMessage ? { userMessage: urlMessage, errorType: urlError || 'unknown' } : mapAuthError(urlError || 'unknown');
      setError(mappedError.userMessage);
      if (mappedError.userMessage) {
        announceToScreenReader(mappedError.userMessage, 'assertive');
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
    const maskedEmail = maskEmail(email);

    logAuthFlow('Login form submitted', { email: maskedEmail });

    try {
      const { data: signInData, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        throw error;
      }

      logAuthFlow('signInWithPassword succeeded', {
        email: maskedEmail,
        hasSessionFromResponse: !!signInData?.session,
      });

      // Get user data to check if this is first login (Phase 5: Step 2)
      const { data: { user } } = await supabase.auth.getUser();
      logAuthFlow('Fetched user data after login', { hasUser: !!user });
      
      if (user) {
        // Check if this is the first login by checking Supabase user metadata
        const hasFirstLoginDate = user.user_metadata?.first_login_date;
        
        if (!hasFirstLoginDate) {
          // This is the first login - track first_login event
          const firstLoginDate = new Date().toISOString();
          
          trackEvent('first_login', {
            user_id: user.id,
            email: user.email ? user.email.substring(0, 3) + '***' : undefined,
            login_method: 'email',
            timestamp: firstLoginDate,
          });
          
          // Set user property in PostHog to prevent duplicate tracking
          if (typeof window !== 'undefined') {
            posthog.identify(user.id, {
              first_login_date: firstLoginDate,
              email: user.email ? user.email.substring(0, 3) + '***' : undefined,
            });
          }
          
          // Store in Supabase user metadata for future reference
          await supabase.auth.updateUser({
            data: {
              first_login_date: firstLoginDate,
            },
          });
        } else {
          // Subsequent login - track user_logged_in
          trackEvent('user_logged_in', {
            login_method: 'email',
            timestamp: new Date().toISOString(),
          });
        }
      } else {
        // Fallback: track user_logged_in if user data unavailable
        trackEvent('user_logged_in', {
          login_method: 'email',
          timestamp: new Date().toISOString(),
        });
      }

      announceToScreenReader('Login successful! Redirecting...');
      
      // Get redirectTo from URL or default to /catalog
      const redirectTo = searchParams.get('redirectTo') || '/catalog';
      logAuthFlow('Redirect requested after login', { redirectTo });

      await waitForStableSession();

      logAuthFlow('Session confirmed, performing redirect', { redirectTo });
      // Use window.location for full page reload to ensure auth state is refreshed
      window.location.href = redirectTo;
    } catch (error) {
      const authError = mapAuthError(error instanceof Error ? error : String(error));
      setError(authError.userMessage);
      logAuthFlow('Login failed', { email: maskedEmail, errorType: authError.errorType });
      
      // Track error in PostHog
      trackLoginError(
        authError.errorType,
        error instanceof Error ? error.message : String(error),
        authError.recoveryAction
      );
      
      announceToScreenReader(`Login failed: ${authError.userMessage}`, 'assertive');
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
                      color: error.includes('expired') || error.includes('New confirmation') || error.includes('verification link')
                        ? '#16a34a'
                        : 'var(--error-text)',
                      fontWeight: '600',
                      fontFamily: 'Source Serif Pro, Georgia, serif',
                      marginBottom: (error.includes('expired') || error.includes('verification link')) ? '12px' : '0'
                    }}>{error}</div>
                    {(error.includes('expired') || error.includes('verification link') || error.includes('verify your email')) && (
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

              {/* Forgot Password Link */}
              <div style={{ textAlign: 'right', marginTop: '8px', marginBottom: '24px' }}>
                <Link
                  href="/auth/reset-password"
                  style={{
                    fontSize: '14px',
                    color: 'var(--accent-primary)',
                    textDecoration: 'none',
                    fontFamily: 'Source Serif Pro, Georgia, serif',
                    fontWeight: '500',
                    transition: 'color 0.2s ease',
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.color = 'var(--accent-secondary)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.color = 'var(--accent-primary)';
                  }}
                >
                  Forgot password?
                </Link>
              </div>

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