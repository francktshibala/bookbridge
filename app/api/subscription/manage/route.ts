import { NextRequest, NextResponse } from 'next/server';
import { getStripe } from '@/lib/stripe';
import { createClient } from '@/lib/supabase/server';

export async function POST(request: NextRequest) {
  try {
    const stripe = getStripe();
    const { action } = await request.json();

    if (!action || !['cancel', 'portal'].includes(action)) {
      return NextResponse.json(
        { error: 'Invalid action' },
        { status: 400 }
      );
    }

    // Get user from Supabase
    const supabase = await createClient();
    const { data: { user }, error: userError } = await supabase.auth.getUser();

    if (userError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Get user's subscription
    const { data: subscription, error: subError } = await supabase
      .from('subscriptions')
      .select('stripeCustomerId, stripeSubscriptionId')
      .eq('userId', user.id)
      .single();

    if (subError || !subscription?.stripeCustomerId) {
      return NextResponse.json(
        { error: 'No subscription found' },
        { status: 404 }
      );
    }

    if (action === 'cancel') {
      if (!subscription.stripeSubscriptionId) {
        return NextResponse.json(
          { error: 'No active subscription to cancel' },
          { status: 400 }
        );
      }

      // Cancel subscription at period end
      await stripe.subscriptions.update(subscription.stripeSubscriptionId, {
        cancel_at_period_end: true,
      });

      // Update local record
      await supabase
        .from('subscriptions')
        .update({ cancelAtPeriodEnd: true })
        .eq('userId', user.id);

      return NextResponse.json({ 
        message: 'Subscription will be cancelled at the end of the current period' 
      });

    } else if (action === 'portal') {
      // Create customer portal session
      const portalSession = await stripe.billingPortal.sessions.create({
        customer: subscription.stripeCustomerId,
        return_url: `${request.nextUrl.origin}/subscription/manage`,
      });

      return NextResponse.json({ 
        url: portalSession.url 
      });
    }

  } catch (error) {
    console.error('Subscription management failed:', error);
    return NextResponse.json(
      { error: 'Failed to manage subscription' },
      { status: 500 }
    );
  }
}