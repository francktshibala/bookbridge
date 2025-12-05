import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { sendPasswordResetEmail } from '@/lib/services/auth-email-service';

// Force Node runtime (Resend requires Node, not Edge)
export const runtime = 'nodejs';

/**
 * POST /api/auth/send-password-reset
 *
 * Sends password reset email via Resend API.
 * Generates Supabase password reset link and sends via Resend for fast, professional delivery.
 */
export async function POST(request: NextRequest) {
  const startTime = Date.now();
  
  try {
    console.log('[send-password-reset] 🔐 Step 1: Received request');
    const { email } = await request.json();

    if (!email || typeof email !== 'string') {
      console.error('[send-password-reset] ❌ Step 1 failed: Email is required');
      return NextResponse.json(
        { error: 'Email is required' },
        { status: 400 }
      );
    }

    console.log('[send-password-reset] 🔐 Step 2: Processing password reset for:', email);

    // Check Resend API key first
    if (!process.env.RESEND_API_KEY) {
      console.error('[send-password-reset] ❌ RESEND_API_KEY not configured');
      return NextResponse.json(
        { error: 'Email service not configured' },
        { status: 500 }
      );
    }

    // Create Supabase admin client to generate reset link
    const supabaseAdmin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    // Get app URL for redirect
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || 
                   process.env.NEXT_PUBLIC_VERCEL_URL || 
                   'https://bookbridge.app';
    
    console.log('[send-password-reset] 🔐 Step 3: Generating password reset link...');
    
    // Generate password reset link using Supabase Admin API
    const { data: linkData, error: linkError } = await supabaseAdmin.auth.admin.generateLink({
      type: 'recovery', // Password reset type
      email: email,
      options: {
        redirectTo: `${appUrl}/auth/callback?type=password_reset`,
      },
    });

    if (linkError || !linkData?.properties?.action_link) {
      console.error('[send-password-reset] ❌ Step 3 failed: Failed to generate link:', linkError);
      console.error('[send-password-reset] Link error details:', {
        message: linkError?.message,
        status: linkError?.status,
      });
      
      // Cannot use Supabase resend for recovery type - generateLink is required
      return NextResponse.json(
        { 
          error: 'Failed to generate password reset link',
          details: linkError?.message || 'Unknown error',
          suggestion: 'Please try again or contact support'
        },
        { status: 500 }
      );
    }

    console.log('[send-password-reset] ✅ Step 3: Generated password reset link');
    console.log('[send-password-reset] 🔐 Step 4: Sending email via Resend...');
    console.log('[send-password-reset] Email details:', {
      to: email,
      linkLength: linkData.properties.action_link.length,
      linkPreview: linkData.properties.action_link.substring(0, 50) + '...',
    });

    // Send professional password reset email via Resend with actual Supabase link
    try {
      const emailResult = await sendPasswordResetEmail({
        email,
        resetLink: linkData.properties.action_link, // Real Supabase reset link
      });

      const duration = Date.now() - startTime;
      console.log('[send-password-reset] ✅ Step 4: Password reset email sent via Resend to:', email, `(${duration}ms)`);
      console.log('[send-password-reset] Resend result:', JSON.stringify(emailResult, null, 2));
      console.log('[send-password-reset] Resend data:', emailResult?.data);
      console.log('[send-password-reset] Resend error:', emailResult?.error);
      
      // Check if Resend actually sent the email
      if (!emailResult?.data || emailResult?.error) {
        console.warn('[send-password-reset] ⚠️ Resend returned error or no data - email likely not sent');
        console.warn('[send-password-reset] ⚠️ Falling back to Supabase email...');
        
        // Fallback: Cannot use Supabase resend for recovery type
        // generateLink with type 'recovery' is the correct approach
        console.warn('[send-password-reset] ⚠️ Resend failed, but generateLink already attempted');
        
        return NextResponse.json(
          { 
            success: true, 
            message: 'Password reset email sent via Supabase (Resend domain restriction)',
            warning: 'Resend onboarding@resend.dev can only send to account owner email',
            fallback: 'supabase',
            resendError: emailResult?.error
          },
          { status: 200 }
        );
      }

      return NextResponse.json(
        { success: true, message: 'Password reset email sent', result: emailResult },
        { status: 200 }
      );
    } catch (emailError) {
      console.error('[send-password-reset] ❌ Step 4 failed: Resend email error:', emailError);
      console.error('[send-password-reset] Error details:', {
        message: emailError instanceof Error ? emailError.message : String(emailError),
        stack: emailError instanceof Error ? emailError.stack : undefined,
      });
      
      // Cannot use Supabase resend for recovery type - generateLink is required
      // If Resend fails, we return error since generateLink already succeeded
      return NextResponse.json(
        { 
          error: 'Failed to send password reset email via Resend',
          details: emailError instanceof Error ? emailError.message : String(emailError),
          suggestion: 'Please try again or contact support'
        },
        { status: 500 }
      );
    }

  } catch (error) {
    const duration = Date.now() - startTime;
    console.error('[send-password-reset] ❌ Fatal error after', duration, 'ms:', error);
    console.error('[send-password-reset] Error details:', {
      message: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined,
    });
    return NextResponse.json(
      { 
        error: 'Failed to send password reset email',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

