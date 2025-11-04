/**
 * Email Service
 *
 * Sends email notifications using Resend API.
 * Used for feedback notifications and other system emails.
 *
 * @module lib/services/email-service
 */

import { Resend } from 'resend';

const resend = new Resend(process.env.RESEND_API_KEY);

const ADMIN_EMAIL = 'bookbridgegap@gmail.com';
const FROM_EMAIL = 'BookBridge <onboarding@resend.dev>'; // Use verified domain in production

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
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: #002147; color: white; padding: 20px; border-radius: 8px 8px 0 0; }
          .content { background: #f4f4f4; padding: 20px; border-radius: 0 0 8px 8px; }
          .field { margin-bottom: 15px; }
          .label { font-weight: bold; color: #002147; }
          .value { margin-top: 5px; }
          .badge { display: inline-block; padding: 4px 12px; border-radius: 4px; font-size: 14px; font-weight: bold; }
          .promoter { background: #10b981; color: white; }
          .passive { background: #f59e0b; color: white; }
          .detractor { background: #ef4444; color: white; }
          .interview { background: #8b5cf6; color: white; padding: 8px 16px; border-radius: 6px; margin-top: 10px; }
          .footer { margin-top: 20px; padding-top: 20px; border-top: 2px solid #ddd; font-size: 12px; color: #666; }
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
              <div class="value" style="background: white; padding: 12px; border-radius: 6px; border-left: 4px solid #002147;">
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
                ${feedbackData.featuresUsed.map(f => `<span style="background: #e5e7eb; padding: 4px 8px; border-radius: 4px; margin-right: 6px; display: inline-block; margin-bottom: 4px;">${f}</span>`).join('')}
              </div>
            </div>
            ` : ''}

            <!-- Context Data -->
            <div class="field" style="background: #fef3c7; padding: 12px; border-radius: 6px; font-size: 13px;">
              <div class="label">📊 Context</div>
              <div class="value">
                ${feedbackData.sessionDuration ? `⏱️ Session: ${Math.floor(feedbackData.sessionDuration / 60)}m ${feedbackData.sessionDuration % 60}s<br>` : ''}
                ${feedbackData.deviceType ? `📱 Device: ${feedbackData.deviceType}<br>` : ''}
                🆔 Feedback ID: <code>${feedbackData.id}</code>
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

  try {
    const result = await resend.emails.send({
      from: FROM_EMAIL,
      to: ADMIN_EMAIL,
      subject: `${feedbackData.wantsInterview ? '🎙️ ' : ''}New Feedback: ${npsLabel} (${feedbackData.npsScore}/10)`,
      html: htmlBody,
      text: textBody,
    });

    console.log('[EmailService] Feedback notification sent:', result);
    return result;
  } catch (error) {
    console.error('[EmailService] Failed to send feedback notification:', error);
    throw error;
  }
}
