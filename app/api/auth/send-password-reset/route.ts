import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { sendPasswordResetEmail } from '@/lib/services/auth-email-service';

// Force Node runtime (required for Resend)
export const runtime = 'nodejs';

/**
 * POST /api/auth/send-password-reset
 *
 * Generates a password reset link via Supabase Admin API,
 * then sends it via Resend (same pattern as signup confirmation).
 */
export async function POST(request: NextRequest) {
  const startTime = Date.now();

  try {
    console.log('[send-password-reset] 🔐 Received password reset request');
    const { email } = await request.json();

    if (!email || typeof email !== 'string') {
      return NextResponse.json({ error: 'Email is required' }, { status: 400 });
    }

    console.log('[send-password-reset] 📧 Generating reset link for:', email);

    const supabaseAdmin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://bookbridge.app';

    // Generate recovery link using Admin API
    const { data: linkData, error: linkError } = await supabaseAdmin.auth.admin.generateLink({
      type: 'recovery',
      email,
      options: {
        redirectTo: `${appUrl}/auth/reset-password/confirm`,
      },
    });

    if (linkError || !linkData?.properties?.action_link) {
      console.error('[send-password-reset] ❌ Failed to generate reset link:', linkError);
      return NextResponse.json(
        { error: 'Failed to generate password reset link', details: linkError?.message },
        { status: 500 }
      );
    }

    const resetLink = linkData.properties.action_link;
    console.log('[send-password-reset] ✅ Reset link generated, sending via Resend...');

    // Send via Resend (same as signup confirmation)
    await sendPasswordResetEmail({ email, resetLink });

    const duration = Date.now() - startTime;
    console.log('[send-password-reset] ✅ Password reset email sent successfully', `(${duration}ms)`);

    return NextResponse.json({ success: true, message: 'Password reset email sent' }, { status: 200 });

  } catch (error) {
    const duration = Date.now() - startTime;
    console.error('[send-password-reset] ❌ Fatal error after', duration, 'ms:', error);
    return NextResponse.json(
      {
        error: 'Failed to send password reset email',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
