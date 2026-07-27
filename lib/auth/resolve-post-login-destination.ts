import type { SignupRole } from '@/lib/auth/resolve-signup-role';

/**
 * TEACHER currently maps to '/catalog', same as STUDENT - the Teacher
 * Dashboard doesn't exist yet. Once it ships, change TEACHER's entry
 * below to its route; update resolve-post-login-destination.test.ts
 * alongside it.
 */
export function resolvePostLoginDestination(role: SignupRole | null): string {
  switch (role) {
    case 'TEACHER':
      return '/catalog';
    case 'STUDENT':
      return '/catalog';
    default:
      return '/catalog';
  }
}
