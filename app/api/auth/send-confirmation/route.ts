import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { sendSignupConfirmationEmail } from '@/lib/services/auth-email-service';

/**
 * Server-side PostHog event tracking for email_sent
 * Uses PostHog HTTP API for server-side routes
 */
async function trackEmailSentServer(email: string, userId?: string) {
  const posthogKey = process.env.NEXT_PUBLIC_POSTHOG_KEY;
  const posthogHost = process.env.NEXT_PUBLIC_POSTHOG_HOST || 'https://us.i.posthog.com';

  if (!posthogKey) {
    console.warn('[send-confirmation] ⚠️ PostHog key not configured - skipping email_sent tracking');
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
        event: 'email_sent',
        distinct_id: userId || email, // Use userId if available, otherwise email
        properties: {
          user_id: userId,
          email: email ? email.substring(0, 3) + '***' : undefined,
          email_service: 'resend',
          timestamp: new Date().toISOString(),
        },
      }),
    });

    if (!response.ok) {
      console.error('[send-confirmation] ❌ PostHog tracking failed:', response.status, response.statusText);
    } else {
      console.log('[send-confirmation] 📊 PostHog: Tracked email_sent event for:', email);
    }
  } catch (error) {
    console.error('[send-confirmation] ❌ PostHog tracking error:', error);
    // Don't throw - tracking failure shouldn't break email sending
  }
}

// Force Node runtime (Resend requires Node, not Edge)
export const runtime = 'nodejs';

/**
 * POST /api/auth/send-confirmation
 *
 * Sends signup confirmation email via Resend API (bypasses SMTP issues).
 * Generates Supabase confirmation link and sends via Resend for fast, professional delivery.
 */
export async function POST(request: NextRequest) {
  const startTime = Date.now();
  
  try {
    console.log('[send-confirmation] 📧 Step 1: Received request');
    const { email, name } = await request.json();

    if (!email || typeof email !== 'string') {
      console.error('[send-confirmation] ❌ Step 1 failed: Email is required');
      return NextResponse.json(
        { error: 'Email is required' },
        { status: 400 }
      );
    }

    console.log('[send-confirmation] 📧 Step 2: Processing email for:', email);

    // Check Resend API key first (like feedback emails do)
    if (!process.env.RESEND_API_KEY) {
      console.error('[send-confirmation] ❌ RESEND_API_KEY not configured');
      return NextResponse.json(
        { error: 'Email service not configured' },
        { status: 500 }
      );
    }

    // Create Supabase admin client to generate confirmation link
    const supabaseAdmin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    // Try to get user ID if user exists (for PostHog tracking)
    let userId: string | undefined;
    try {
      const { data: users } = await supabaseAdmin.auth.admin.listUsers();
      const existingUser = users?.users.find(u => u.email === email);
      if (existingUser) {
        userId = existingUser.id;
      }
    } catch (err) {
      // Ignore - userId is optional for tracking
      console.log('[send-confirmation] Could not fetch user ID for tracking:', err);
    }

    // Get app URL for redirect
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || 
                   process.env.NEXT_PUBLIC_VERCEL_URL || 
                   'https://bookbridge.app';
    
    console.log('[send-confirmation] 📧 Step 3: Generating confirmation link...');
    
    // Generate confirmation link for this user
    // Use 'magiclink' for existing users (works as confirmation + login)
    // 'signup' type only works for NEW users, fails if user already exists
    const { data: linkData, error: linkError } = await supabaseAdmin.auth.admin.generateLink({
      type: 'magiclink', // Works for both new and existing users
      email: email,
      options: {
        redirectTo: `${appUrl}/auth/callback?type=signup`,
      },
    });

    if (linkError || !linkData?.properties?.action_link) {
      console.error('[send-confirmation] ❌ Step 3 failed: Failed to generate link:', linkError);
      console.error('[send-confirmation] Link error details:', {
        message: linkError?.message,
        status: linkError?.status,
      });
      
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

    console.log('[send-confirmation] ✅ Step 3: Generated confirmation link');
    console.log('[send-confirmation] 📧 Step 4: Sending email via Resend...');
    console.log('[send-confirmation] Email details:', {
      to: email,
      linkLength: linkData.properties.action_link.length,
      linkPreview: linkData.properties.action_link.substring(0, 50) + '...',
    });

    // Send professional confirmation email via Resend with actual Supabase link
    try {
      const emailResult = await sendSignupConfirmationEmail({
        email,
        confirmationLink: linkData.properties.action_link, // Real Supabase confirmation link
        name: name || undefined,
      });

      const duration = Date.now() - startTime;
      console.log('[send-confirmation] ✅ Step 4: Confirmation email sent via Resend to:', email, `(${duration}ms)`);
      console.log('[send-confirmation] Resend result:', JSON.stringify(emailResult, null, 2));
      console.log('[send-confirmation] Resend data:', emailResult?.data);
      console.log('[send-confirmation] Resend error:', emailResult?.error);
      
      // Check if Resend actually sent the email
      // onboarding@resend.dev can only send to account owner's verified email
      // If data is null or error exists, email wasn't sent
      if (!emailResult?.data || emailResult?.error) {
        console.warn('[send-confirmation] ⚠️ Resend returned error or no data - email likely not sent');
        console.warn('[send-confirmation] ⚠️ onboarding@resend.dev restriction: can only send to account owner email');
        console.warn('[send-confirmation] ⚠️ Falling back to Supabase email...');
        
        // Fallback to Supabase email
        await supabaseAdmin.auth.resend({
          type: 'signup',
          email: email,
          options: { emailRedirectTo: `${appUrl}/auth/callback?type=signup` },
        });
        
        // Track email_sent even for Supabase fallback (Phase 5: Step 1)
        trackEmailSentServer(email, userId).catch(err => {
          console.error('[send-confirmation] Non-blocking PostHog tracking failed:', err);
        });
        
        return NextResponse.json(
          { 
            success: true, 
            message: 'Confirmation email sent via Supabase (Resend domain restriction)',
            warning: 'Resend onboarding@resend.dev can only send to account owner email',
            fallback: 'supabase',
            resendError: emailResult?.error
          },
          { status: 200 }
        );
      }

      // Track email_sent event (Phase 5: Step 1)
      trackEmailSentServer(email, userId).catch(err => {
        console.error('[send-confirmation] Non-blocking PostHog tracking failed:', err);
      });

      return NextResponse.json(
        { success: true, message: 'Confirmation email sent', result: emailResult },
        { status: 200 }
      );
    } catch (emailError) {
      console.error('[send-confirmation] ❌ Step 4 failed: Resend email error:', emailError);
      console.error('[send-confirmation] Error details:', {
        message: emailError instanceof Error ? emailError.message : String(emailError),
        stack: emailError instanceof Error ? emailError.stack : undefined,
      });
      
      // Fallback: trigger Supabase resend
      await supabaseAdmin.auth.resend({
        type: 'signup',
        email: email,
        options: { emailRedirectTo: `${appUrl}/auth/callback?type=signup` },
      });
      
      // Track email_sent even for Supabase fallback (Phase 5: Step 1)
      trackEmailSentServer(email, userId).catch(err => {
        console.error('[send-confirmation] Non-blocking PostHog tracking failed:', err);
      });
      
      return NextResponse.json(
        { 
          success: true, 
          message: 'Confirmation email sent via Supabase (Resend failed)',
          error: emailError instanceof Error ? emailError.message : String(emailError)
        },
        { status: 200 }
      );
    }

  } catch (error) {
    const duration = Date.now() - startTime;
    console.error('[send-confirmation] ❌ Fatal error after', duration, 'ms:', error);
    console.error('[send-confirmation] Error details:', {
      message: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
    });
    return NextResponse.json(
      { 
        error: 'Failed to send confirmation email',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

