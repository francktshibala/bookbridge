import type { SignupRole } from '@/lib/auth/resolve-signup-role';

export function resolvePostLoginDestination(role: SignupRole | null): string {
  switch (role) {
    case 'TEACHER':
      return '/dashboard';
    case 'STUDENT':
      return '/catalog';
    default:
      return '/catalog';
  }
}
