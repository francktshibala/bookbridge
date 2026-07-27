export interface AuthorizeTeacherClassInput {
  requestingUserId: string;
  klass: { teacherId: string } | null;
}

export interface AuthorizeTeacherClassResult {
  authorized: boolean;
  reason?: 'not_found' | 'not_owner';
}

/**
 * Collapses "class doesn't exist" and "class exists but isn't yours" into
 * the same caller-facing result (both `authorized: false`) so a route can
 * return a uniform 404 without leaking whether a given class id belongs to
 * someone else. `reason` is for server-side logging only, never the response.
 */
export function authorizeTeacherClass(input: AuthorizeTeacherClassInput): AuthorizeTeacherClassResult {
  if (!input.klass) {
    return { authorized: false, reason: 'not_found' };
  }
  if (input.klass.teacherId !== input.requestingUserId) {
    return { authorized: false, reason: 'not_owner' };
  }
  return { authorized: true };
}
