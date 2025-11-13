/**
 * Micro-Feedback API Route
 *
 * Handles lightweight feedback submissions from pause-moment surveys.
 * Features:
 * - Server-side IP geolocation (ipapi.co)
 * - Email notifications via Resend
 * - Dismissal tracking
 * - Device type detection
 *
 * @module app/api/feedback/micro/route
 */

import { NextRequest, NextResponse } from 'next/server';
import { createMicroFeedback, recordMicroFeedbackDismissal } from '@/lib/services/feedback-micro';
import { sendFeedbackNotification } from '@/lib/services/email-service';

// Force dynamic rendering (required for IP address access)
export const dynamic = 'force-dynamic';
export const runtime = 'nodejs'; // Required for Resend

// ============================================================================
// TYPES
// ============================================================================

interface GeolocationData {
  city?: string;
  region?: string;
  country?: string;
  country_name?: string;
}

// ============================================================================
// GEOLOCATION SERVICE
// ============================================================================

/**
 * Get geolocation from IP address using ipapi.co (free tier: 1,000 req/day)
 * Falls back gracefully if service unavailable
 */
async function getGeolocationFromIP(ip: string): Promise<GeolocationData> {
  // Skip for localhost/development
  if (ip === '127.0.0.1' || ip === 'localhost' || ip === '::1' || ip.startsWith('192.168.')) {
    return {
      city: 'Development',
      region: 'Local',
      country: 'XX',
    };
  }

  try {
    const response = await fetch(`https://ipapi.co/${ip}/json/`, {
      headers: {
        'User-Agent': 'BookBridge-ESL/1.0',
      },
      signal: AbortSignal.timeout(3000), // 3 second timeout
    });

    if (!response.ok) {
      throw new Error(`ipapi.co error: ${response.status}`);
    }

    const data = await response.json();

    return {
      city: data.city || undefined,
      region: data.region || undefined,
      country: data.country_code || data.country || undefined,
      country_name: data.country_name || undefined,
    };
  } catch (error) {
    console.error('[MicroFeedback API] Geolocation error:', error);
    // Return empty data instead of failing request
    return {};
  }
}

// ============================================================================
// API HANDLER
// ============================================================================

export async function POST(request: NextRequest) {
  try {
    // Parse request body
    const body = await request.json();

    // Get IP address from headers
    const forwardedFor = request.headers.get('x-forwarded-for');
    const realIp = request.headers.get('x-real-ip');
    const ip = forwardedFor?.split(',')[0] || realIp || 'unknown';

    console.log('[MicroFeedback API] Processing submission:', {
      ip,
      dismissed: body.dismissed,
      hasNps: !!body.npsScore,
      hasSentiment: !!body.sentiment,
      hasEmail: !!body.email,
    });

    // Get geolocation (server-side, no dropdown needed)
    const geolocation = await getGeolocationFromIP(ip);

    console.log('[MicroFeedback API] Geolocation result:', geolocation);

    // Handle dismissal (no feedback content)
    if (body.dismissed) {
      const dismissal = await recordMicroFeedbackDismissal({
        email: body.email,
        city: geolocation.city,
        region: geolocation.region,
        country: geolocation.country,
        deviceType: body.deviceType,
        sessionDuration: body.sessionDuration,
        lastBookId: body.lastBookId,
        lastLevel: body.lastLevel,
      });

      console.log('[MicroFeedback API] ✅ Dismissal recorded:', dismissal.id);

      return NextResponse.json({
        success: true,
        id: dismissal.id,
        dismissed: true,
      });
    }

    // Handle feedback submission
    const microFeedback = await createMicroFeedback({
      type: 'pause_moment',
      npsScore: body.npsScore,
      sentiment: body.sentiment,
      feedbackText: body.feedbackText,
      email: body.email,
      city: geolocation.city,
      region: geolocation.region,
      country: geolocation.country,
      deviceType: body.deviceType,
      sessionDuration: body.sessionDuration,
      lastBookId: body.lastBookId,
      lastLevel: body.lastLevel,
      dismissed: false,
    });

    console.log('[MicroFeedback API] ✅ Feedback recorded:', microFeedback.id);

    // Send email notification (non-blocking, don't await)
    sendMicroFeedbackNotification(microFeedback, geolocation.country_name)
      .then(() => console.log('[MicroFeedback API] ✅ Email sent'))
      .catch((err) => console.error('[MicroFeedback API] ❌ Email failed:', err));

    return NextResponse.json({
      success: true,
      id: microFeedback.id,
      city: geolocation.city || null,
    });
  } catch (error: any) {
    console.error('[MicroFeedback API] ❌ Error:', error);

    return NextResponse.json(
      {
        success: false,
        error: error.message || 'Failed to process feedback',
      },
      { status: 500 }
    );
  }
}

// ============================================================================
// EMAIL NOTIFICATION (Micro-feedback specific template)
// ============================================================================

async function sendMicroFeedbackNotification(
  feedbackData: {
    id: string;
    type: string;
    npsScore: number | null;
    sentiment: string | null;
    feedbackText: string | null;
    email: string | null;
    city: string | null;
    region: string | null;
    country: string | null;
    deviceType: string | null;
    sessionDuration: number | null;
    lastBookId: string | null;
    lastLevel: string | null;
    createdAt: Date;
  },
  countryName?: string
) {
  // Skip if no Resend API key
  if (!process.env.RESEND_API_KEY) {
    console.warn('[MicroFeedback Email] RESEND_API_KEY not configured - skipping email');
    return { skipped: true };
  }

  const { Resend } = await import('resend');
  const resend = new Resend(process.env.RESEND_API_KEY);

  // Determine sentiment label
  const sentimentLabel = feedbackData.sentiment
    ? feedbackData.sentiment === 'positive'
      ? '😊 Positive'
      : feedbackData.sentiment === 'neutral'
      ? '😐 Neutral'
      : '😞 Negative'
    : null;

  const npsLabel = feedbackData.npsScore
    ? feedbackData.npsScore >= 9
      ? '🟢 Promoter'
      : feedbackData.npsScore >= 7
      ? '🟡 Passive'
      : '🔴 Detractor'
    : null;

  const locationStr = [feedbackData.city, feedbackData.region, countryName || feedbackData.country]
    .filter(Boolean)
    .join(', ');

  const htmlBody = `
    <!DOCTYPE html>
    <html>
      <head>
        <style>
          body { font-family: 'Georgia', 'Times New Roman', serif; line-height: 1.6; color: #2C1810; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; background: #F4F1EB; }
          .header { background: #002147; color: white; padding: 20px; border-radius: 8px 8px 0 0; border-left: 4px solid #CD7F32; }
          .content { background: #FFFFFF; padding: 20px; border-radius: 0 0 8px 8px; border: 1px solid #E5DDD4; box-shadow: 0 2px 8px rgba(44, 24, 16, 0.1); }
          .field { margin-bottom: 15px; }
          .label { font-weight: bold; color: #002147; font-family: 'Georgia', serif; }
          .value { margin-top: 5px; color: #5D4E37; }
          .badge { display: inline-block; padding: 6px 14px; border-radius: 6px; font-size: 14px; font-weight: bold; border: 2px solid; }
          .promoter { background: #002147; color: white; border-color: #CD7F32; }
          .passive { background: #CD7F32; color: white; border-color: #002147; }
          .detractor { background: #8D4004; color: white; border-color: #5D4E37; }
          .location { background: #F4F1EB; padding: 12px; border-radius: 6px; border-left: 4px solid #CD7F32; color: #002147; font-weight: bold; }
          .footer { margin-top: 20px; padding-top: 20px; border-top: 2px solid #CD7F32; font-size: 12px; color: #5D4E37; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1 style="margin: 0;">⚡ Quick Micro-Feedback</h1>
            <p style="margin: 5px 0 0 0; opacity: 0.9;">Pause-Moment Survey</p>
          </div>

          <div class="content">
            ${
              feedbackData.city
                ? `
            <div class="field">
              <div class="label">📍 Location (Auto-detected)</div>
              <div class="location">${locationStr}</div>
            </div>
            `
                : ''
            }

            ${
              feedbackData.npsScore !== null
                ? `
            <div class="field">
              <div class="label">⭐ Net Promoter Score</div>
              <div class="value">
                <span class="badge ${feedbackData.npsScore >= 9 ? 'promoter' : feedbackData.npsScore >= 7 ? 'passive' : 'detractor'}">
                  ${feedbackData.npsScore}/10 - ${npsLabel}
                </span>
              </div>
            </div>
            `
                : ''
            }

            ${
              feedbackData.sentiment
                ? `
            <div class="field">
              <div class="label">💬 Sentiment</div>
              <div class="value">${sentimentLabel}</div>
            </div>
            `
                : ''
            }

            ${
              feedbackData.feedbackText
                ? `
            <div class="field">
              <div class="label">💭 Quick Thought</div>
              <div class="value" style="background: #F4F1EB; padding: 12px; border-radius: 6px; border-left: 4px solid #CD7F32; color: #2C1810;">
                "${feedbackData.feedbackText}"
              </div>
            </div>
            `
                : ''
            }

            ${
              feedbackData.email
                ? `
            <div class="field">
              <div class="label">📧 Email</div>
              <div class="value">
                <a href="mailto:${feedbackData.email}">${feedbackData.email}</a>
              </div>
            </div>
            `
                : '<div class="field"><div class="value" style="font-style: italic; color: #A0927B;">No email provided (anonymous feedback)</div></div>'
            }

            <div class="field" style="background: #F4F1EB; padding: 14px; border-radius: 6px; font-size: 13px; border: 1px solid #E5DDD4;">
              <div class="label">📊 Context</div>
              <div class="value">
                ${feedbackData.sessionDuration ? `⏱️ Session: ${Math.floor(feedbackData.sessionDuration / 60)}m ${feedbackData.sessionDuration % 60}s<br>` : ''}
                ${feedbackData.deviceType ? `📱 Device: ${feedbackData.deviceType}<br>` : ''}
                ${feedbackData.lastBookId ? `📚 Book: ${feedbackData.lastBookId}<br>` : ''}
                ${feedbackData.lastLevel ? `🎓 Level: ${feedbackData.lastLevel}<br>` : ''}
                🆔 ID: <code style="background: #FFFFFF; padding: 2px 6px; border-radius: 3px; border: 1px solid #CD7F32; color: #002147;">${feedbackData.id}</code>
              </div>
            </div>

            <div class="footer">
              <p><strong>Micro-Feedback (Pause-Moment Survey)</strong></p>
              <p>Collected automatically during reading pause. View in Supabase: Table Editor → micro_feedback → ID: ${feedbackData.id}</p>
            </div>
          </div>
        </div>
      </body>
    </html>
  `;

  const textBody = `
Quick Micro-Feedback - BookBridge

Location: ${locationStr || 'Unknown'}
${feedbackData.npsScore !== null ? `NPS Score: ${feedbackData.npsScore}/10 ${npsLabel}` : ''}
${feedbackData.sentiment ? `Sentiment: ${sentimentLabel}` : ''}
${feedbackData.feedbackText ? `\nQuick Thought: "${feedbackData.feedbackText}"` : ''}
${feedbackData.email ? `\nEmail: ${feedbackData.email}` : '\nEmail: Not provided (anonymous)'}

Context:
- Session: ${feedbackData.sessionDuration ? `${Math.floor(feedbackData.sessionDuration / 60)}m ${feedbackData.sessionDuration % 60}s` : 'N/A'}
- Device: ${feedbackData.deviceType || 'N/A'}
- Book: ${feedbackData.lastBookId || 'N/A'}
- Level: ${feedbackData.lastLevel || 'N/A'}
- ID: ${feedbackData.id}

View in Supabase: Table Editor → micro_feedback → ID: ${feedbackData.id}
  `.trim();

  try {
    const result = await resend.emails.send({
      from: 'BookBridge <onboarding@resend.dev>',
      to: 'bookbridgegap@gmail.com',
      subject: `⚡ Micro-Feedback: ${feedbackData.city || 'Unknown Location'} ${npsLabel || sentimentLabel || ''}`,
      html: htmlBody,
      text: textBody,
    });

    console.log('[MicroFeedback Email] ✅ Sent successfully:', result);
    return result;
  } catch (error) {
    console.error('[MicroFeedback Email] ❌ Failed:', error);
    throw error;
  }
}
