# Email Notifications Setup

Email notifications are sent to **bookbridgegap@gmail.com** when users submit feedback.

## Quick Setup (5 minutes)

### 1. Sign up for Resend (Free)

Visit: **https://resend.com**

- Click "Sign Up"
- Use your email
- Verify email

### 2. Get API Key

1. Go to **https://resend.com/api-keys**
2. Click "Create API Key"
3. Name it: "BookBridge Feedback"
4. Copy the key (starts with `re_...`)

### 3. Add to Environment

Open `.env.local` and replace:

```bash
RESEND_API_KEY=re_your_api_key_here
```

With your actual key:

```bash
RESEND_API_KEY=re_xxxxxxxxxxxxxxxxxxxxxxxx
```

### 4. Restart Dev Server

```bash
# Stop current server (Ctrl+C)
npm run dev
```

### 5. Test

1. Visit http://localhost:3002/feedback
2. Submit test feedback
3. Check **bookbridgegap@gmail.com** inbox
4. You should receive:
   - ✅ Subject: "New Feedback: [NPS Score]"
   - ✅ Beautiful HTML email with all feedback details
   - ✅ Interview request highlighted if opted in

## Email Features

**What's included in notification:**
- 📧 Contact info (name + email)
- ⭐ NPS score with color coding (Promoter/Passive/Detractor)
- 💡 Improvement suggestions
- 🎙️ Interview request status (highlighted if YES)
- 🔍 How they found you
- ✨ Features they tried
- 📊 Context (session duration, device type)
- 🆔 Feedback ID for database lookup

## Production Setup

Before deploying to production:

1. **Verify Domain** (optional but recommended):
   - Go to Resend Dashboard → Domains
   - Add your domain (e.g., `bookbridge.app`)
   - Update `FROM_EMAIL` in `/lib/services/email-service.ts`
   - Change from: `onboarding@resend.dev` → `feedback@yourdomain.com`

2. **Add to Deployment**:
   - Add `RESEND_API_KEY` to Vercel/hosting environment variables
   - Keep the same key or create production-specific key

## Troubleshooting

**No email received?**
- Check spam folder
- Verify RESEND_API_KEY is set correctly
- Check server logs for `[EmailService]` messages
- Ensure .env.local is loaded (restart server)

**Email sends but looks wrong?**
- Wait 1-2 minutes for email delivery
- Check Resend dashboard for delivery status
- View email source to debug HTML rendering

## Free Tier Limits

Resend Free Tier:
- ✅ 100 emails/day
- ✅ 3,000 emails/month
- ✅ Perfect for pilot phase (25 users)

You'll get ~3-10 feedback emails per week, well within limits.
