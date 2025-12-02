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

  // Get base URL for redirects
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || requestUrl.origin;

  // Handle errors (expired token, invalid link, etc.)
  if (error) {
    console.error('Auth callback error:', error, errorDescription);
    
    // Special handling for expired OTP
    if (error === 'access_denied' && errorDescription?.includes('expired')) {
      return NextResponse.redirect(
        `${baseUrl}/auth/login?error=expired_link&message=${encodeURIComponent('Your verification link has expired. Please request a new confirmation email.')}`
      );
    }
    
    // Generic error handling
    const errorMsg = errorDescription || error;
    return NextResponse.redirect(
      `${baseUrl}/auth/login?error=${encodeURIComponent(errorMsg)}`
    );
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
        // Email verification tracking will happen in SimpleAuthProvider 
        // when the auth state change event fires (USER_UPDATED or SIGNED_IN)
        
        // Redirect based on type
        if (type === 'signup') {
          // New signup - redirect to library
          return NextResponse.redirect(`${baseUrl}/library?verified=true`);
        } else {
          // Email verification or other callback - redirect to library
          return NextResponse.redirect(`${baseUrl}/library?verified=true`);
        }
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

