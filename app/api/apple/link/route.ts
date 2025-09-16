import { NextRequest, NextResponse } from 'next/server';
export const runtime = 'nodejs';
import { createClient } from '@/lib/supabase/server';
import { createAppleServerApiJWT, getSubscriptionStatus } from '@/lib/apple-server-api';

export async function POST(request: NextRequest) {
  try {
    const { originalTransactionId, environment = 'Sandbox' } = await request.json();
    if (!originalTransactionId) {
      return NextResponse.json({ error: 'originalTransactionId required' }, { status: 400 });
    }

    // Auth: require logged-in user
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Build Apple Server API JWT from env
    const keyId = process.env.APPLE_IAP_KEY_ID!;
    const issuerId = process.env.APPLE_IAP_ISSUER_ID!;
    const bundleId = process.env.NEXT_PUBLIC_IOS_BUNDLE_ID!;
    const privateKey = process.env.APPLE_IAP_PRIVATE_KEY!;

    if (!keyId || !issuerId || !bundleId || !privateKey) {
      return NextResponse.json({ error: 'Apple IAP env vars missing' }, { status: 500 });
    }

    const jwt = createAppleServerApiJWT({ keyId, issuerId, bundleId, privateKey });
    const resp = await getSubscriptionStatus({ originalTransactionId, environment, jwtToken: jwt });

    if (!resp.ok) {
      const text = await resp.text();
      return NextResponse.json({ error: 'Apple API error', details: text }, { status: 502 });
    }

    const statusJson = await resp.json();

    // Persist mapping and latest status
    const latest = statusJson.data?.[0];
    const productId = latest?.lastTransactions?.[0]?.signedTransactionInfo?.productId || latest?.items?.[0]?.productId;
    const expiresMs = latest?.lastTransactions?.[0]?.signedTransactionInfo?.expiresDate || latest?.expiresDate;

    const update: any = {
      appleOriginalTransactionId: originalTransactionId,
      appleEnvironment: environment,
      appleProductId: productId,
      updatedAt: new Date().toISOString(),
    };
    if (expiresMs) {
      const expiresDate = new Date(Number(expiresMs));
      update.appleExpiresDate = expiresDate.toISOString();
      update.currentPeriodEnd = expiresDate.toISOString();
    }

    await supabase
      .from('subscriptions')
      .update(update)
      .eq('userId', user.id);

    return NextResponse.json({ linked: true, status: statusJson });
  } catch (err: any) {
    console.error('Apple link error', err);
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}


