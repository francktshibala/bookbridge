import { NextResponse } from 'next/server';
import { Resend } from 'resend';

// Force Node runtime
export const runtime = 'nodejs';

/**
 * GET /api/test-email
 *
 * Minimal test endpoint to verify Resend works
 */
export async function GET() {
  const apiKey = process.env.RESEND_API_KEY;

  if (!apiKey) {
    return NextResponse.json({
      success: false,
      error: 'RESEND_API_KEY not configured',
    }, { status: 500 });
  }

  console.log('[TestEmail] API Key length:', apiKey.length);
  console.log('[TestEmail] API Key prefix:', apiKey.substring(0, 8) + '...');

  const resend = new Resend(apiKey);

  try {
    const result = await resend.emails.send({
      from: 'BookBridge <onboarding@resend.dev>',
      to: 'franck1tshibala@gmail.com',
      subject: 'BookBridge Email Test',
      text: 'This is a test email from BookBridge. If you receive this, Resend is working correctly!',
    });

    console.log('[TestEmail] ✅ Success! Result:', result);

    return NextResponse.json({
      success: true,
      message: 'Email sent! Check franck1tshibala@gmail.com inbox (including spam)',
      result,
    });
  } catch (error) {
    console.error('[TestEmail] ❌ Error:', error);

    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      details: error,
    }, { status: 500 });
  }
}
