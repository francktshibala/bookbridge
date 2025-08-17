import { NextRequest, NextResponse } from 'next/server';
import { getStripe, STRIPE_CONFIG } from '@/lib/stripe';
import { createClient } from '@supabase/supabase-js';

export async function POST(request: NextRequest) {
  try {
    const stripe = getStripe();
    const { tier, userId, userEmail } = await request.json();

    if (!tier || !['premium', 'student'].includes(tier)) {
      return NextResponse.json(
        { error: 'Invalid subscription tier' },
        { status: 400 }
      );
    }

    // For testing, we'll accept user info from the frontend
    // In production, you'd want proper auth validation
    if (!userId || !userEmail) {
      return NextResponse.json(
        { error: 'User information required' },
        { status: 400 }
      );
    }

    const user = { id: userId, email: userEmail };

    // Get or create Stripe customer
    let customerId: string;
    
    // Initialize Supabase with service role for database operations
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    // Check if user already has a Stripe customer ID
    const { data: subscription } = await supabase
      .from('subscriptions')
      .select('stripeCustomerId')
      .eq('userId', user.id)
      .single();

    if (subscription?.stripeCustomerId) {
      customerId = subscription.stripeCustomerId;
    } else {
      // Create new Stripe customer
      const customer = await stripe.customers.create({
        email: user.email,
        metadata: {
          supabaseUserId: user.id,
        },
      });
      customerId = customer.id;

      // Update subscription record with Stripe customer ID
      await supabase
        .from('subscriptions')
        .upsert({
          userId: user.id,
          tier: 'free', // Keep current tier until payment succeeds
          stripeCustomerId: customerId,
        });
    }

    // Create checkout session
    const session = await stripe.checkout.sessions.create({
      customer: customerId,
      mode: 'subscription',
      payment_method_types: ['card'],
      line_items: [
        {
          price_data: {
            currency: STRIPE_CONFIG.prices[tier as keyof typeof STRIPE_CONFIG.prices].currency,
            product_data: {
              name: STRIPE_CONFIG.products[tier as keyof typeof STRIPE_CONFIG.products].name,
              description: STRIPE_CONFIG.products[tier as keyof typeof STRIPE_CONFIG.products].description,
            },
            unit_amount: STRIPE_CONFIG.prices[tier as keyof typeof STRIPE_CONFIG.prices].amount,
            recurring: {
              interval: STRIPE_CONFIG.prices[tier as keyof typeof STRIPE_CONFIG.prices].interval,
            },
          },
          quantity: 1,
        },
      ],
      success_url: `${request.nextUrl.origin}/subscription/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${request.nextUrl.origin}/subscription/pricing`,
      metadata: {
        userId: user.id,
        tier,
      },
    });

    return NextResponse.json({ 
      sessionId: session.id,
      url: session.url 
    });

  } catch (error) {
    console.error('Stripe checkout session creation failed:', error);
    return NextResponse.json(
      { error: 'Failed to create checkout session' },
      { status: 500 }
    );
  }
}