'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/components/SimpleAuthProvider';

const isTeacherDashboardEnabled = process.env.NEXT_PUBLIC_TEACHER_DASHBOARD === 'true';

export default function JoinClassPage() {
  const router = useRouter();
  const { user, loading, role } = useAuth();
  const [code, setCode] = useState('');
  const [isJoining, setIsJoining] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [joinedClassName, setJoinedClassName] = useState<string | null>(null);

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
    if (role !== 'STUDENT') {
      router.replace('/catalog');
    }
  }, [loading, user, role, router]);

  const handleJoin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!code.trim()) return;

    setIsJoining(true);
    setError(null);
    setJoinedClassName(null);
    try {
      const response = await fetch('/api/classes/join', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code: code.trim() }),
      });
      const result = await response.json();
      if (!response.ok) {
        throw new Error(result.error || 'Failed to join class');
      }
      setJoinedClassName(result.class.name);
      setCode('');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong.');
    } finally {
      setIsJoining(false);
    }
  };

  if (!isTeacherDashboardEnabled || loading || !user || role !== 'STUDENT') {
    return null;
  }

  return (
    <div className="page-container min-h-screen bg-[var(--bg-primary)] text-[var(--text-primary)] flex items-center justify-center" style={{ padding: '48px 24px' }}>
      <div className="w-full max-w-md mx-auto" style={{
        background: 'var(--bg-secondary)',
        borderRadius: '24px',
        boxShadow: '0 4px 6px var(--shadow-soft), 0 10px 25px var(--shadow-medium)',
        border: '2px solid var(--border-light)',
        padding: '40px',
      }}>
        <h1 style={{
          fontSize: '1.75rem',
          fontWeight: 700,
          marginBottom: '12px',
          color: 'var(--text-accent)',
          fontFamily: 'Playfair Display, serif',
        }}>
          Join a class
        </h1>
        <p style={{
          fontSize: '15px',
          color: 'var(--text-secondary)',
          marginBottom: '24px',
          fontFamily: 'Source Serif Pro, Georgia, serif',
        }}>
          Enter the code your teacher gave you.
        </p>

        <form onSubmit={handleJoin} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <input
            type="text"
            value={code}
            onChange={(e) => setCode(e.target.value.toUpperCase())}
            placeholder="e.g. X7K9P2"
            disabled={isJoining}
            style={{
              padding: '14px 16px',
              borderRadius: '12px',
              border: '2px solid var(--border-light)',
              background: 'var(--bg-tertiary)',
              color: 'var(--text-primary)',
              fontSize: '18px',
              fontFamily: 'monospace',
              letterSpacing: '2px',
              textAlign: 'center',
              textTransform: 'uppercase',
            }}
          />

          {error && (
            <div role="alert" style={{ fontSize: '14px', color: '#ef4444', fontWeight: 600, fontFamily: 'Source Serif Pro, Georgia, serif' }}>
              {error}
            </div>
          )}

          {joinedClassName && (
            <div role="status" style={{ fontSize: '14px', color: '#16a34a', fontWeight: 600, fontFamily: 'Source Serif Pro, Georgia, serif' }}>
              You've joined {joinedClassName}!
            </div>
          )}

          <button
            type="submit"
            disabled={isJoining || !code.trim()}
            style={{
              width: '100%',
              padding: '14px 24px',
              background: 'var(--accent-primary)',
              color: 'var(--bg-primary)',
              border: 'none',
              borderRadius: '16px',
              fontSize: '16px',
              fontWeight: 700,
              fontFamily: 'Source Serif Pro, Georgia, serif',
              cursor: isJoining ? 'not-allowed' : 'pointer',
              opacity: isJoining || !code.trim() ? 0.5 : 1,
            }}
          >
            {isJoining ? 'Joining...' : 'Join class'}
          </button>

          <button
            type="button"
            onClick={() => router.push('/catalog')}
            style={{
              background: 'none',
              border: 'none',
              color: 'var(--text-secondary)',
              fontSize: '14px',
              cursor: 'pointer',
              padding: 0,
            }}
          >
            Skip for now
          </button>
        </form>
      </div>
    </div>
  );
}
