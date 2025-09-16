import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

// Minimal handler for App Store Server Notifications V2
// https://developer.apple.com/documentation/appstoreservernotifications

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    // Signed payload contains notificationType and data
    // For MVP, store payload and opportunistically update subscription if possible
    const supabase = await createClient();

    const signedPayload = body.signedPayload as string | undefined;
    if (!signedPayload) {
      return NextResponse.json({ received: true });
    }

    // Store raw notification for debugging in apple_transactions with null user
    await supabase.from('apple_transactions').insert({ signedPayload });

    // Optionally decode JWT locally (no secret required); but we keep MVP simple
    // In production, verify JWS with Apple public keys and parse fields

    return NextResponse.json({ received: true });
  } catch (err) {
    console.error('Apple notifications error', err);
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}


