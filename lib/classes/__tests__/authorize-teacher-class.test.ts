import { authorizeTeacherClass } from '@/lib/classes/authorize-teacher-class';

describe('authorizeTeacherClass', () => {
  it('authorizes the teacher who owns the class', () => {
    const result = authorizeTeacherClass({
      requestingUserId: 'teacher-1',
      klass: { teacherId: 'teacher-1' },
    });
    expect(result.authorized).toBe(true);
    expect(result.reason).toBeUndefined();
  });

  it('rejects a different teacher, without revealing the class exists', () => {
    const result = authorizeTeacherClass({
      requestingUserId: 'teacher-2',
      klass: { teacherId: 'teacher-1' },
    });
    expect(result.authorized).toBe(false);
    expect(result.reason).toBe('not_owner');
  });

  it('rejects when the class was not found', () => {
    const result = authorizeTeacherClass({
      requestingUserId: 'teacher-1',
      klass: null,
    });
    expect(result.authorized).toBe(false);
    expect(result.reason).toBe('not_found');
  });
});
