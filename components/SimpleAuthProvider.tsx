'use client';

import { createContext, useContext, useEffect, useState, useRef } from 'react';
import { createClient } from '@/lib/supabase/client';
import { User } from '@supabase/supabase-js';

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
        } else if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED') {
          setUser(session?.user ?? null);
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