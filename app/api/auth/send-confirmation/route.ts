import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { sendSignupConfirmationEmail } from '@/lib/services/auth-email-service';

// Force Node runtime (Resend requires Node, not Edge)
export const runtime = 'nodejs';

/**
 * POST /api/auth/send-confirmation
 *
 * Sends signup confirmation email via Resend (better deliverability than Supabase default).
 * Called after Supabase signup to send a Resend email with the confirmation link.
 */
export async function POST(request: NextRequest) {
  try {
    const { email, name } = await request.json();

    if (!email || typeof email !== 'string') {
      return NextResponse.json(
        { error: 'Email is required' },
        { status: 400 }
      );
    }

    // Create Supabase admin client to generate confirmation link
    const supabaseAdmin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    // Send Resend welcome email with instructions
    // Supabase sends its own confirmation email, but Resend has better deliverability
    // This ensures users get at least one email (from Resend) even if Supabase email is filtered
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || process.env.NEXT_PUBLIC_VERCEL_URL || 'http://localhost:3000';
    const loginLink = `${appUrl}/auth/login?email=${encodeURIComponent(email)}`;
    
    await sendSignupConfirmationEmail({
      email,
      confirmationLink: loginLink, // Link to login page (they can request new confirmation there)
      name: name || undefined,
    });

    return NextResponse.json(
      { success: true, message: 'Confirmation email sent' },
      { status: 200 }
    );

  } catch (error) {
    console.error('[send-confirmation] Error:', error);
    return NextResponse.json(
      { error: 'Failed to send confirmation email' },
      { status: 500 }
    );
  }
}

