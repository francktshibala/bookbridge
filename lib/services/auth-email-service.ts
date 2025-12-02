/**
 * Auth Email Service
 *
 * Sends authentication-related emails (signup confirmation, password reset, etc.)
 * using Resend API for better deliverability than Supabase's default emails.
 *
 * Architecture:
 * - Uses existing Resend setup (same as feedback emails)
 * - Complements Supabase Auth (doesn't replace it)
 * - Better deliverability than Supabase default emails
 */

import { Resend } from 'resend';

const FROM_EMAIL = process.env.AUTH_FROM_EMAIL || 'BookBridge <onboarding@resend.dev>';
const RESEND_API_KEY = process.env.RESEND_API_KEY;

// Lazy initialization
let resendInstance: Resend | null = null;
function getResend(): Resend {
  if (!resendInstance) {
    if (!RESEND_API_KEY) {
      throw new Error('RESEND_API_KEY not configured');
    }
    resendInstance = new Resend(RESEND_API_KEY);
  }
  return resendInstance;
}

/**
 * Send signup confirmation email via Resend
 * 
 * @param email - User's email address
 * @param confirmationLink - Supabase confirmation link (actual verification URL)
 * @param name - User's name (optional)
 */
export async function sendSignupConfirmationEmail({
  email,
  confirmationLink,
  name,
}: {
  email: string;
  confirmationLink: string;
  name?: string;
}): Promise<void> {
  if (!RESEND_API_KEY) {
    console.warn('[AuthEmailService] RESEND_API_KEY not configured - skipping confirmation email');
    return;
  }

  const htmlBody = `
    <!DOCTYPE html>
    <html>
      <head>
        <style>
          body { font-family: 'Georgia', 'Times New Roman', serif; line-height: 1.6; color: #2C1810; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; background: #F4F1EB; }
          .header { background: #002147; color: white; padding: 20px; border-radius: 8px 8px 0 0; border-left: 4px solid #CD7F32; }
          .content { background: #FFFFFF; padding: 30px; border-radius: 0 0 8px 8px; border: 1px solid #E5DDD4; box-shadow: 0 2px 8px rgba(44, 24, 16, 0.1); }
          .button { display: inline-block; padding: 16px 32px; background: #002147; color: white; text-decoration: none; border-radius: 8px; font-weight: bold; margin: 20px 0; border: 2px solid #CD7F32; }
          .button:hover { background: #003366; }
          .footer { margin-top: 20px; padding-top: 20px; border-top: 2px solid #CD7F32; font-size: 12px; color: #5D4E37; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1 style="margin: 0;">Welcome to BookBridge! 📚</h1>
            <p style="margin: 5px 0 0 0; opacity: 0.9;">Please confirm your email address</p>
          </div>
          <div class="content">
            <p>Hi${name ? ` ${name}` : ''},</p>
            <p>Thank you for signing up for BookBridge! We're excited to help you learn English through classic literature.</p>
            <p><strong>Please confirm your email address to activate your account.</strong></p>
            <p>Click the button below to verify your email and start exploring our collection of classic books:</p>
            <div style="text-align: center; margin: 30px 0;">
              <a href="${confirmationLink}" class="button">Confirm Your Email</a>
            </div>
            <p style="font-size: 14px; color: #5D4E37; margin-top: 20px;">This link will expire in 24 hours. If you didn't create an account, you can safely ignore this email.</p>
            <div class="footer">
              <p><strong>What's Next?</strong></p>
              <ul style="margin: 10px 0;">
                <li>📖 Explore our featured books</li>
                <li>🎧 Listen to native speaker narration</li>
                <li>📚 Read at your perfect level (A1-C2)</li>
              </ul>
              <p style="margin-top: 20px;">If you didn't create an account, you can safely ignore this email.</p>
            </div>
          </div>
        </div>
      </body>
    </html>
  `;

  const textBody = `
Welcome to BookBridge!

Hi${name ? ` ${name}` : ''},

Thank you for signing up for BookBridge! We're excited to help you learn English through classic literature.

Please confirm your email address by clicking this link:
${confirmationLink}

This link will expire in 24 hours.

What's Next?
- Explore our featured books
- Listen to native speaker narration
- Read at your perfect level (A1-C2)

If you didn't create an account, you can safely ignore this email.

Happy reading!
The BookBridge Team
  `.trim();

  try {
    const resend = getResend();
    await resend.emails.send({
      from: FROM_EMAIL,
      to: email,
      subject: 'Welcome to BookBridge - Confirm Your Email',
      html: htmlBody,
      text: textBody,
    });

    console.log('[AuthEmailService] ✅ Confirmation email sent successfully to:', email);
  } catch (error) {
    console.error('[AuthEmailService] ❌ Failed to send confirmation email:', error);
    // Don't throw - Supabase will still send its own email as fallback
  }
}

