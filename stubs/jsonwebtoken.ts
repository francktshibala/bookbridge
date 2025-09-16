// Minimal browser stub for jsonwebtoken to avoid bundling Node-only code in web builds
// This module should never run at runtime in the browser; it exists to satisfy bundling.

export type Algorithm = 'HS256' | 'HS384' | 'HS512' | 'RS256' | 'RS384' | 'RS512' | 'ES256' | 'ES384' | 'ES512' | 'PS256' | 'PS384' | 'PS512' | 'none';

export interface SignOptions {
  algorithm?: Algorithm;
  keyid?: string;
  expiresIn?: string | number;
  notBefore?: string | number;
  audience?: string | string[];
  subject?: string;
  issuer?: string;
  jwtid?: string;
  mutatePayload?: boolean;
  noTimestamp?: boolean;
  header?: object;
}

export function sign(): never {
  throw new Error('jsonwebtoken is not available in the browser/stub environment');
}

export function verify(): never {
  throw new Error('jsonwebtoken is not available in the browser/stub environment');
}

export function decode(): never {
  throw new Error('jsonwebtoken is not available in the browser/stub environment');
}

export default { sign, verify, decode };


