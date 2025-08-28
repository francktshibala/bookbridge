'use client';

import { useEffect, use } from 'react';
import { useRouter } from 'next/navigation';

interface BookDetailPageProps {
  params: Promise<{ id: string }>;
}

// This page is deprecated - redirect to reading page with browse source
export default function BookDetailPage({ params }: BookDetailPageProps) {
  const router = useRouter();
  const resolvedParams = use(params);

  useEffect(() => {
    // Automatically redirect to reading page with browse source
    router.replace(`/library/${resolvedParams.id}/read?source=browse`);
  }, [router, resolvedParams.id]);

  // Show loading while redirecting
  return (
    <div style={{
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      minHeight: '100vh',
      background: '#0f172a',
      color: '#94a3b8'
    }}>
      <div style={{ textAlign: 'center' }}>
        <div style={{ marginBottom: '16px', fontSize: '18px' }}>
          Redirecting to reading page...
        </div>
        <div style={{
          width: '32px',
          height: '32px',
          border: '3px solid #334155',
          borderTop: '3px solid #667eea',
          borderRadius: '50%',
          margin: '0 auto',
          animation: 'spin 1s linear infinite'
        }} />
      </div>
      <style jsx>{`
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
}