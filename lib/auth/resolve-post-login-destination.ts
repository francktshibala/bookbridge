import type { SignupRole } from '@/lib/auth/resolve-signup-role';

export interface ResolvePostLoginDestinationOptions {
  teacherDashboardEnabled?: boolean;
}

export function resolvePostLoginDestination(
  role: SignupRole | null,
  options: ResolvePostLoginDestinationOptions = {}
): string {
  switch (role) {
    case 'TEACHER':
      return options.teacherDashboardEnabled ? '/dashboard' : '/catalog';
    case 'STUDENT':
      return '/catalog';
    default:
      return '/catalog';
  }
}
