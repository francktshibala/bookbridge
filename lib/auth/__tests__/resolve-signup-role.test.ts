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

  it('rejects a missing role on password signup', () => {
    const result = resolveSignupRole({ requestedRole: null, authMethod: 'password' });
    expect(result.role).toBeNull();
    expect(result.error).toBeDefined();
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
