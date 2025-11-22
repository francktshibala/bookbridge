/**
 * Email Service
 *
 * Sends email notifications using Resend API.
 * Used for feedback notifications and other system emails.
 *
 * @module lib/services/email-service
 */

import { Resend } from 'resend';

const DEFAULT_ADMIN_EMAILS = [
  'bookbridgegap@gmail.com',
  'franck1tshibala@gmail.com',
];
const ADMIN_EMAILS = (process.env.FEEDBACK_ADMIN_EMAIL
  ? process.env.FEEDBACK_ADMIN_EMAIL.split(',')
  : DEFAULT_ADMIN_EMAILS).map((email) => email.trim()).filter(Boolean);
const SECONDARY_ADMIN_EMAIL = process.env.FEEDBACK_SECONDARY_EMAIL;
const FROM_EMAIL =
  process.env.FEEDBACK_FROM_EMAIL || 'BookBridge <onboarding@resend.dev>'; // Prefer verified domain in production
const REPLY_TO_EMAIL = process.env.FEEDBACK_REPLY_TO_EMAIL || undefined;

// Lazy initialization to avoid build-time errors when env var not available
let resendInstance: Resend | null = null;
function getResend(): Resend {
  if (!resendInstance) {
    resendInstance = new Resend(process.env.RESEND_API_KEY);
  }
  return resendInstance;
}

/**
 * Send feedback notification email to admin
 *
 * @param feedbackData - User feedback data
 * @returns Email send result
 */
export async function sendFeedbackNotification(feedbackData: {
  id: string;
  email: string;
  name?: string;
  npsScore: number;
  source?: string;
  purpose?: string[];
  featuresUsed?: string[];
  improvement?: string;
  wantsInterview?: boolean;
  sessionDuration?: number;
  deviceType?: string;
}) {
  // Skip if no API key configured
  if (!process.env.RESEND_API_KEY) {
    console.warn('[EmailService] RESEND_API_KEY not configured - skipping email notification');
    return { skipped: true };
  }

  const npsLabel = feedbackData.npsScore >= 9 ? '🟢 Promoter' :
                   feedbackData.npsScore >= 7 ? '🟡 Passive' :
                   '🔴 Detractor';

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
          .interview { background: #002147; color: white; padding: 10px 18px; border-radius: 6px; margin-top: 10px; border-left: 4px solid #CD7F32; }
          .footer { margin-top: 20px; padding-top: 20px; border-top: 2px solid #CD7F32; font-size: 12px; color: #5D4E37; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1 style="margin: 0;">📬 New Feedback Received!</h1>
            <p style="margin: 5px 0 0 0; opacity: 0.9;">BookBridge Feedback System</p>
          </div>

          <div class="content">
            <!-- Contact Info -->
            <div class="field">
              <div class="label">👤 Contact</div>
              <div class="value">
                ${feedbackData.name ? `<strong>${feedbackData.name}</strong><br>` : ''}
                📧 <a href="mailto:${feedbackData.email}">${feedbackData.email}</a>
              </div>
            </div>

            <!-- NPS Score -->
            <div class="field">
              <div class="label">⭐ Net Promoter Score</div>
              <div class="value">
                <span class="badge ${feedbackData.npsScore >= 9 ? 'promoter' : feedbackData.npsScore >= 7 ? 'passive' : 'detractor'}">
                  ${feedbackData.npsScore}/10 - ${npsLabel}
                </span>
              </div>
            </div>

            <!-- Improvement Feedback -->
            ${feedbackData.improvement ? `
            <div class="field">
              <div class="label">💡 What Would You Improve?</div>
              <div class="value" style="background: #F4F1EB; padding: 12px; border-radius: 6px; border-left: 4px solid #CD7F32; color: #2C1810;">
                ${feedbackData.improvement}
              </div>
            </div>
            ` : ''}

            <!-- Interview Opt-in -->
            ${feedbackData.wantsInterview ? `
            <div class="field">
              <div class="interview">
                🎙️ <strong>Interview Requested</strong> - User wants to join a 15-minute feedback interview!
              </div>
            </div>
            ` : ''}

            <!-- Discovery -->
            ${feedbackData.source ? `
            <div class="field">
              <div class="label">🔍 How They Found Us</div>
              <div class="value">${feedbackData.source}</div>
            </div>
            ` : ''}

            <!-- Features Used -->
            ${feedbackData.featuresUsed && feedbackData.featuresUsed.length > 0 ? `
            <div class="field">
              <div class="label">✨ Features Tried</div>
              <div class="value">
                ${feedbackData.featuresUsed.map(f => `<span style="background: #F4F1EB; padding: 6px 10px; border-radius: 4px; margin-right: 6px; display: inline-block; margin-bottom: 4px; border: 1px solid #CD7F32; color: #002147;">${f}</span>`).join('')}
              </div>
            </div>
            ` : ''}

            <!-- Context Data -->
            <div class="field" style="background: #F4F1EB; padding: 14px; border-radius: 6px; font-size: 13px; border: 1px solid #E5DDD4;">
              <div class="label">📊 Context</div>
              <div class="value">
                ${feedbackData.sessionDuration ? `⏱️ Session: ${Math.floor(feedbackData.sessionDuration / 60)}m ${feedbackData.sessionDuration % 60}s<br>` : ''}
                ${feedbackData.deviceType ? `📱 Device: ${feedbackData.deviceType}<br>` : ''}
                🆔 Feedback ID: <code style="background: #FFFFFF; padding: 2px 6px; border-radius: 3px; border: 1px solid #CD7F32; color: #002147;">${feedbackData.id}</code>
              </div>
            </div>

            <!-- Footer -->
            <div class="footer">
              <p><strong>Next Steps:</strong></p>
              <ul style="margin: 10px 0;">
                ${feedbackData.wantsInterview ? `<li>📅 Schedule 15-min interview with ${feedbackData.email}</li>` : ''}
                <li>📊 View in Supabase: Table Editor → feedback → ID: ${feedbackData.id}</li>
                <li>💬 Reply to ${feedbackData.email} to follow up</li>
              </ul>
            </div>
          </div>
        </div>
      </body>
    </html>
  `;

  const textBody = `
New Feedback Received - BookBridge

Contact: ${feedbackData.name || 'Anonymous'} (${feedbackData.email})
NPS Score: ${feedbackData.npsScore}/10 ${npsLabel}

${feedbackData.improvement ? `Improvement Suggestion:\n${feedbackData.improvement}\n` : ''}
${feedbackData.wantsInterview ? '🎙️ Interview Requested: YES\n' : ''}
${feedbackData.source ? `Source: ${feedbackData.source}\n` : ''}
${feedbackData.featuresUsed?.length ? `Features Tried: ${feedbackData.featuresUsed.join(', ')}\n` : ''}

Context:
- Session Duration: ${feedbackData.sessionDuration ? `${Math.floor(feedbackData.sessionDuration / 60)}m ${feedbackData.sessionDuration % 60}s` : 'N/A'}
- Device: ${feedbackData.deviceType || 'N/A'}
- Feedback ID: ${feedbackData.id}

View in Supabase: Table Editor → feedback → ID: ${feedbackData.id}
  `.trim();

  // Debug logging before send
  const recipientEmails = [...ADMIN_EMAILS, SECONDARY_ADMIN_EMAIL].filter(Boolean) as string[];

  console.log('[EmailService] About to send email:', {
    to: recipientEmails,
    from: FROM_EMAIL,
    replyTo: REPLY_TO_EMAIL,
    hasApiKey: !!process.env.RESEND_API_KEY,
    apiKeyLength: process.env.RESEND_API_KEY?.length,
  });

  try {
    const resend = getResend(); // Lazy initialization
    const result = await resend.emails.send({
      from: FROM_EMAIL,
      to: recipientEmails,
      subject: `${feedbackData.wantsInterview ? '🎙️ ' : ''}New Feedback: ${npsLabel} (${feedbackData.npsScore}/10)`,
      html: htmlBody,
      text: textBody,
      replyTo: REPLY_TO_EMAIL || feedbackData.email,
    });

    console.log('[EmailService] ✅ Email sent successfully! Result:', result);
    return result;
  } catch (error) {
    console.error('[EmailService] ❌ Failed to send email:', error);
    throw error;
  }
}
