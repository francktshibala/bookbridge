import { detectPasswordResetIntent } from '@/lib/auth/password-reset-intent';
import { createClient } from '@/lib/supabase/server';
import { NextRequest, NextResponse } from 'next/server';

// This route must be dynamic because it uses searchParams
export const dynamic = 'force-dynamic';

/**
 * Server-side PostHog event tracking
 * Uses PostHog HTTP API for server-side routes
 */
async function trackEmailVerifiedServer(userId: string, email?: string) {
  const posthogKey = process.env.NEXT_PUBLIC_POSTHOG_KEY;
  const posthogHost = process.env.NEXT_PUBLIC_POSTHOG_HOST || 'https://us.i.posthog.com';

  if (!posthogKey) {
    console.warn('[auth/callback] ⚠️ PostHog key not configured - skipping email verification tracking');
    return;
  }

  try {
    const response = await fetch(`${posthogHost}/capture/`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        api_key: posthogKey,
        event: 'email_verified',
        distinct_id: userId,
        properties: {
          user_id: userId,
          email: email ? email.substring(0, 3) + '***' : undefined,
          timestamp: new Date().toISOString(),
        },
      }),
    });

    if (!response.ok) {
      console.error('[auth/callback] ❌ PostHog tracking failed:', response.status, response.statusText);
    } else {
      console.log('[auth/callback] 📊 PostHog: Tracked email_verified event for user:', userId);
    }
  } catch (error) {
    console.error('[auth/callback] ❌ PostHog tracking error:', error);
    // Don't throw - tracking failure shouldn't break auth flow
  }
}

export async function GET(request: NextRequest) {
  const requestUrl = new URL(request.url);
  const code = requestUrl.searchParams.get('code');
  const type = requestUrl.searchParams.get('type');
  const error = requestUrl.searchParams.get('error');
  const errorDescription = requestUrl.searchParams.get('error_description');

  console.log('[auth/callback] 📧 Callback received:', {
    code: code ? 'present' : 'missing',
    type,
    error,
    errorDescription,
    origin: requestUrl.origin,
    fullUrl: requestUrl.toString(),
  });

  // Get base URL for redirects
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || requestUrl.origin;
  console.log('[auth/callback] 🔗 Base URL for redirects:', baseUrl);

  // Handle errors (expired token, invalid link, etc.)
  if (error) {
    console.error('Auth callback error:', error, errorDescription);

    const passwordResetDetection = detectPasswordResetIntent({
      queryType: type,
      errorDescription,
    });
    console.log('[auth/callback] ⚠️ Password reset detection (error):', {
      ...passwordResetDetection.details,
    });
    const isPasswordReset = passwordResetDetection.isPasswordReset;
    
    // Special handling for expired OTP
    if (error === 'access_denied' && errorDescription?.includes('expired')) {
      if (isPasswordReset) {
        // Password reset link expired - redirect to reset password page
        return NextResponse.redirect(
          `${baseUrl}/auth/reset-password?error=expired_link&message=${encodeURIComponent('Your password reset link has expired. Please request a new one.')}`
        );
      } else {
        // Signup/verification link expired - redirect to login
        return NextResponse.redirect(
          `${baseUrl}/auth/login?error=expired_link&message=${encodeURIComponent('Your verification link has expired. Please request a new confirmation email.')}`
        );
      }
    }
    
    // Generic error handling
    const errorMsg = errorDescription || error;
    if (isPasswordReset) {
      // Password reset error - redirect to reset password page
      return NextResponse.redirect(
        `${baseUrl}/auth/reset-password?error=${encodeURIComponent(errorMsg)}&message=${encodeURIComponent('Invalid or expired password reset link. Please request a new one.')}`
      );
    } else {
      // Other auth errors - redirect to login
      return NextResponse.redirect(
        `${baseUrl}/auth/login?error=${encodeURIComponent(errorMsg)}`
      );
    }
  }

  // Handle email verification
  if (code) {
    const supabase = await createClient();
    
    try {
      const { data, error: exchangeError } = await supabase.auth.exchangeCodeForSession(code);
      
      if (exchangeError) {
        console.error('Error exchanging code for session:', exchangeError);
        
        // Handle expired code specifically
        if (exchangeError.message?.includes('expired') || exchangeError.message?.includes('invalid')) {
          return NextResponse.redirect(
            `${baseUrl}/auth/login?error=expired_link&message=${encodeURIComponent('Your verification link has expired. Please request a new confirmation email.')}`
          );
        }
        
        return NextResponse.redirect(
          `${baseUrl}/auth/login?error=${encodeURIComponent(exchangeError.message)}`
        );
      }

      if (data?.user) {
        console.log('[auth/callback] ✅ Session created successfully:', {
          userId: data.user.id,
          email: data.user.email,
          type,
          fullUrl: requestUrl.toString(),
        });

        const passwordResetDetection = detectPasswordResetIntent({
          queryType: type,
          user: data.user,
        });

        console.log('[auth/callback] 🔍 Password reset detection (success):', {
          ...passwordResetDetection.details,
          userId: data.user.id,
        });

        // Track email verification (Phase 3: Track Email Verification)
        // Only track if this is NOT a password reset flow
        if (!passwordResetDetection.isPasswordReset) {
          console.log('[auth/callback] 📊 Tracking email verification for user:', data.user.id);
          await trackEmailVerifiedServer(data.user.id, data.user.email);
        }
        
        // Redirect based on type
        if (passwordResetDetection.isPasswordReset) {
          // Password reset - redirect to confirm password page
          const resetUrl = `${baseUrl}/auth/reset-password/confirm`;
          console.log('[auth/callback] 🔗 Redirecting to password reset confirmation:', resetUrl);
          return NextResponse.redirect(resetUrl);
        } else {
          // Signup or email verification - redirect to catalog
          const redirectUrl = `${baseUrl}/catalog?verified=true`;
          console.log('[auth/callback] 🔗 Redirecting to:', redirectUrl);
          return NextResponse.redirect(redirectUrl);
        }
      } else {
        console.warn('[auth/callback] ⚠️ No user data after code exchange');
        return NextResponse.redirect(`${baseUrl}/auth/login?error=no_user_data`);
      }
    } catch (err) {
      console.error('Unexpected error in auth callback:', err);
      return NextResponse.redirect(
        `${baseUrl}/auth/login?error=unexpected_error`
      );
    }
  }

  // No code provided - redirect to login
  return NextResponse.redirect(`${baseUrl}/auth/login`);
}

