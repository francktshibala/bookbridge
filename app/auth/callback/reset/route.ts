import { createClient } from '@/lib/supabase/server';
import { NextRequest, NextResponse } from 'next/server';
import { mapAuthError } from '@/lib/utils/auth-errors';

// This route must be dynamic because it uses searchParams
export const dynamic = 'force-dynamic';

/**
 * Dedicated Password Reset Callback Route
 *
 * This route ONLY handles password reset flows.
 * Email verification uses /auth/callback instead.
 *
 * Why separate route?
 * - Eliminates need for password reset detection logic
 * - If this route is hit, it's ALWAYS a password reset
 * - No query params lost in redirect chain
 */

/**
 * Server-side PostHog event tracking for password reset
 */
async function trackPasswordResetCompletedServer(userId: string, email?: string) {
  const posthogKey = process.env.NEXT_PUBLIC_POSTHOG_KEY;
  const posthogHost = process.env.NEXT_PUBLIC_POSTHOG_HOST || 'https://us.i.posthog.com';

  if (!posthogKey) {
    console.warn('[auth/callback/reset] ⚠️ PostHog key not configured - skipping password reset tracking');
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
        event: 'password_reset_completed',
        distinct_id: userId,
        properties: {
          user_id: userId,
          email: email ? email.substring(0, 3) + '***' : undefined,
          timestamp: new Date().toISOString(),
        },
      }),
    });

    if (!response.ok) {
      console.error('[auth/callback/reset] ❌ PostHog tracking failed:', response.status, response.statusText);
    } else {
      console.log('[auth/callback/reset] 📊 PostHog: Tracked password_reset_completed event for user:', userId);
    }
  } catch (error) {
    console.error('[auth/callback/reset] ❌ PostHog tracking error:', error);
    // Don't throw - tracking failure shouldn't break auth flow
  }
}

export async function GET(request: NextRequest) {
  const requestUrl = new URL(request.url);
  const code = requestUrl.searchParams.get('code');
  const error = requestUrl.searchParams.get('error');
  const errorDescription = requestUrl.searchParams.get('error_description');

  console.log('[auth/callback/reset] 🔐 Password reset callback received:', {
    code: code ? 'present' : 'missing',
    error,
    errorDescription,
    origin: requestUrl.origin,
  });

  // Get base URL for redirects
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || requestUrl.origin;

  // Handle errors (expired token, invalid link, etc.)
  if (error) {
    console.error('[auth/callback/reset] ❌ Password reset error:', error, errorDescription);

    // Map error to user-friendly message
    const authError = mapAuthError(errorDescription || error);

    // Always redirect to reset password page with error
    return NextResponse.redirect(
      `${baseUrl}/auth/reset-password?error=${encodeURIComponent(authError.errorType)}&message=${encodeURIComponent(authError.userMessage)}`
    );
  }

  // Handle password reset code exchange
  if (code) {
    const supabase = await createClient();

    try {
      const { data, error: exchangeError } = await supabase.auth.exchangeCodeForSession(code);

      if (exchangeError) {
        console.error('[auth/callback/reset] ❌ Error exchanging code for session:', exchangeError);

        // Map error to user-friendly message
        const authError = mapAuthError(exchangeError.message || 'Unknown error');

        // Redirect back to reset password page with error
        return NextResponse.redirect(
          `${baseUrl}/auth/reset-password?error=${encodeURIComponent(authError.errorType)}&message=${encodeURIComponent(authError.userMessage)}`
        );
      }

      if (data?.user) {
        console.log('[auth/callback/reset] ✅ Password reset session created:', {
          userId: data.user.id,
          email: data.user.email,
        });

        // Track password reset completion (non-blocking)
        trackPasswordResetCompletedServer(data.user.id, data.user.email).catch(err => {
          console.error('[auth/callback/reset] PostHog tracking error (non-blocking):', err);
        });

        // Redirect to password reset confirmation page
        const resetUrl = `${baseUrl}/auth/reset-password/confirm`;
        console.log('[auth/callback/reset] 🔗 Redirecting to password reset confirmation:', resetUrl);
        return NextResponse.redirect(resetUrl);
      } else {
        console.warn('[auth/callback/reset] ⚠️ No user data after code exchange');
        return NextResponse.redirect(
          `${baseUrl}/auth/reset-password?error=no_user_data&message=${encodeURIComponent('Unable to verify reset link. Please try again.')}`
        );
      }
    } catch (err) {
      console.error('[auth/callback/reset] ❌ Unexpected error:', err);
      return NextResponse.redirect(
        `${baseUrl}/auth/reset-password?error=unexpected_error&message=${encodeURIComponent('Something went wrong. Please try again.')}`
      );
    }
  }

  // No code provided - redirect to reset password page
  console.warn('[auth/callback/reset] ⚠️ No code provided in callback');
  return NextResponse.redirect(
    `${baseUrl}/auth/reset-password?error=missing_code&message=${encodeURIComponent('Invalid reset link. Please request a new one.')}`
  );
}
