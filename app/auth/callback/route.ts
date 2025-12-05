import { createClient } from '@/lib/supabase/server';
import { NextRequest, NextResponse } from 'next/server';

// This route must be dynamic because it uses searchParams
export const dynamic = 'force-dynamic';

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
    
    // Check if this is a password reset error (from URL type param or error context)
    const isPasswordReset = type === 'password_reset' || 
                            requestUrl.searchParams.get('type') === 'password_reset' ||
                            errorDescription?.toLowerCase().includes('password') ||
                            errorDescription?.toLowerCase().includes('reset');
    
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
          sessionType: data.session?.type,
        });
        
        // Detect password reset: Check URL type param OR session type OR recovery token
        // Supabase recovery sessions have type 'recovery' or we check URL param
        const isPasswordReset = type === 'password_reset' || 
                               data.session?.type === 'recovery' ||
                               requestUrl.searchParams.get('type') === 'password_reset';
        
        console.log('[auth/callback] 🔍 Password reset detection:', {
          urlType: type,
          sessionType: data.session?.type,
          isPasswordReset,
        });
        
        // Email verification tracking will happen in SimpleAuthProvider 
        // when the auth state change event fires (USER_UPDATED or SIGNED_IN)
        
        // Redirect based on type
        if (isPasswordReset) {
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

