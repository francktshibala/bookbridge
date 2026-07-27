import { resolvePostLoginDestination } from '@/lib/auth/resolve-post-login-destination';

describe('resolvePostLoginDestination', () => {
  it('sends students to the catalog', () => {
    expect(resolvePostLoginDestination('STUDENT')).toBe('/catalog');
  });

  it('sends teachers to the catalog for now (no Teacher Dashboard yet)', () => {
    // Once the Teacher Dashboard feature ships, this becomes '/dashboard' -
    // this test should be updated alongside that change, not before.
    expect(resolvePostLoginDestination('TEACHER')).toBe('/catalog');
  });

  it('defaults to the catalog when role is unknown', () => {
    expect(resolvePostLoginDestination(null)).toBe('/catalog');
  });
});
