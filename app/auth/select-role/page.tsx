'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/components/SimpleAuthProvider';

export default function SelectRolePage() {
  const router = useRouter();
  const { user, loading } = useAuth();
  const [role, setRole] = useState<'TEACHER' | 'STUDENT' | ''>('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!loading && !user) {
      router.replace('/auth/login');
    }
  }, [loading, user, router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!role) {
      setError('Please select whether you are a teacher or a student.');
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      const response = await fetch('/api/auth/set-role', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ role }),
      });

      if (!response.ok) {
        const result = await response.json();
        throw new Error(result.error || 'Failed to save role');
      }

      router.push('/catalog');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong. Please try again.');
      setIsSubmitting(false);
    }
  };

  if (loading || !user) {
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
          One last thing
        </h1>
        <p style={{
          fontSize: '15px',
          color: 'var(--text-secondary)',
          marginBottom: '24px',
          fontFamily: 'Source Serif Pro, Georgia, serif',
        }}>
          Are you signing up as a teacher or a student?
        </p>

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          <div role="radiogroup" aria-label="Account type" style={{ display: 'flex', gap: '12px' }}>
            {(['STUDENT', 'TEACHER'] as const).map((option) => (
              <button
                key={option}
                type="button"
                role="radio"
                aria-checked={role === option}
                disabled={isSubmitting}
                onClick={() => setRole(option)}
                style={{
                  flex: 1,
                  padding: '14px 16px',
                  borderRadius: '12px',
                  border: `2px solid ${role === option ? 'var(--accent-primary)' : 'var(--border-light)'}`,
                  background: role === option ? 'var(--accent-primary)' : 'var(--bg-tertiary)',
                  color: role === option ? 'var(--bg-primary)' : 'var(--text-primary)',
                  fontSize: '15px',
                  fontWeight: 600,
                  fontFamily: 'Source Serif Pro, Georgia, serif',
                  cursor: isSubmitting ? 'not-allowed' : 'pointer',
                  opacity: isSubmitting ? 0.5 : 1,
                }}
              >
                {option === 'STUDENT' ? 'Student' : 'Teacher'}
              </button>
            ))}
          </div>

          {error && (
            <div role="alert" style={{
              fontSize: '14px',
              color: '#ef4444',
              fontWeight: 600,
              fontFamily: 'Source Serif Pro, Georgia, serif',
            }}>
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={isSubmitting}
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
              cursor: isSubmitting ? 'not-allowed' : 'pointer',
              opacity: isSubmitting ? 0.7 : 1,
            }}
          >
            {isSubmitting ? 'Saving...' : 'Continue'}
          </button>
        </form>
      </div>
    </div>
  );
}
