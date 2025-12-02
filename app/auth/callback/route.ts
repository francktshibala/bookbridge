import { createClient } from '@/lib/supabase/server';
import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  const requestUrl = new URL(request.url);
  const code = requestUrl.searchParams.get('code');
  const type = requestUrl.searchParams.get('type');
  const error = requestUrl.searchParams.get('error');
  const errorDescription = requestUrl.searchParams.get('error_description');

  // Handle errors
  if (error) {
    console.error('Auth callback error:', error, errorDescription);
    return NextResponse.redirect(
      new URL(`/auth/login?error=${encodeURIComponent(errorDescription || error)}`, request.url)
    );
  }

  // Handle email verification
  if (code) {
    const supabase = await createClient();
    
    try {
      const { data, error: exchangeError } = await supabase.auth.exchangeCodeForSession(code);
      
      if (exchangeError) {
        console.error('Error exchanging code for session:', exchangeError);
        return NextResponse.redirect(
          new URL(`/auth/login?error=${encodeURIComponent(exchangeError.message)}`, request.url)
        );
      }

      if (data?.user) {
        // Email verification tracking will happen in SimpleAuthProvider 
        // when the auth state change event fires (USER_UPDATED or SIGNED_IN)
        
        // Redirect based on type
        if (type === 'signup') {
          // New signup - redirect to library
          return NextResponse.redirect(new URL('/library?verified=true', request.url));
        } else {
          // Email verification or other callback - redirect to library
          return NextResponse.redirect(new URL('/library?verified=true', request.url));
        }
      }
    } catch (err) {
      console.error('Unexpected error in auth callback:', err);
      return NextResponse.redirect(
        new URL('/auth/login?error=unexpected_error', request.url)
      );
    }
  }

  // No code provided - redirect to login
  return NextResponse.redirect(new URL('/auth/login', request.url));
}

