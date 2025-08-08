'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/components/AuthProvider';

export function useRequireAuth(redirectTo: string = '/auth/login') {
  const { user, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    // Don't redirect while still loading
    if (loading) return;

    // Redirect to login if not authenticated
    if (!user) {
      console.log('useRequireAuth: Redirecting to login - no user found');
      const loginUrl = new URL(redirectTo, window.location.origin);
      loginUrl.searchParams.set('redirectTo', window.location.pathname);
      router.push(loginUrl.toString());
    }
  }, [user, loading, router, redirectTo]);

  // Always return the same structure - never return JSX from hooks
  return { user, loading: loading, isAuthenticated: !!user };
}