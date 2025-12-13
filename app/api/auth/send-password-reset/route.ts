import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

/**
 * POST /api/auth/send-password-reset
 *
 * Sends password reset email using Supabase's built-in resetPasswordForEmail.
 * Simple, reliable, and uses Supabase's email templates.
 */
export async function POST(request: NextRequest) {
  const startTime = Date.now();

  try {
    console.log('[send-password-reset] 🔐 Received password reset request');
    const { email } = await request.json();

    if (!email || typeof email !== 'string') {
      console.error('[send-password-reset] ❌ Email is required');
      return NextResponse.json(
        { error: 'Email is required' },
        { status: 400 }
      );
    }

    console.log('[send-password-reset] 📧 Sending reset email to:', email);

    const supabase = await createClient();

    // Get app URL for redirect
    const appUrl = process.env.NEXT_PUBLIC_APP_URL ||
                   process.env.NEXT_PUBLIC_VERCEL_URL ||
                   'https://bookbridge.app';

    // Use Supabase's built-in password reset method
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${appUrl}/auth/reset-password/confirm`,
    });

    if (error) {
      console.error('[send-password-reset] ❌ Failed to send reset email:', error);
      return NextResponse.json(
        {
          error: 'Failed to send password reset email',
          details: error.message
        },
        { status: 500 }
      );
    }

    const duration = Date.now() - startTime;
    console.log('[send-password-reset] ✅ Password reset email sent successfully', `(${duration}ms)`);

    return NextResponse.json(
      { success: true, message: 'Password reset email sent' },
      { status: 200 }
    );

  } catch (error) {
    const duration = Date.now() - startTime;
    console.error('[send-password-reset] ❌ Fatal error after', duration, 'ms:', error);
    return NextResponse.json(
      {
        error: 'Failed to send password reset email',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

