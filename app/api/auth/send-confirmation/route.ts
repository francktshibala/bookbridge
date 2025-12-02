import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { sendSignupConfirmationEmail } from '@/lib/services/auth-email-service';

// Force Node runtime (Resend requires Node, not Edge)
export const runtime = 'nodejs';

/**
 * POST /api/auth/send-confirmation
 *
 * Sends signup confirmation email via Resend API (bypasses SMTP issues).
 * Generates Supabase confirmation link and sends via Resend for fast, professional delivery.
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

    // Get app URL for redirect
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || 
                   process.env.NEXT_PUBLIC_VERCEL_URL || 
                   'https://bookbridge.app';
    
    // Find the user by email to get their ID
    const { data: users, error: userError } = await supabaseAdmin.auth.admin.listUsers();
    
    if (userError) {
      console.error('[send-confirmation] Failed to list users:', userError);
      // Fallback: trigger Supabase resend (uses their email service)
      await supabaseAdmin.auth.resend({
        type: 'signup',
        email: email,
        options: { emailRedirectTo: `${appUrl}/auth/callback?type=signup` },
      });
      return NextResponse.json(
        { success: true, message: 'Confirmation email sent via Supabase' },
        { status: 200 }
      );
    }

    // Find user by email
    const user = users.users.find(u => u.email === email);
    
    if (!user) {
      console.error('[send-confirmation] User not found:', email);
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }

    // Generate confirmation link for this user
    const { data: linkData, error: linkError } = await supabaseAdmin.auth.admin.generateLink({
      type: 'signup',
      email: email,
      password: 'temp-password-ignore', // Required but not used for signup links
      options: {
        redirectTo: `${appUrl}/auth/callback?type=signup`,
      },
    });

    if (linkError || !linkData?.properties?.action_link) {
      console.error('[send-confirmation] Failed to generate link:', linkError);
      // Fallback: trigger Supabase resend
      await supabaseAdmin.auth.resend({
        type: 'signup',
        email: email,
        options: { emailRedirectTo: `${appUrl}/auth/callback?type=signup` },
      });
      return NextResponse.json(
        { success: true, message: 'Confirmation email sent via Supabase' },
        { status: 200 }
      );
    }

    // Send professional confirmation email via Resend with actual Supabase link
    await sendSignupConfirmationEmail({
      email,
      confirmationLink: linkData.properties.action_link, // Real Supabase confirmation link
      name: name || undefined,
    });

    console.log('[send-confirmation] ✅ Confirmation email sent via Resend to:', email);

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

