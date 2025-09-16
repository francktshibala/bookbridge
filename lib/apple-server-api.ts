import jwt from 'jsonwebtoken';

type AppleEnv = 'Production' | 'Sandbox';

interface CreateJwtOptions {
  keyId: string;
  issuerId: string;
  bundleId: string;
  privateKey: string; // contents of .p8 key
}

export function createAppleServerApiJWT(options: CreateJwtOptions): string {
  const nowSeconds = Math.floor(Date.now() / 1000);

  const payload = {
    iss: options.issuerId,
    iat: nowSeconds,
    exp: nowSeconds + 1800,
    aud: 'appstoreconnect-v1',
    bid: options.bundleId,
  } as const;

  const token = jwt.sign(payload, options.privateKey, {
    algorithm: 'ES256',
    keyid: options.keyId,
  });

  return token;
}

export async function getSubscriptionStatus(params: {
  originalTransactionId: string;
  environment: AppleEnv;
  jwtToken: string;
}): Promise<Response> {
  const base = params.environment === 'Production'
    ? 'https://api.storekit.itunes.apple.com'
    : 'https://api.storekit-sandbox.itunes.apple.com';

  const url = `${base}/inApps/v1/subscriptions/${params.originalTransactionId}`;

  const resp = await fetch(url, {
    method: 'GET',
    headers: {
      Authorization: `Bearer ${params.jwtToken}`,
    },
  });

  return resp;
}

export async function getTransactionInfo(params: {
  transactionId: string;
  environment: AppleEnv;
  jwtToken: string;
}): Promise<Response> {
  const base = params.environment === 'Production'
    ? 'https://api.storekit.itunes.apple.com'
    : 'https://api.storekit-sandbox.itunes.apple.com';
  const url = `${base}/inApps/v1/transactions/${params.transactionId}`;

  const resp = await fetch(url, {
    method: 'GET',
    headers: {
      Authorization: `Bearer ${params.jwtToken}`,
    },
  });

  return resp;
}


