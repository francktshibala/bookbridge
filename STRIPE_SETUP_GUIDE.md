# Stripe Integration Setup Guide

## 📋 Environment Variables Required

Add these to your `.env.local` file:

```bash
# Stripe Keys (Get from Stripe Dashboard)
STRIPE_SECRET_KEY=sk_test_... # or sk_live_... for production
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_... # or pk_live_... for production
STRIPE_WEBHOOK_SECRET=whsec_... # Generated when creating webhook
```

## 🔧 Stripe Dashboard Setup

### 1. Create Stripe Account
1. Go to [Stripe Dashboard](https://dashboard.stripe.com)
2. Create account or log in
3. Switch to Test mode for development

### 2. Get API Keys
1. Go to **Developers > API keys**
2. Copy **Publishable key** → `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY`
3. Reveal and copy **Secret key** → `STRIPE_SECRET_KEY`

### 3. Create Webhook Endpoint
1. Go to **Developers > Webhooks**
2. Click **Add endpoint**
3. Endpoint URL: `https://your-domain.com/api/stripe/webhook`
4. Events to send:
   - `checkout.session.completed`
   - `customer.subscription.updated`
   - `customer.subscription.deleted`
   - `invoice.payment_succeeded`
   - `invoice.payment_failed`
5. Copy **Signing secret** → `STRIPE_WEBHOOK_SECRET`

### 4. Test with Stripe CLI (Optional)
```bash
# Install Stripe CLI
npm install -g stripe-cli

# Login to Stripe
stripe login

# Forward events to local webhook
stripe listen --forward-to localhost:3000/api/stripe/webhook
```

## 💳 Test Payment Cards

Use these test cards in development:

```
# Successful payment
4242 4242 4242 4242

# Requires authentication
4000 0025 0000 3155

# Declined payment
4000 0000 0000 0002

# Expiry: Any future date
# CVC: Any 3 digits
# ZIP: Any 5 digits
```

## 🎯 Features Implemented

### ✅ Payment Processing
- **Checkout Sessions**: `/api/stripe/create-checkout-session`
- **Webhook Handler**: `/api/stripe/webhook`
- **Subscription Management**: `/api/subscription/manage`

### ✅ User Interface
- **Pricing Page**: `/subscription/pricing`
- **Success Page**: `/subscription/success`
- **Management Page**: `/subscription/manage`

### ✅ Subscription Tiers
- **Free**: 3 books/month, unlimited public domain
- **Premium**: $4/month, unlimited analysis + voice features
- **Student**: $2/month, unlimited analysis + voice features

## 🚀 Testing Checklist

1. **Environment Setup**
   - [ ] Add Stripe keys to `.env.local`
   - [ ] Restart development server

2. **Payment Flow**
   - [ ] Visit `/subscription/pricing`
   - [ ] Click "Get Premium" or "Get Student"
   - [ ] Complete checkout with test card
   - [ ] Verify redirect to success page
   - [ ] Check subscription status in `/test-subscription`

3. **Webhook Testing**
   - [ ] Set up webhook endpoint in Stripe
   - [ ] Complete test payment
   - [ ] Check database for updated subscription
   - [ ] Verify payment history record

4. **Subscription Management**
   - [ ] Visit `/subscription/manage`
   - [ ] Test billing portal access
   - [ ] Test subscription cancellation

## 🔐 Security Notes

- Webhook signatures are verified for security
- All payment processing happens on Stripe's secure servers
- User data is protected with Supabase RLS policies
- No sensitive payment data is stored locally

## 📞 Support

For Stripe integration issues:
1. Check Stripe Dashboard logs
2. Review webhook delivery attempts
3. Test with Stripe CLI for local development
4. Verify environment variables are set correctly

## 🎉 Production Deployment

Before going live:
1. Switch to Stripe live mode
2. Update environment variables with live keys
3. Update webhook endpoint URL to production domain
4. Test payment flow thoroughly
5. Set up monitoring for webhook failures