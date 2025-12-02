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

    // Get app URL for redirect
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || 
                   process.env.NEXT_PUBLIC_VERCEL_URL || 
                   'https://bookbridge.app';
    
    console.log('[send-confirmation] 📧 Step 3: Looking up user in Supabase...');
    
    // Wait a moment for user to be created (user might not exist immediately)
    await new Promise(resolve => setTimeout(resolve, 500));
    
    // Find the user by email to get their ID
    const { data: users, error: userError } = await supabaseAdmin.auth.admin.listUsers();
    
    if (userError) {
      console.error('[send-confirmation] ❌ Step 3 failed: Failed to list users:', userError);
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
      console.error('[send-confirmation] ❌ Step 3 failed: User not found:', email);
      console.log('[send-confirmation] Available users:', users.users.map(u => u.email));
      return NextResponse.json(
        { error: 'User not found. Please try signing up again.' },
        { status: 404 }
      );
    }

    console.log('[send-confirmation] ✅ Step 3: Found user:', user.id);

    console.log('[send-confirmation] 📧 Step 4: Generating confirmation link...');
    
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
      console.error('[send-confirmation] ❌ Step 4 failed: Failed to generate link:', linkError);
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

    console.log('[send-confirmation] ✅ Step 4: Generated confirmation link');
    console.log('[send-confirmation] 📧 Step 5: Sending email via Resend...');

    // Send professional confirmation email via Resend with actual Supabase link
    await sendSignupConfirmationEmail({
      email,
      confirmationLink: linkData.properties.action_link, // Real Supabase confirmation link
      name: name || undefined,
    });

    const duration = Date.now() - startTime;
    console.log('[send-confirmation] ✅ Step 5: Confirmation email sent via Resend to:', email, `(${duration}ms)`);

    return NextResponse.json(
      { success: true, message: 'Confirmation email sent' },
      { status: 200 }
    );

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

