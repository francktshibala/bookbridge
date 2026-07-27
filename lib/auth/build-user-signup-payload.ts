import type { SignupRole } from '@/lib/auth/resolve-signup-role';

export interface BuildUserSignupPayloadInput {
  id: string;
  email: string;
  name?: string | null;
  role: SignupRole | null;
}

export interface UserSignupPayload {
  id: string;
  email: string;
  name: string | null;
  role: string | null;
}

export function buildUserSignupPayload(input: BuildUserSignupPayloadInput): UserSignupPayload {
  return {
    id: input.id,
    email: input.email,
    name: input.name ?? null,
    role: input.role ?? null,
  };
}
