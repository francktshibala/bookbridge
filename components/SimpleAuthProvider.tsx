'use client';

import { createContext, useContext, useEffect, useState, useRef } from 'react';
import { createClient } from '@/lib/supabase/client';
import { User } from '@supabase/supabase-js';
import posthog from 'posthog-js';
import { trackEmailVerified } from '@/lib/analytics/posthog';

interface SimpleAuthContextType {
  user: User | null;
  loading: boolean;
  signOut: () => Promise<void>;
}

const SimpleAuthContext = createContext<SimpleAuthContextType>({
  user: null,
  loading: true,
  signOut: async () => {},
});

export const useAuth = () => useContext(SimpleAuthContext);

export function SimpleAuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const mounted = useRef(false);
  const [initialLoadComplete, setInitialLoadComplete] = useState(false);

  useEffect(() => {
    // Prevent multiple mounts in development
    if (mounted.current) return;
    mounted.current = true;

    const supabase = createClient();

    // Initial session check
    const checkSession = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        console.log('Simple Auth: Initial check -', session?.user?.email || 'No user');
        setUser(session?.user ?? null);
      } catch (error) {
        console.error('Simple Auth: Session check error:', error);
        setUser(null);
      } finally {
        setLoading(false);
        setInitialLoadComplete(true);
      }
    };

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        console.log('Simple Auth: State change -', event, session?.user?.email || 'No user');
        
        if (event === 'SIGNED_OUT') {
          setUser(null);
          // PostHog: Reset user identification on logout
          if (typeof window !== 'undefined') {
            try {
              posthog.reset();
              console.log('📊 PostHog: User identification reset');
            } catch (error) {
              console.error('PostHog reset error:', error);
            }
          }
          // Only clear conversation data after initial load is complete
          // This prevents clearing data during the initial auth check
          if (initialLoadComplete && typeof window !== 'undefined') {
            console.log('Simple Auth: Clearing conversation data after user logout');
            Object.keys(sessionStorage).forEach(key => {
              if (key.startsWith('conversation-')) {
                sessionStorage.removeItem(key);
              }
            });
          }
        } else if (event === 'SIGNED_IN') {
          setUser(session?.user ?? null);
          // PostHog: Identify user on signup/login
          if (typeof window !== 'undefined' && session?.user) {
            try {
              posthog.identify(session.user.id, {
                email: session.user.email,
                signup_date: session.user.created_at,
                // Add more properties from user metadata if available
                ...(session.user.user_metadata?.source && { source: session.user.user_metadata.source }),
                ...(session.user.user_metadata?.name && { name: session.user.user_metadata.name }),
              });
              console.log('📊 PostHog: User identified', session.user.id);
              
              // Track email verification if email is confirmed
              if (session.user.email_confirmed_at) {
                trackEmailVerified(session.user.id, session.user.email);
              }
            } catch (error) {
              console.error('PostHog identify error:', error);
            }
          }
        } else if (event === 'TOKEN_REFRESHED') {
          const previousUser = user;
          setUser(session?.user ?? null);
          // Track email verification if email was just confirmed
          if (typeof window !== 'undefined' && session?.user && 
              session.user.email_confirmed_at && 
              previousUser && !previousUser.email_confirmed_at) {
            trackEmailVerified(session.user.id, session.user.email);
          }
        } else if (event === 'USER_UPDATED') {
          const previousUser = user;
          setUser(session?.user ?? null);
          // Track email verification if email was just confirmed
          if (typeof window !== 'undefined' && session?.user && 
              session.user.email_confirmed_at && 
              previousUser && !previousUser.email_confirmed_at) {
            trackEmailVerified(session.user.id, session.user.email);
          }
        }
        
        setLoading(false);
      }
    );

    checkSession();

    return () => {
      subscription.unsubscribe();
      mounted.current = false;
    };
  }, []); // Empty dependency array - stable!

  const signOut = async () => {
    const supabase = createClient();
    await supabase.auth.signOut();
  };

  return (
    <SimpleAuthContext.Provider value={{ user, loading, signOut }}>
      {children}
    </SimpleAuthContext.Provider>
  );
}