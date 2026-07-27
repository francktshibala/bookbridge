import { resolvePostLoginDestination } from '@/lib/auth/resolve-post-login-destination';

describe('resolvePostLoginDestination', () => {
  it('sends students to the catalog', () => {
    expect(resolvePostLoginDestination('STUDENT')).toBe('/catalog');
  });

  it('sends teachers to the Teacher Dashboard when the flag is enabled', () => {
    expect(resolvePostLoginDestination('TEACHER', { teacherDashboardEnabled: true })).toBe('/dashboard');
  });

  it('sends teachers to the catalog when the flag is disabled or omitted (killable rollout)', () => {
    expect(resolvePostLoginDestination('TEACHER', { teacherDashboardEnabled: false })).toBe('/catalog');
    expect(resolvePostLoginDestination('TEACHER')).toBe('/catalog');
  });

  it('defaults to the catalog when role is unknown', () => {
    expect(resolvePostLoginDestination(null)).toBe('/catalog');
  });
});
