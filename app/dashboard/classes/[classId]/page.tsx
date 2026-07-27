'use client';

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { useAuth } from '@/components/SimpleAuthProvider';

interface RosterEntry {
  enrollmentId: string;
  studentId: string;
  name: string | null;
  email: string;
  joinedAt: string;
  booksRead: number;
  lastActivity: string | null;
}

export default function ClassRosterPage() {
  const router = useRouter();
  const params = useParams<{ classId: string }>();
  const { user, loading, role } = useAuth();
  const [roster, setRoster] = useState<RosterEntry[] | null>(null);
  const [notFound, setNotFound] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [removingId, setRemovingId] = useState<string | null>(null);

  useEffect(() => {
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
    fetch(`/api/classes/${params.classId}/roster`)
      .then(async (res) => {
        if (res.status === 404) {
          setNotFound(true);
          return;
        }
        const data = await res.json();
        setRoster(data.roster ?? []);
      })
      .catch(() => setError('Could not load the roster.'));
  }, [user, role, params.classId]);

  const handleRemove = async (studentId: string) => {
    setRemovingId(studentId);
    setError(null);
    try {
      const response = await fetch(`/api/classes/${params.classId}/roster/${studentId}`, {
        method: 'DELETE',
      });
      if (!response.ok) {
        const result = await response.json();
        throw new Error(result.error || 'Failed to remove student');
      }
      setRoster((prev) => prev?.filter((entry) => entry.studentId !== studentId) ?? null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong.');
    } finally {
      setRemovingId(null);
    }
  };

  if (loading || !user || role !== 'TEACHER') {
    return null;
  }

  return (
    <div className="page-container min-h-screen bg-[var(--bg-primary)] text-[var(--text-primary)]" style={{ padding: '48px 24px' }}>
      <div className="w-full max-w-3xl mx-auto">
        <button
          onClick={() => router.push('/dashboard')}
          style={{
            background: 'none',
            border: 'none',
            color: 'var(--text-secondary)',
            fontSize: '14px',
            cursor: 'pointer',
            marginBottom: '16px',
            padding: 0,
          }}
        >
          &larr; Back to your classes
        </button>

        <h1 style={{
          fontSize: '1.75rem',
          fontWeight: 700,
          marginBottom: '24px',
          color: 'var(--text-accent)',
          fontFamily: 'Playfair Display, serif',
        }}>
          Roster
        </h1>

        {error && (
          <div role="alert" style={{ color: '#ef4444', fontWeight: 600, marginBottom: '20px', fontFamily: 'Source Serif Pro, Georgia, serif' }}>
            {error}
          </div>
        )}

        {notFound ? (
          <p style={{ color: 'var(--text-secondary)' }}>Class not found.</p>
        ) : roster === null ? (
          <p style={{ color: 'var(--text-secondary)' }}>Loading...</p>
        ) : roster.length === 0 ? (
          <p style={{ color: 'var(--text-secondary)', fontFamily: 'Source Serif Pro, Georgia, serif' }}>
            No students have joined yet - share the invite code from your dashboard.
          </p>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {roster.map((entry) => (
              <div
                key={entry.enrollmentId}
                style={{
                  background: 'var(--bg-secondary)',
                  border: '2px solid var(--border-light)',
                  borderRadius: '16px',
                  padding: '20px',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                }}
              >
                <div>
                  <div style={{ fontSize: '16px', fontWeight: 700, fontFamily: 'Source Serif Pro, Georgia, serif' }}>
                    {entry.name || entry.email}
                  </div>
                  <div style={{ fontSize: '13px', color: 'var(--text-secondary)', marginTop: '4px' }}>
                    {entry.booksRead} book{entry.booksRead === 1 ? '' : 's'} read
                    {entry.lastActivity && ` · last active ${new Date(entry.lastActivity).toLocaleDateString()}`}
                  </div>
                </div>
                <button
                  onClick={() => handleRemove(entry.studentId)}
                  disabled={removingId === entry.studentId}
                  style={{
                    background: 'none',
                    border: '2px solid var(--border-light)',
                    color: 'var(--text-secondary)',
                    borderRadius: '10px',
                    padding: '8px 16px',
                    fontSize: '13px',
                    cursor: removingId === entry.studentId ? 'not-allowed' : 'pointer',
                    opacity: removingId === entry.studentId ? 0.5 : 1,
                  }}
                >
                  {removingId === entry.studentId ? 'Removing...' : 'Remove'}
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
