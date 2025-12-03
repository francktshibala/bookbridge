# Domain Verification Steps - Quick Guide

## ✅ Step 1: Fix 1 Already Deployed
**Status**: ✅ Complete  
**What was done**: Changed `generateLink({ type: 'signup' })` → `generateLink({ type: 'magiclink' })`  
**Result**: Confirmation emails should now appear in Resend dashboard (but may still fail delivery)

---

## ⏳ Step 2: Domain Verification (YOU NEED TO DO THIS)

### Part A: Add Domain in Resend Dashboard (5 minutes)

1. **Go to Resend Dashboard**
   - Visit: https://resend.com/domains
   - Login to your Resend account

2. **Add Domain**
   - Click "Add Domain" button
   - Enter: `bookbridge.app`
   - Choose purpose: **"Transactional"** (for auth emails)
   - Click "Add"

3. **Copy DNS Records**
   - Resend will show you **2 DNS records** to add:
     - **SPF Record** (TXT record)
     - **DKIM Record** (TXT record)
   - **Copy both records** - you'll need them in Part B

---

### Part B: Add DNS Records to Your Domain (10 minutes)

**YOU NEED TO DO THIS**: I cannot access your domain DNS settings.

1. **Go to Your Domain Registrar**
   - Where did you register `bookbridge.app`?
     - Namecheap? → Go to Namecheap DNS settings
     - GoDaddy? → Go to GoDaddy DNS settings
     - Cloudflare? → Go to Cloudflare DNS settings
     - Other? → Find DNS management section

2. **Add SPF Record**
   - Type: **TXT**
   - Name/Host: **@** (or leave blank, or `bookbridge.app`)
   - Value: **Paste the SPF value from Resend** (looks like `v=spf1 include:amazonses.com ~all`)
   - TTL: 3600 (or default)

3. **Add DKIM Record**
   - Type: **TXT**
   - Name/Host: **resend._domainkey** (or `resend._domainkey.bookbridge.app`)
   - Value: **Paste the DKIM value from Resend** (long string)
   - TTL: 3600 (or default)

4. **Save Changes**
   - Click "Save" or "Add Record"
   - DNS changes can take 15-60 minutes to propagate

---

### Part C: Verify Domain in Resend (15-60 minutes wait)

1. **Wait for DNS Propagation** (15-60 minutes)
   - DNS changes need time to propagate globally
   - You can check if records are live:
     ```bash
     # Check SPF record
     dig TXT bookbridge.app
     
     # Check DKIM record  
     dig TXT resend._domainkey.bookbridge.app
     ```

2. **Verify in Resend Dashboard**
   - Go back to Resend Dashboard → Domains
   - Find `bookbridge.app`
   - Click **"Verify"** button
   - Wait for green checkmark ✅
   - If it fails, wait longer (up to 60 minutes) and try again

3. **Test Email from Dashboard** (Optional)
   - In Resend dashboard, click "Send test email"
   - Send to your personal email
   - Verify it arrives

---

## ⏳ Step 3: Update Environment Variable (I CAN HELP WITH THIS)

**After domain is verified**, I'll need you to:
1. Go to Render Dashboard → Your Service → Environment
2. Add/Update: `AUTH_FROM_EMAIL="BookBridge <noreply@bookbridge.app>"`
3. Save (Render will auto-restart)

**OR** tell me when domain is verified and I can prepare the exact command/instructions.

---

## ✅ Step 4: Test Confirmation Flow

**After domain verification and env var update**:
1. Sign up with a test email (not your account owner email)
2. Check Resend dashboard - email should appear
3. Check test email inbox - should receive confirmation email
4. Verify sender is `noreply@bookbridge.app`
5. Click confirmation link - should work

---

## 📊 What to Check

**In Resend Dashboard**:
- ✅ Domain shows as "Verified"
- ✅ Emails appear in "Emails" section
- ✅ Delivery rate >95%
- ✅ Bounce rate <4%

**In Render Logs**:
- ✅ `[AuthEmailService] ✅ Confirmation email sent successfully!`
- ❌ No `Failed to send confirmation email` errors

---

## 🆘 If Something Goes Wrong

**DNS Records Not Showing**:
- Wait longer (up to 60 minutes)
- Check DNS record names match exactly (case-sensitive)
- Verify you're editing the correct domain

**Verification Fails**:
- Double-check DNS records are correct
- Use `dig` command to verify records are live
- Contact Resend support if still failing

**Emails Still Not Sending**:
- Check `AUTH_FROM_EMAIL` env var is set correctly
- Verify domain is verified in Resend
- Check Render logs for errors

