import { resolveSignupRole } from '@/lib/auth/resolve-signup-role';

describe('resolveSignupRole', () => {
  it('accepts an explicit valid role on password signup', () => {
    const result = resolveSignupRole({ requestedRole: 'TEACHER', authMethod: 'password' });
    expect(result.role).toBe('TEACHER');
    expect(result.needsRolePrompt).toBe(false);
    expect(result.error).toBeUndefined();
  });

  it('normalizes a lowercase role value', () => {
    const result = resolveSignupRole({ requestedRole: 'student', authMethod: 'password' });
    expect(result.role).toBe('STUDENT');
    expect(result.error).toBeUndefined();
  });

  it('treats a missing role on password signup as needing a prompt, not an error', () => {
    // A stale cached client (open tab from before a deploy) may call this API
    // with no role field at all - that must not hard-fail signup. Only a
    // present-but-invalid value is rejected; see next test.
    const result = resolveSignupRole({ requestedRole: null, authMethod: 'password' });
    expect(result.role).toBeNull();
    expect(result.needsRolePrompt).toBe(true);
    expect(result.error).toBeUndefined();
  });

  it('rejects an invalid role value on password signup', () => {
    const result = resolveSignupRole({ requestedRole: 'ADMIN', authMethod: 'password' });
    expect(result.role).toBeNull();
    expect(result.error).toBeDefined();
  });

  it('flags OAuth signup as needing a role prompt, with no error', () => {
    const result = resolveSignupRole({ authMethod: 'oauth' });
    expect(result.role).toBeNull();
    expect(result.needsRolePrompt).toBe(true);
    expect(result.error).toBeUndefined();
  });

  it('never overwrites an existing role on password re-auth', () => {
    const result = resolveSignupRole({
      requestedRole: 'STUDENT',
      authMethod: 'password',
      existingRole: 'TEACHER',
    });
    expect(result.role).toBe('TEACHER');
    expect(result.needsRolePrompt).toBe(false);
    expect(result.error).toBeUndefined();
  });

  it('never overwrites an existing role on OAuth re-auth', () => {
    const result = resolveSignupRole({ authMethod: 'oauth', existingRole: 'STUDENT' });
    expect(result.role).toBe('STUDENT');
    expect(result.needsRolePrompt).toBe(false);
  });
});
