import { resolvePostLoginDestination } from '@/lib/auth/resolve-post-login-destination';

describe('resolvePostLoginDestination', () => {
  it('sends students to the catalog', () => {
    expect(resolvePostLoginDestination('STUDENT')).toBe('/catalog');
  });

  it('sends teachers to the Teacher Dashboard', () => {
    expect(resolvePostLoginDestination('TEACHER')).toBe('/dashboard');
  });

  it('defaults to the catalog when role is unknown', () => {
    expect(resolvePostLoginDestination(null)).toBe('/catalog');
  });
});
