'use client';

import React, { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { motion } from 'framer-motion';
import { AccessibleWrapper } from '@/components/AccessibleWrapper';
import { useAccessibility } from '@/contexts/AccessibilityContext';
import { useIsMobile } from '@/hooks/useIsMobile';
import { supabase } from '@/lib/supabase/client';
import { ArrowLeft, Lock, CheckCircle } from 'lucide-react';
import Link from 'next/link';
import { trackEvent } from '@/lib/analytics/posthog';

function ConfirmResetPasswordPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { announceToScreenReader } = useAccessibility();
  const { isMobile, windowWidth } = useIsMobile();
  const isVerySmall = windowWidth < 375;
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [hasSession, setHasSession] = useState(false);

  // Check if user has valid session from password reset link
  useEffect(() => {
    let mounted = true;
    let checkInterval: NodeJS.Timeout | undefined;

    const checkForSession = async () => {
      const { data: { session } } = await supabase.auth.getSession();

      if (!mounted) return;

      if (session) {
        console.log('[ConfirmResetPassword] ✅ Valid session found:', session.user.id);
        setHasSession(true);
        setError(null);
        if (checkInterval) {
          clearInterval(checkInterval);
        }
      }
      // No timeout - keep checking indefinitely until session appears
    };

    // Check immediately
    checkForSession();

    // Then check every 200ms indefinitely (no max attempts)
    checkInterval = setInterval(checkForSession, 200);

    // Cleanup
    return () => {
      mounted = false;
      if (checkInterval) {
        clearInterval(checkInterval);
      }
    };
  }, [announceToScreenReader]);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);

    const formData = new FormData(e.currentTarget);
    const password = formData.get('password') as string;
    const confirmPassword = formData.get('confirmPassword') as string;

    // Validate passwords match
    if (password !== confirmPassword) {
      setError('Passwords do not match');
      announceToScreenReader('Passwords do not match', 'assertive');
      setIsLoading(false);
      return;
    }

    // Validate password strength
    if (password.length < 6) {
      setError('Password must be at least 6 characters long');
      announceToScreenReader('Password must be at least 6 characters long', 'assertive');
      setIsLoading(false);
      return;
    }

    try {
      // Get current session
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session) {
        throw new Error('No active session. Please request a new password reset link.');
      }

      console.log('[ConfirmResetPassword] 🔐 Updating password for user:', session.user.id);

      // Update password using Supabase
      const { error: updateError } = await supabase.auth.updateUser({
        password: password,
      });

      if (updateError) {
        throw updateError;
      }

      console.log('[ConfirmResetPassword] ✅ Password updated successfully');

      // Track password reset completion
      trackEvent('password_reset_completed', {
        userId: session.user.id,
        email: session.user.email ? session.user.email.substring(0, 3) + '***' : undefined,
        timestamp: new Date().toISOString(),
      });

      setSuccess(true);
      announceToScreenReader('Password reset successfully! Redirecting to login...');

      // Redirect to login after 2 seconds
      setTimeout(() => {
        router.push('/auth/login?password_reset=success');
      }, 2000);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to reset password';
      setError(errorMessage);
      announceToScreenReader(`Password reset failed: ${errorMessage}`, 'assertive');
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
                  boxShadow: '0 4px 6px var(--shadow-soft), 0 10px 25px var(--shadow-medium)',
                  border: '2px solid var(--border-light)',
                  padding: isVerySmall ? '16px 8px' : (isMobile ? '24px 16px' : '40px'),
                  backdropFilter: 'blur(10px)',
                  textAlign: 'center'
                }}
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
                  Password Reset Successful!
                </h1>
                
                <p style={{
                  fontSize: isVerySmall ? '14px' : (isMobile ? '15px' : '1rem'),
                  color: 'var(--text-secondary)',
                  marginBottom: '32px',
                  lineHeight: '1.6',
                  fontFamily: 'Source Serif Pro, Georgia, serif'
                }}>
                  Your password has been successfully reset. Redirecting to login...
                </p>
              </motion.div>
            </motion.div>
          </div>
        </div>
      </div>
    );
  }

  if (!hasSession && error) {
    return (
      <div className="page-container min-h-screen bg-[var(--bg-primary)] text-[var(--text-primary)]">
        <div className="relative flex items-center justify-center min-h-screen" style={{
          padding: isVerySmall ? '4px 0px' : (isMobile ? '8px 4px' : '48px 48px')
        }}>
          <div className="w-full max-w-md mx-auto">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
            >
              <Link
                href="/auth/reset-password"
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '8px',
                  marginBottom: '24px',
                  color: 'var(--text-secondary)',
                  textDecoration: 'none',
                  fontSize: '14px',
                  fontFamily: 'Source Serif Pro, Georgia, serif',
                  fontWeight: '500'
                }}
              >
                <ArrowLeft className="w-4 h-4" />
                Back to Reset Password
              </Link>

              <motion.div
                style={{
                  background: 'var(--bg-secondary)',
                  borderRadius: '24px',
                  boxShadow: '0 4px 6px var(--shadow-soft), 0 10px 25px var(--shadow-medium)',
                  border: '2px solid var(--border-light)',
                  padding: isVerySmall ? '16px 8px' : (isMobile ? '24px 16px' : '40px'),
                  backdropFilter: 'blur(10px)',
                  textAlign: 'center'
                }}
              >
                <h1 style={{
                  fontSize: isVerySmall ? '20px' : (isMobile ? '24px' : '2rem'),
                  fontWeight: '700',
                  color: 'var(--text-accent)',
                  marginBottom: '16px',
                  fontFamily: 'Playfair Display, serif'
                }}>
                  Invalid Reset Link
                </h1>
                
                <p style={{
                  fontSize: isVerySmall ? '14px' : (isMobile ? '15px' : '1rem'),
                  color: 'var(--text-secondary)',
                  marginBottom: '24px',
                  lineHeight: '1.6',
                  fontFamily: 'Source Serif Pro, Georgia, serif'
                }}>
                  {error}
                </p>

                <Link
                  href="/auth/reset-password"
                  style={{
                    display: 'inline-block',
                    padding: '12px 24px',
                    background: 'var(--accent-primary)',
                    color: 'var(--bg-primary)',
                    textDecoration: 'none',
                    borderRadius: '12px',
                    fontSize: '16px',
                    fontWeight: '600',
                    fontFamily: 'Source Serif Pro, Georgia, serif',
                    transition: 'all 0.3s ease'
                  }}
                >
                  Request New Reset Link
                </Link>
              </motion.div>
            </motion.div>
          </div>
        </div>
      </div>
    );
  }

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
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
          >
            {/* Back Button */}
            <Link
              href="/auth/login"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '8px',
                marginBottom: '24px',
                color: 'var(--text-secondary)',
                textDecoration: 'none',
                fontSize: '14px',
                fontFamily: 'Source Serif Pro, Georgia, serif',
                fontWeight: '500',
                transition: 'color 0.2s ease'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.color = 'var(--accent-primary)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.color = 'var(--text-secondary)';
              }}
            >
              <ArrowLeft className="w-4 h-4" />
              Back to Login
            </Link>

            {/* Premium Card Container */}
            <motion.div
              style={{
                background: 'var(--bg-secondary)',
                borderRadius: '24px',
                boxShadow: '0 4px 6px var(--shadow-soft), 0 10px 25px var(--shadow-medium)',
                border: '2px solid var(--border-light)',
                padding: isVerySmall ? '16px 8px' : (isMobile ? '24px 16px' : '40px'),
                backdropFilter: 'blur(10px)'
              }}
            >
              {/* Header */}
              <div style={{ textAlign: 'center', marginBottom: '32px' }}>
                <h1 style={{
                  fontSize: isVerySmall ? '24px' : (isMobile ? '28px' : '2.5rem'),
                  fontWeight: '700',
                  color: 'var(--text-accent)',
                  marginBottom: '8px',
                  fontFamily: 'Playfair Display, serif',
                  letterSpacing: '-0.02em'
                }}>
                  Set New Password
                </h1>
                <p style={{
                  fontSize: isVerySmall ? '14px' : (isMobile ? '15px' : '1rem'),
                  color: 'var(--text-secondary)',
                  fontFamily: 'Source Serif Pro, Georgia, serif',
                  lineHeight: '1.6'
                }}>
                  Enter your new password below.
                </p>
              </div>

              <form onSubmit={handleSubmit}>
                {/* New Password Input */}
                <div style={{ marginBottom: '20px' }}>
                  <label htmlFor="password" style={{
                    display: 'block',
                    fontSize: '14px',
                    fontWeight: '700',
                    color: 'var(--text-primary)',
                    marginBottom: '8px',
                    fontFamily: 'Source Serif Pro, Georgia, serif'
                  }}>
                    New Password
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
                      required
                      disabled={isLoading}
                      minLength={6}
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
                      placeholder="Enter new password"
                    />
                  </div>
                </div>

                {/* Confirm Password Input */}
                <div style={{ marginBottom: '24px' }}>
                  <label htmlFor="confirmPassword" style={{
                    display: 'block',
                    fontSize: '14px',
                    fontWeight: '700',
                    color: 'var(--text-primary)',
                    marginBottom: '8px',
                    fontFamily: 'Source Serif Pro, Georgia, serif'
                  }}>
                    Confirm Password
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
                      id="confirmPassword"
                      name="confirmPassword"
                      type="password"
                      autoComplete="new-password"
                      required
                      disabled={isLoading}
                      minLength={6}
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
                      placeholder="Confirm new password"
                    />
                  </div>
                </div>

                {/* Error Message */}
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
                        backdropFilter: 'blur(10px)',
                        marginBottom: '24px'
                      }}
                    >
                      <div style={{
                        fontSize: '14px',
                        color: '#dc2626',
                        fontWeight: '600',
                        fontFamily: 'Source Serif Pro, Georgia, serif'
                      }}>{error}</div>
                    </AccessibleWrapper>
                  </motion.div>
                )}

                {/* Submit Button */}
                <motion.button
                  type="submit"
                  disabled={isLoading || !hasSession}
                  whileHover={{ 
                    scale: (isLoading || !hasSession) ? 1 : 1.02,
                    boxShadow: (isLoading || !hasSession) ? undefined : '0 4px 6px var(--shadow-soft), 0 10px 25px var(--shadow-medium)',
                    y: (isLoading || !hasSession) ? 0 : -3
                  }}
                  whileTap={{ scale: (isLoading || !hasSession) ? 1 : 0.98 }}
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
                    cursor: (isLoading || !hasSession) ? 'not-allowed' : 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '8px',
                    transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                    boxShadow: '0 4px 6px var(--shadow-soft), 0 10px 25px var(--shadow-medium)',
                    opacity: (isLoading || !hasSession) ? 0.7 : 1
                  }}
                >
                  {isLoading ? 'Resetting Password...' : 'Reset Password'}
                </motion.button>
              </form>
            </motion.div>
          </motion.div>
        </div>
      </div>
    </div>
  );
}

export default function ConfirmResetPasswordPage() {
  return (
    <Suspense fallback={
      <div className="page-container min-h-screen bg-[var(--bg-primary)] flex items-center justify-center">
        <div style={{ color: 'var(--text-primary)', fontFamily: 'Source Serif Pro, Georgia, serif' }}>
          Loading...
        </div>
      </div>
    }>
      <ConfirmResetPasswordPageContent />
    </Suspense>
  );
}

