export type SignupRole = 'TEACHER' | 'STUDENT';

export interface ResolveSignupRoleInput {
  requestedRole?: string | null;
  authMethod: 'password' | 'oauth';
  existingRole?: string | null;
}

export interface ResolveSignupRoleResult {
  role: SignupRole | null;
  needsRolePrompt: boolean;
  error?: string;
}

const VALID_ROLES: SignupRole[] = ['TEACHER', 'STUDENT'];

export function normalizeRole(value: string | null | undefined): SignupRole | null {
  if (!value) return null;
  const upper = value.toUpperCase();
  return (VALID_ROLES as string[]).includes(upper) ? (upper as SignupRole) : null;
}

export function resolveSignupRole(input: ResolveSignupRoleInput): ResolveSignupRoleResult {
  const existingRole = normalizeRole(input.existingRole);
  if (existingRole) {
    return { role: existingRole, needsRolePrompt: false };
  }

  if (input.authMethod === 'oauth') {
    return { role: null, needsRolePrompt: true };
  }

  if (!input.requestedRole) {
    // No role field at all (e.g. a stale cached client mid-deploy) - don't
    // hard-fail signup, prompt for a role afterward instead.
    return { role: null, needsRolePrompt: true };
  }

  const requestedRole = normalizeRole(input.requestedRole);
  if (!requestedRole) {
    return {
      role: null,
      needsRolePrompt: true,
      error: `A valid role is required (one of: ${VALID_ROLES.join(', ')})`,
    };
  }

  return { role: requestedRole, needsRolePrompt: false };
}
