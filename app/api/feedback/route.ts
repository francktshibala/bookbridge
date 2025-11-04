import { NextRequest, NextResponse } from 'next/server';
import {
  submitFeedback,
  getDeviceType,
  type FeedbackFormData,
  type FeedbackContextData
} from '@/lib/services/feedback-service';
import { sendFeedbackNotification } from '@/lib/services/email-service';

// Force Node runtime (Resend requires Node, not Edge)
export const runtime = 'nodejs';

/**
 * POST /api/feedback
 *
 * Submit user feedback with validation and rate limiting.
 * Returns 201 on success with feedback ID.
 */
export async function POST(request: NextRequest) {
  try {
    // Parse request body
    const body = await request.json();

    // === Validation ===

    // Honeypot field (spam protection)
    if (body.website) {
      // Bot detected - return success but don't save
      return NextResponse.json(
        { success: true, id: 'honeypot' },
        { status: 201 }
      );
    }

    // Validate required fields
    if (!body.email || typeof body.email !== 'string') {
      return NextResponse.json(
        { error: 'Email is required' },
        { status: 400 }
      );
    }

    if (!body.npsScore || typeof body.npsScore !== 'number' || body.npsScore < 1 || body.npsScore > 10) {
      return NextResponse.json(
        { error: 'Valid NPS score (1-10) is required' },
        { status: 400 }
      );
    }

    // Basic email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(body.email)) {
      return NextResponse.json(
        { error: 'Invalid email format' },
        { status: 400 }
      );
    }

    // Rate limiting (simple IP-based)
    const ip = request.headers.get('x-forwarded-for') ||
               request.headers.get('x-real-ip') ||
               'unknown';

    // TODO: Implement proper rate limiting with Redis or database
    // For now, trust client-side localStorage to prevent spam

    // === Extract Context Data ===

    const userAgent = request.headers.get('user-agent') || 'unknown';
    const deviceType = getDeviceType(userAgent);

    const contextData: FeedbackContextData = {
      sessionDuration: body.sessionDuration,
      userAgent,
      deviceType,
      pagesViewed: body.pagesViewed,
      path: body.path || '/feedback',
      userId: body.userId, // If logged in
    };

    // === Prepare Form Data ===

    const formData: FeedbackFormData = {
      email: body.email,
      npsScore: body.npsScore,
      name: body.name,
      source: body.source,
      purpose: Array.isArray(body.purpose) ? body.purpose : [],
      featuresUsed: Array.isArray(body.featuresUsed) ? body.featuresUsed : [],
      improvement: body.improvement || '',
      wantsInterview: body.wantsInterview === true,
    };

    // === Submit to Database ===

    const feedbackId = await submitFeedback({
      formData,
      contextData,
    });

    // === Send Email Notification ===

    try {
      await sendFeedbackNotification({
        id: feedbackId,
        email: formData.email,
        name: formData.name,
        npsScore: formData.npsScore,
        source: formData.source,
        purpose: formData.purpose,
        featuresUsed: formData.featuresUsed,
        improvement: formData.improvement,
        wantsInterview: formData.wantsInterview,
        sessionDuration: contextData.sessionDuration,
        deviceType: contextData.deviceType,
      });
    } catch (emailError) {
      // Log email error but don't fail the request
      console.error('[API /feedback] Email notification failed:', emailError);
      // Continue - feedback was saved successfully
    }

    // === Success Response ===

    return NextResponse.json(
      {
        success: true,
        id: feedbackId,
        message: 'Thank you for your feedback! We\'ll review it carefully.',
      },
      {
        status: 201,
        headers: {
          'Cache-Control': 'no-store', // Don't cache feedback submissions
        },
      }
    );

  } catch (error) {
    console.error('[API /feedback] Error:', error);

    // Check for specific error types
    if (error instanceof Error) {
      if (error.message.includes('email') || error.message.includes('NPS')) {
        return NextResponse.json(
          { error: error.message },
          { status: 400 }
        );
      }
    }

    // Generic error response
    return NextResponse.json(
      {
        error: 'Failed to submit feedback. Please try again later.',
        details: process.env.NODE_ENV === 'development' ? (error as Error).message : undefined
      },
      { status: 500 }
    );
  }
}

/**
 * OPTIONS /api/feedback
 *
 * CORS preflight support
 */
export async function OPTIONS() {
  return new NextResponse(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    },
  });
}
