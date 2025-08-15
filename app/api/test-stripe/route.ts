import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  try {
    const stripeSecretKey = process.env.STRIPE_SECRET_KEY;
    const stripePublishableKey = process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY;

    return NextResponse.json({
      stripeConfigured: {
        secretKey: !!stripeSecretKey,
        publishableKey: !!stripePublishableKey,
        secretKeyPrefix: stripeSecretKey?.substring(0, 10) + '...',
        publishableKeyPrefix: stripePublishableKey?.substring(0, 10) + '...'
      }
    });
  } catch (error) {
    return NextResponse.json(
      { error: 'Configuration check failed', details: error },
      { status: 500 }
    );
  }
}