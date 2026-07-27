'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/components/SimpleAuthProvider';

const isTeacherDashboardEnabled = process.env.NEXT_PUBLIC_TEACHER_DASHBOARD === 'true';

interface ClassSummary {
  id: string;
  name: string;
  code: string;
  createdAt: string;
  _count: { enrollments: number };
}

export default function TeacherDashboardPage() {
  const router = useRouter();
  const { user, loading, role } = useAuth();
  const [classes, setClasses] = useState<ClassSummary[] | null>(null);
  const [newClassName, setNewClassName] = useState('');
  const [isCreating, setIsCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!isTeacherDashboardEnabled) {
      router.replace('/catalog');
      return;
    }
    if (loading) return;
    if (!user) {
      router.replace('/auth/login');
      return;
    }
    if (role !== 'TEACHER') {
      router.replace('/catalog');
    }
  }, [loading, user, role, router]);

  useEffect(() => {
    if (!user || role !== 'TEACHER') return;
    fetch('/api/classes')
      .then((res) => res.json())
      .then((data) => setClasses(data.classes ?? []))
      .catch(() => setError('Could not load your classes.'));
  }, [user, role]);

  const handleCreateClass = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newClassName.trim()) return;

    setIsCreating(true);
    setError(null);
    try {
      const response = await fetch('/api/classes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: newClassName.trim() }),
      });
      const result = await response.json();
      if (!response.ok) {
        throw new Error(result.error || 'Failed to create class');
      }
      setClasses((prev) => [{ ...result.class, _count: { enrollments: 0 } }, ...(prev ?? [])]);
      setNewClassName('');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong.');
    } finally {
      setIsCreating(false);
    }
  };

  if (!isTeacherDashboardEnabled || loading || !user || role !== 'TEACHER') {
    return null;
  }

  return (
    <div className="page-container min-h-screen bg-[var(--bg-primary)] text-[var(--text-primary)]" style={{ padding: '48px 24px' }}>
      <div className="w-full max-w-3xl mx-auto">
        <h1 style={{
          fontSize: '2rem',
          fontWeight: 700,
          marginBottom: '8px',
          color: 'var(--text-accent)',
          fontFamily: 'Playfair Display, serif',
        }}>
          Your classes
        </h1>
        <p style={{
          fontSize: '15px',
          color: 'var(--text-secondary)',
          marginBottom: '32px',
          fontFamily: 'Source Serif Pro, Georgia, serif',
        }}>
          Create a class, share the invite code with your students, and see who's joined.
        </p>

        <form
          onSubmit={handleCreateClass}
          style={{
            display: 'flex',
            gap: '12px',
            marginBottom: '32px',
            background: 'var(--bg-secondary)',
            border: '2px solid var(--border-light)',
            borderRadius: '16px',
            padding: '16px',
          }}
        >
          <input
            type="text"
            value={newClassName}
            onChange={(e) => setNewClassName(e.target.value)}
            placeholder="e.g. Intermediate ESL - Fall 2026"
            disabled={isCreating}
            style={{
              flex: 1,
              padding: '12px 16px',
              borderRadius: '12px',
              border: '2px solid var(--border-light)',
              background: 'var(--bg-tertiary)',
              color: 'var(--text-primary)',
              fontSize: '15px',
              fontFamily: 'Source Serif Pro, Georgia, serif',
            }}
          />
          <button
            type="submit"
            disabled={isCreating || !newClassName.trim()}
            style={{
              padding: '12px 24px',
              background: 'var(--accent-primary)',
              color: 'var(--bg-primary)',
              border: 'none',
              borderRadius: '12px',
              fontSize: '15px',
              fontWeight: 700,
              fontFamily: 'Source Serif Pro, Georgia, serif',
              cursor: isCreating ? 'not-allowed' : 'pointer',
              opacity: isCreating || !newClassName.trim() ? 0.5 : 1,
              whiteSpace: 'nowrap',
            }}
          >
            {isCreating ? 'Creating...' : 'Create class'}
          </button>
        </form>

        {error && (
          <div role="alert" style={{ color: '#ef4444', fontWeight: 600, marginBottom: '20px', fontFamily: 'Source Serif Pro, Georgia, serif' }}>
            {error}
          </div>
        )}

        {classes === null ? (
          <p style={{ color: 'var(--text-secondary)' }}>Loading...</p>
        ) : classes.length === 0 ? (
          <p style={{ color: 'var(--text-secondary)', fontFamily: 'Source Serif Pro, Georgia, serif' }}>
            No classes yet - create one above to get an invite code for your students.
          </p>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {classes.map((klass) => (
              <button
                key={klass.id}
                onClick={() => router.push(`/dashboard/classes/${klass.id}`)}
                style={{
                  textAlign: 'left',
                  background: 'var(--bg-secondary)',
                  border: '2px solid var(--border-light)',
                  borderRadius: '16px',
                  padding: '20px',
                  cursor: 'pointer',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                }}
              >
                <div>
                  <div style={{ fontSize: '17px', fontWeight: 700, color: 'var(--text-primary)', fontFamily: 'Source Serif Pro, Georgia, serif' }}>
                    {klass.name}
                  </div>
                  <div style={{ fontSize: '14px', color: 'var(--text-secondary)', marginTop: '4px' }}>
                    {klass._count.enrollments} student{klass._count.enrollments === 1 ? '' : 's'}
                  </div>
                </div>
                <div style={{
                  fontFamily: 'monospace',
                  fontSize: '18px',
                  fontWeight: 700,
                  letterSpacing: '2px',
                  color: 'var(--accent-primary)',
                  background: 'var(--bg-tertiary)',
                  padding: '8px 14px',
                  borderRadius: '10px',
                }}>
                  {klass.code}
                </div>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
