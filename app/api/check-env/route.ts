import { NextResponse } from 'next/server';

// Force Node runtime
export const runtime = 'nodejs';

/**
 * GET /api/check-env
 *
 * Diagnostic endpoint to check if required environment variables are set
 * (without exposing actual values for security)
 */
export async function GET() {
  const envCheck = {
    resend: {
      configured: !!process.env.RESEND_API_KEY,
      length: process.env.RESEND_API_KEY?.length || 0,
      prefix: process.env.RESEND_API_KEY ? process.env.RESEND_API_KEY.substring(0, 8) + '...' : 'not-set',
    },
    supabase: {
      url: !!process.env.NEXT_PUBLIC_SUPABASE_URL,
      serviceRole: !!process.env.SUPABASE_SERVICE_ROLE_KEY,
    },
    app: {
      url: process.env.NEXT_PUBLIC_APP_URL || process.env.NEXT_PUBLIC_VERCEL_URL || 'not-set',
    },
  };

  // Check if all critical vars are set
  const allSet = envCheck.resend.configured && 
                 envCheck.supabase.url && 
                 envCheck.supabase.serviceRole;

  return NextResponse.json({
    success: allSet,
    environment: process.env.NODE_ENV || 'development',
    checks: envCheck,
    message: allSet 
      ? 'All required environment variables are configured ✅' 
      : 'Some environment variables are missing ❌',
  });
}

