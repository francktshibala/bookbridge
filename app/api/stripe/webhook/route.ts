import { NextRequest, NextResponse } from 'next/server';
import { stripe } from '@/lib/stripe';
import { createClient } from '@/lib/supabase/server';
import Stripe from 'stripe';

const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

export async function POST(request: NextRequest) {
  if (!webhookSecret) {
    console.warn('STRIPE_WEBHOOK_SECRET is not set - skipping webhook processing');
    return NextResponse.json(
      { message: 'Webhook processing skipped - no secret configured' },
      { status: 200 }
    );
  }

  const body = await request.text();
  const sig = request.headers.get('stripe-signature');

  if (!sig) {
    return NextResponse.json(
      { error: 'No signature' },
      { status: 400 }
    );
  }

  let event: Stripe.Event;

  try {
    event = stripe.webhooks.constructEvent(body, sig, webhookSecret);
  } catch (err) {
    console.error('Webhook signature verification failed:', err);
    return NextResponse.json(
      { error: 'Webhook signature verification failed' },
      { status: 400 }
    );
  }

  const supabase = await createClient();

  try {
    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object as Stripe.Checkout.Session;
        
        if (session.mode === 'subscription' && session.subscription) {
          const subscription = await stripe.subscriptions.retrieve(
            session.subscription as string
          );

          const userId = session.metadata?.userId;
          const tier = session.metadata?.tier;

          if (!userId || !tier) {
            console.error('Missing metadata in checkout session');
            break;
          }

          // Update subscription record
          const supabaseClient = await supabase;
          const { error } = await supabaseClient
            .from('subscriptions')
            .update({
              tier: tier as 'premium' | 'student',
              stripeSubscriptionId: subscription.id,
              currentPeriodStart: new Date((subscription as any).current_period_start * 1000).toISOString(),
              currentPeriodEnd: new Date((subscription as any).current_period_end * 1000).toISOString(),
              cancelAtPeriodEnd: (subscription as any).cancel_at_period_end,
            })
            .eq('userId', userId);

          if (error) {
            console.error('Failed to update subscription:', error);
          } else {
            console.log(`Subscription activated for user ${userId}: ${tier}`);
            
            // Create payment history record
            const supabaseClient = await supabase;
            await supabaseClient
              .from('payment_history')
              .insert({
                userId,
                stripePaymentIntentId: session.payment_intent as string,
                amount: session.amount_total || 0,
                currency: session.currency || 'usd',
                status: 'succeeded',
                description: `${tier} subscription activation`,
              });
          }
        }
        break;
      }

      case 'customer.subscription.updated': {
        const subscription = event.data.object as Stripe.Subscription;
        
        const customer = await stripe.customers.retrieve(subscription.customer as string);
        
        if ('metadata' in customer && customer.metadata?.supabaseUserId) {
          const userId = customer.metadata.supabaseUserId;

          const { error } = await supabase
            .from('subscriptions')
            .update({
              currentPeriodStart: new Date((subscription as any).current_period_start * 1000).toISOString(),
              currentPeriodEnd: new Date((subscription as any).current_period_end * 1000).toISOString(),
              cancelAtPeriodEnd: (subscription as any).cancel_at_period_end,
            })
            .eq('userId', userId);

          if (error) {
            console.error('Failed to update subscription:', error);
          }
        }
        break;
      }

      case 'customer.subscription.deleted': {
        const subscription = event.data.object as Stripe.Subscription;
        
        const customer = await stripe.customers.retrieve(subscription.customer as string);
        
        if ('metadata' in customer && customer.metadata?.supabaseUserId) {
          const userId = customer.metadata.supabaseUserId;

          // Downgrade to free tier
          const { error } = await supabase
            .from('subscriptions')
            .update({
              tier: 'free',
              stripeSubscriptionId: null,
              currentPeriodStart: null,
              currentPeriodEnd: null,
              cancelAtPeriodEnd: false,
            })
            .eq('userId', userId);

          if (error) {
            console.error('Failed to downgrade subscription:', error);
          } else {
            console.log(`Subscription cancelled for user ${userId}`);
          }
        }
        break;
      }

      case 'invoice.payment_succeeded': {
        const invoice = event.data.object as Stripe.Invoice;
        
        if ((invoice as any).subscription) {
          const subscription = await stripe.subscriptions.retrieve(
            (invoice as any).subscription as string
          );
          
          const customer = await stripe.customers.retrieve(subscription.customer as string);
          
          if ('metadata' in customer && customer.metadata?.supabaseUserId) {
            const userId = customer.metadata.supabaseUserId;

            // Create payment history record
            const supabaseClient = await supabase;
            await supabaseClient
              .from('payment_history')
              .insert({
                userId,
                stripePaymentIntentId: (invoice as any).payment_intent as string,
                amount: invoice.amount_paid,
                currency: invoice.currency,
                status: 'succeeded',
                description: 'Subscription renewal',
              });
          }
        }
        break;
      }

      case 'invoice.payment_failed': {
        const invoice = event.data.object as Stripe.Invoice;
        
        if ((invoice as any).subscription) {
          const subscription = await stripe.subscriptions.retrieve(
            (invoice as any).subscription as string
          );
          
          const customer = await stripe.customers.retrieve(subscription.customer as string);
          
          if ('metadata' in customer && customer.metadata?.supabaseUserId) {
            const userId = customer.metadata.supabaseUserId;

            // Create payment history record
            const supabaseClient = await supabase;
            await supabaseClient
              .from('payment_history')
              .insert({
                userId,
                stripePaymentIntentId: (invoice as any).payment_intent as string,
                amount: invoice.amount_due,
                currency: invoice.currency,
                status: 'failed',
                description: 'Failed subscription payment',
              });
          }
        }
        break;
      }

      default:
        console.log(`Unhandled event type: ${event.type}`);
    }

    return NextResponse.json({ received: true });

  } catch (error) {
    console.error('Webhook handler error:', error);
    return NextResponse.json(
      { error: 'Webhook handler failed' },
      { status: 500 }
    );
  }
}