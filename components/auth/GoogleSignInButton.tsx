'use client';

import { useState } from 'react';
import { supabase } from '@/lib/supabase/client';
import { trackEvent } from '@/lib/analytics/posthog';

interface GoogleSignInButtonProps {
  mode?: 'signin' | 'signup';
}

export default function GoogleSignInButton({ mode = 'signin' }: GoogleSignInButtonProps) {
  const [isLoading, setIsLoading] = useState(false);

  const handleGoogleSignIn = async () => {
    setIsLoading(true);

    trackEvent(mode === 'signup' ? 'google_signup_attempted' : 'google_signin_attempted', {
      timestamp: new Date().toISOString(),
    });

    const redirectTo = `${window.location.origin}/auth/callback`;

    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo },
    });

    if (error) {
      console.error('[GoogleSignIn] OAuth error:', error.message);
      setIsLoading(false);
    }
    // On success, browser redirects — no need to reset loading state
  };

  const label = mode === 'signup' ? 'Sign up with Google' : 'Continue with Google';

  return (
    <button
      type="button"
      onClick={handleGoogleSignIn}
      disabled={isLoading}
      style={{
        width: '100%',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: '12px',
        padding: '13px 24px',
        background: 'var(--bg-primary)',
        color: 'var(--text-primary)',
        border: '2px solid var(--border-light)',
        borderRadius: '12px',
        fontSize: '15px',
        fontWeight: '600',
        fontFamily: 'Source Serif Pro, Georgia, serif',
        cursor: isLoading ? 'not-allowed' : 'pointer',
        opacity: isLoading ? 0.7 : 1,
        transition: 'all 0.2s ease',
        boxShadow: '0 1px 3px var(--shadow-soft)',
      }}
      onMouseEnter={(e) => {
        if (!isLoading) {
          e.currentTarget.style.borderColor = 'var(--accent-primary)';
          e.currentTarget.style.boxShadow = '0 2px 8px var(--shadow-medium)';
        }
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.borderColor = 'var(--border-light)';
        e.currentTarget.style.boxShadow = '0 1px 3px var(--shadow-soft)';
      }}
      aria-label={label}
    >
      {isLoading ? (
        <div
          style={{
            width: '20px',
            height: '20px',
            border: '2px solid var(--border-light)',
            borderTop: '2px solid var(--accent-primary)',
            borderRadius: '50%',
            animation: 'spin 0.8s linear infinite',
          }}
        />
      ) : (
        /* Google "G" logo SVG */
        <svg width="20" height="20" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
          <path
            d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
            fill="#4285F4"
          />
          <path
            d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
            fill="#34A853"
          />
          <path
            d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z"
            fill="#FBBC05"
          />
          <path
            d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
            fill="#EA4335"
          />
        </svg>
      )}
      <span>{isLoading ? 'Redirecting...' : label}</span>
    </button>
  );
}
