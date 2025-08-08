import Stripe from 'stripe';

if (!process.env.STRIPE_SECRET_KEY) {
  throw new Error('STRIPE_SECRET_KEY is not set');
}

export const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
  apiVersion: '2025-06-30.basil',
  typescript: true,
});

// Stripe product and price configuration
export const STRIPE_CONFIG = {
  products: {
    premium: {
      name: 'BookBridge Premium',
      description: 'Unlimited book analysis, voice features, and priority support',
    },
    student: {
      name: 'BookBridge Student',
      description: 'Unlimited book analysis and voice features for students',
    },
  },
  prices: {
    premium: {
      amount: 400, // $4.00 in cents
      currency: 'usd',
      interval: 'month',
    },
    student: {
      amount: 200, // $2.00 in cents
      currency: 'usd',
      interval: 'month',
    },
  },
} as const;

// Client-side Stripe configuration
export const getStripeClientConfig = () => {
  if (!process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY) {
    throw new Error('NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY is not set');
  }
  return {
    publishableKey: process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY,
  };
};