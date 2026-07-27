import { buildUserSignupPayload } from '@/lib/auth/build-user-signup-payload';

describe('buildUserSignupPayload', () => {
  it('builds a payload with the real email, name, and role', () => {
    const payload = buildUserSignupPayload({
      id: 'user-123',
      email: 'teacher@example.com',
      name: 'Jane Doe',
      role: 'TEACHER',
    });
    expect(payload).toEqual({
      id: 'user-123',
      email: 'teacher@example.com',
      name: 'Jane Doe',
      role: 'TEACHER',
    });
  });

  it('defaults name to null when not provided', () => {
    const payload = buildUserSignupPayload({
      id: 'user-123',
      email: 'student@example.com',
      role: 'STUDENT',
    });
    expect(payload.name).toBeNull();
  });

  it('defaults role to null when not provided (e.g. OAuth pending role prompt)', () => {
    const payload = buildUserSignupPayload({
      id: 'user-123',
      email: 'oauth-user@example.com',
      name: 'OAuth User',
      role: null,
    });
    expect(payload.role).toBeNull();
  });

  it('never falls back to a placeholder email', () => {
    const payload = buildUserSignupPayload({
      id: 'user-123',
      email: 'real@example.com',
      role: null,
    });
    expect(payload.email).toBe('real@example.com');
    expect(payload.email).not.toContain('@temp.com');
  });
});
