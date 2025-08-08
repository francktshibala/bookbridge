'use client';

import { createContext, useContext, useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { User } from '@supabase/supabase-js';
import { useRouter } from 'next/navigation';

interface AuthContextType {
  user: User | null;
  loading: boolean;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  loading: true,
});

export const useAuth = () => useContext(AuthContext);

// Create supabase client outside component to prevent re-creation
const supabase = createClient();

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [initialLoadComplete, setInitialLoadComplete] = useState(false);
  const router = useRouter();
  
  // Track if this is the first load to prevent clearing data on initial auth check
  const isFirstLoad = useState(true)[0];

  useEffect(() => {
    // Check active session
    const checkUser = async () => {
      try {
        const { data: { session }, error } = await supabase.auth.getSession();
        console.log('AuthProvider: Initial session check:', { session: !!session, error, user: session?.user?.email });
        setUser(session?.user ?? null);
        setInitialLoadComplete(true);
      } catch (error) {
        console.error('AuthProvider: Error checking session:', error);
        setUser(null);
        setInitialLoadComplete(true);
      } finally {
        setLoading(false);
      }
    };

    checkUser();

    // Listen for changes - simplified to prevent auth cycles
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        console.log('AuthProvider: Auth state changed:', { event, user: session?.user?.email, sessionExists: !!session });
        
        // Handle only meaningful auth events
        if (event === 'SIGNED_OUT') {
          console.log('AuthProvider: User signed out, initialLoadComplete:', initialLoadComplete);
          setUser(null);
          // Only clear conversation data and redirect if this is after initial load
          // This prevents clearing data during the initial auth check
          if (initialLoadComplete) {
            console.log('AuthProvider: Clearing conversation data after user logout');
            if (typeof window !== 'undefined') {
              Object.keys(sessionStorage).forEach(key => {
                if (key.startsWith('conversation-')) {
                  sessionStorage.removeItem(key);
                }
              });
            }
            // Don't redirect on logout - let the app handle navigation
          }
        } else if (event === 'SIGNED_IN') {
          console.log('AuthProvider: User signed in');
          setUser(session?.user ?? null);
        } else if (event === 'TOKEN_REFRESHED') {
          // Silent token refresh - don't trigger UI updates unless user changed
          console.log('AuthProvider: Token refreshed silently');
          if (session?.user && (!user || user.id !== session.user.id)) {
            setUser(session.user);
          }
        }
        
        // Only update loading state after initial load
        if (initialLoadComplete) {
          setLoading(false);
        }
      }
    );

    return () => {
      subscription.unsubscribe();
    };
  }, [router, initialLoadComplete, user]);

  return (
    <AuthContext.Provider value={{ user, loading }}>
      {children}
    </AuthContext.Provider>
  );
}