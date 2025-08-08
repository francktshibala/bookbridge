'use client';

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { supabase } from '@/lib/supabase/client';
import { useAuth } from '@/components/SimpleAuthProvider';
import { Shield, Activity, User, Clock, AlertCircle, CheckCircle, XCircle, Database, Key } from 'lucide-react';
import Link from 'next/link';

interface AuthEvent {
  id: string;
  type: 'SIGNED_IN' | 'SIGNED_OUT' | 'TOKEN_REFRESHED' | 'USER_UPDATED' | 'PASSWORD_RECOVERY' | 'ERROR' | 'LOADING' | 'SESSION_CHECK';
  timestamp: Date;
  details: string;
  userId?: string;
  email?: string;
  sessionStorage?: boolean;
  source: 'supabase' | 'simpleAuth' | 'both';
}

export default function AuthMonitorPage() {
  const { user: simpleAuthUser, loading: simpleAuthLoading } = useAuth();
  const [authEvents, setAuthEvents] = useState<AuthEvent[]>([]);
  const [supabaseUser, setSupabaseUser] = useState<any>(null);
  const [sessionStorageStatus, setSessionStorageStatus] = useState<{ hasConversation: boolean; conversationId?: string }>({ hasConversation: false });
  const [isMonitoring, setIsMonitoring] = useState(true);

  // Monitor sessionStorage
  useEffect(() => {
    const checkSessionStorage = () => {
      // Check for any conversation keys (format: conversation-${bookId})
      const allKeys = Object.keys(sessionStorage);
      const conversationKeys = allKeys.filter(key => key.startsWith('conversation-'));
      
      if (conversationKeys.length > 0) {
        // Get the first conversation found
        const firstKey = conversationKeys[0];
        const conversationId = sessionStorage.getItem(firstKey);
        setSessionStorageStatus({
          hasConversation: true,
          conversationId: conversationId || undefined
        });
      } else {
        // Also check for legacy currentConversationId
        const conversationId = sessionStorage.getItem('currentConversationId');
        setSessionStorageStatus({
          hasConversation: !!conversationId,
          conversationId: conversationId || undefined
        });
      }
    };

    checkSessionStorage();
    const interval = setInterval(checkSessionStorage, 1000);
    return () => clearInterval(interval);
  }, []);

  // Add auth event
  const addAuthEvent = (type: AuthEvent['type'], details: string, user?: any, source: AuthEvent['source'] = 'supabase') => {
    const newEvent: AuthEvent = {
      id: Date.now().toString() + Math.random(),
      type,
      timestamp: new Date(),
      details,
      userId: user?.id,
      email: user?.email,
      sessionStorage: Object.keys(sessionStorage).some(key => key.startsWith('conversation-')),
      source
    };
    
    setAuthEvents(prev => [newEvent, ...prev].slice(0, 100)); // Keep last 100 events
  };

  // Monitor SimpleAuthProvider changes
  useEffect(() => {
    if (simpleAuthLoading) {
      addAuthEvent('LOADING', 'SimpleAuthProvider loading state', simpleAuthUser, 'simpleAuth');
    } else if (simpleAuthUser) {
      addAuthEvent('SIGNED_IN', 'SimpleAuthProvider user detected', simpleAuthUser, 'simpleAuth');
    } else {
      addAuthEvent('SIGNED_OUT', 'SimpleAuthProvider no user', null, 'simpleAuth');
    }
  }, [simpleAuthUser, simpleAuthLoading]);

  useEffect(() => {
    // Get initial Supabase auth state
    const checkInitialAuth = async () => {
      addAuthEvent('SESSION_CHECK', 'Checking initial Supabase session...', null, 'supabase');
      const { data: { user }, error } = await supabase.auth.getUser();
      
      if (error) {
        addAuthEvent('ERROR', `Initial auth check error: ${error.message}`, null, 'supabase');
      } else {
        setSupabaseUser(user);
        if (user) {
          addAuthEvent('SIGNED_IN', 'Initial Supabase session found', user, 'supabase');
        } else {
          addAuthEvent('SIGNED_OUT', 'No initial Supabase session', null, 'supabase');
        }
      }
    };

    checkInitialAuth();

    // Subscribe to Supabase auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      console.log('[Supabase Auth Monitor] Event:', event, 'User:', session?.user?.email);
      
      switch (event) {
        case 'SIGNED_IN':
          setSupabaseUser(session?.user);
          addAuthEvent('SIGNED_IN', 'Supabase user signed in', session?.user, 'supabase');
          break;
        case 'SIGNED_OUT':
          setSupabaseUser(null);
          addAuthEvent('SIGNED_OUT', 'Supabase user signed out', null, 'supabase');
          break;
        case 'TOKEN_REFRESHED':
          addAuthEvent('TOKEN_REFRESHED', 'Supabase auth token refreshed', session?.user, 'supabase');
          break;
        case 'USER_UPDATED':
          setSupabaseUser(session?.user);
          addAuthEvent('USER_UPDATED', 'Supabase user data updated', session?.user, 'supabase');
          break;
        case 'PASSWORD_RECOVERY':
          addAuthEvent('PASSWORD_RECOVERY', 'Password recovery initiated', session?.user, 'supabase');
          break;
        default:
          addAuthEvent('ERROR', `Unknown Supabase event: ${event}`, null, 'supabase');
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  const getEventIcon = (type: AuthEvent['type']) => {
    switch (type) {
      case 'SIGNED_IN':
        return <CheckCircle className="w-5 h-5 text-green-400" />;
      case 'SIGNED_OUT':
        return <XCircle className="w-5 h-5 text-red-400" />;
      case 'TOKEN_REFRESHED':
        return <Activity className="w-5 h-5 text-blue-400" />;
      case 'USER_UPDATED':
        return <User className="w-5 h-5 text-purple-400" />;
      case 'PASSWORD_RECOVERY':
        return <Shield className="w-5 h-5 text-yellow-400" />;
      case 'LOADING':
        return <Clock className="w-5 h-5 text-orange-400" />;
      case 'SESSION_CHECK':
        return <Database className="w-5 h-5 text-cyan-400" />;
      case 'ERROR':
        return <AlertCircle className="w-5 h-5 text-red-500" />;
    }
  };

  const getEventColor = (type: AuthEvent['type']) => {
    switch (type) {
      case 'SIGNED_IN':
        return 'rgba(34, 197, 94, 0.1)'; // green
      case 'SIGNED_OUT':
        return 'rgba(239, 68, 68, 0.1)'; // red
      case 'TOKEN_REFRESHED':
        return 'rgba(59, 130, 246, 0.1)'; // blue
      case 'USER_UPDATED':
        return 'rgba(168, 85, 247, 0.1)'; // purple
      case 'PASSWORD_RECOVERY':
        return 'rgba(234, 179, 8, 0.1)'; // yellow
      case 'LOADING':
        return 'rgba(251, 146, 60, 0.1)'; // orange
      case 'SESSION_CHECK':
        return 'rgba(6, 182, 212, 0.1)'; // cyan
      case 'ERROR':
        return 'rgba(239, 68, 68, 0.2)'; // red
    }
  };

  const clearEvents = () => {
    setAuthEvents([]);
    addAuthEvent('USER_UPDATED', 'Event log cleared', null, 'both');
  };

  // Check for auth mismatches
  const hasAuthMismatch = simpleAuthUser?.email !== supabaseUser?.email;

  return (
    <div className="min-h-screen" style={{ backgroundColor: '#0f172a', color: '#ffffff' }}>
      {/* Magical Background */}
      <div className="fixed inset-0 pointer-events-none" style={{
        background: `
          radial-gradient(circle at 20% 50%, rgba(102, 126, 234, 0.15) 0%, transparent 50%),
          radial-gradient(circle at 80% 80%, rgba(118, 75, 162, 0.12) 0%, transparent 50%),
          radial-gradient(circle at 40% 20%, rgba(240, 147, 251, 0.08) 0%, transparent 50%)
        `
      }} />

      <div className="relative max-w-7xl mx-auto px-4 py-8">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8"
        >
          <Link 
            href="/library"
            className="inline-flex items-center gap-2 text-white/70 hover:text-white transition-colors mb-4"
          >
            ← Back to Library
          </Link>
          
          <h1 className="text-4xl font-bold mb-4" style={{
            background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            backgroundClip: 'text'
          }}>
            Authentication Monitor
          </h1>
          <p className="text-white/70">Real-time authentication state tracking for debugging conversation persistence</p>
        </motion.div>

        {/* Auth Mismatch Alert */}
        {hasAuthMismatch && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="mb-6 p-4 rounded-lg bg-red-500/20 border border-red-500/50"
          >
            <div className="flex items-center gap-3">
              <AlertCircle className="w-6 h-6 text-red-400" />
              <div>
                <p className="font-semibold text-red-400">Auth State Mismatch Detected!</p>
                <p className="text-sm text-white/70 mt-1">
                  SimpleAuthProvider: {simpleAuthUser?.email || 'No user'} | 
                  Supabase Direct: {supabaseUser?.email || 'No user'}
                </p>
              </div>
            </div>
          </motion.div>
        )}

        {/* Status Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          {/* SimpleAuthProvider Status */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.1 }}
            className="glassmorphism rounded-xl p-6"
            style={{
              background: 'rgba(30, 41, 59, 0.5)',
              backdropFilter: 'blur(10px)',
              border: '1px solid rgba(148, 163, 184, 0.1)'
            }}
          >
            <div className="flex items-center gap-3 mb-3">
              <User className="w-6 h-6 text-blue-400" />
              <h2 className="text-lg font-semibold">SimpleAuth</h2>
            </div>
            <div className="space-y-2">
              <p className="text-sm text-white/60">Status:</p>
              <p className={`font-medium ${simpleAuthUser ? 'text-green-400' : simpleAuthLoading ? 'text-yellow-400' : 'text-red-400'}`}>
                {simpleAuthLoading ? 'Loading...' : simpleAuthUser ? 'Authenticated' : 'Not Authenticated'}
              </p>
              {simpleAuthUser && (
                <p className="text-xs text-white/70 break-all">{simpleAuthUser.email}</p>
              )}
            </div>
          </motion.div>

          {/* Supabase Direct Status */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.15 }}
            className="glassmorphism rounded-xl p-6"
            style={{
              background: 'rgba(30, 41, 59, 0.5)',
              backdropFilter: 'blur(10px)',
              border: '1px solid rgba(148, 163, 184, 0.1)'
            }}
          >
            <div className="flex items-center gap-3 mb-3">
              <Key className="w-6 h-6 text-purple-400" />
              <h2 className="text-lg font-semibold">Supabase</h2>
            </div>
            <div className="space-y-2">
              <p className="text-sm text-white/60">Status:</p>
              <p className={`font-medium ${supabaseUser ? 'text-green-400' : 'text-red-400'}`}>
                {supabaseUser ? 'Authenticated' : 'Not Authenticated'}
              </p>
              {supabaseUser && (
                <p className="text-xs text-white/70 break-all">{supabaseUser.email}</p>
              )}
            </div>
          </motion.div>

          {/* Session Storage Status */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.2 }}
            className="glassmorphism rounded-xl p-6"
            style={{
              background: 'rgba(30, 41, 59, 0.5)',
              backdropFilter: 'blur(10px)',
              border: '1px solid rgba(148, 163, 184, 0.1)'
            }}
          >
            <div className="flex items-center gap-3 mb-3">
              <Database className="w-6 h-6 text-cyan-400" />
              <h2 className="text-lg font-semibold">Session</h2>
            </div>
            <div className="space-y-2">
              <p className="text-sm text-white/60">Conv ID:</p>
              <p className={`font-medium ${sessionStorageStatus.hasConversation ? 'text-green-400' : 'text-yellow-400'}`}>
                {sessionStorageStatus.hasConversation ? 'Present' : 'Not Found'}
              </p>
              {sessionStorageStatus.conversationId && (
                <p className="text-xs text-white/70 font-mono break-all">{sessionStorageStatus.conversationId.slice(0, 12)}...</p>
              )}
            </div>
          </motion.div>

          {/* Monitor Status */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.25 }}
            className="glassmorphism rounded-xl p-6"
            style={{
              background: 'rgba(30, 41, 59, 0.5)',
              backdropFilter: 'blur(10px)',
              border: '1px solid rgba(148, 163, 184, 0.1)'
            }}
          >
            <div className="flex items-center gap-3 mb-3">
              <Activity className="w-6 h-6 text-green-400" />
              <h2 className="text-lg font-semibold">Monitor</h2>
            </div>
            <div className="space-y-2">
              <p className="text-sm text-white/60">Events:</p>
              <p className="text-white/90 font-medium">{authEvents.length}</p>
              <button
                onClick={clearEvents}
                className="mt-2 px-3 py-1 bg-purple-600/20 hover:bg-purple-600/30 border border-purple-500/30 rounded-lg text-xs transition-all"
              >
                Clear
              </button>
            </div>
          </motion.div>
        </div>

        {/* Events Timeline */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="glassmorphism rounded-xl p-6"
          style={{
            background: 'rgba(30, 41, 59, 0.5)',
            backdropFilter: 'blur(10px)',
            border: '1px solid rgba(148, 163, 184, 0.1)'
          }}
        >
          <h2 className="text-2xl font-semibold mb-6 flex items-center gap-3">
            <Clock className="w-6 h-6 text-purple-400" />
            Authentication Events Timeline
          </h2>

          <div className="space-y-3 max-h-[600px] overflow-y-auto custom-scrollbar">
            <AnimatePresence>
              {authEvents.length === 0 ? (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="text-center py-12 text-white/50"
                >
                  No authentication events recorded yet. Navigate or sign in/out to see events.
                </motion.div>
              ) : (
                authEvents.map((event) => (
                  <motion.div
                    key={event.id}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: 20 }}
                    className="flex items-start gap-4 p-4 rounded-lg transition-all hover:bg-white/5"
                    style={{
                      background: getEventColor(event.type),
                      border: '1px solid rgba(148, 163, 184, 0.1)'
                    }}
                  >
                    <div className="flex-shrink-0 mt-1">
                      {getEventIcon(event.type)}
                    </div>
                    <div className="flex-grow">
                      <div className="flex items-center gap-3 mb-1">
                        <span className="font-semibold text-white/90">{event.type}</span>
                        <span className={`text-xs px-2 py-0.5 rounded-full ${
                          event.source === 'supabase' ? 'bg-purple-500/20 text-purple-400' : 
                          event.source === 'simpleAuth' ? 'bg-blue-500/20 text-blue-400' :
                          'bg-gray-500/20 text-gray-400'
                        }`}>
                          {event.source}
                        </span>
                        <span className="text-xs text-white/50">
                          {event.timestamp.toLocaleTimeString()}
                        </span>
                        {event.sessionStorage && (
                          <span className="text-xs px-2 py-0.5 bg-cyan-500/20 text-cyan-400 rounded-full">
                            Has Session
                          </span>
                        )}
                      </div>
                      <p className="text-sm text-white/70">{event.details}</p>
                      {event.email && (
                        <p className="text-xs text-white/50 mt-1">User: {event.email}</p>
                      )}
                    </div>
                  </motion.div>
                ))
              )}
            </AnimatePresence>
          </div>
        </motion.div>

        {/* Debug Info */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5 }}
          className="mt-8 text-center text-sm text-white/50"
        >
          <p>Monitor shows both SimpleAuthProvider and direct Supabase auth states.</p>
          <p className="text-yellow-400">Watch for repeated SIGNED_OUT → SIGNED_IN cycles that clear conversation state.</p>
        </motion.div>
      </div>

      <style jsx>{`
        .custom-scrollbar::-webkit-scrollbar {
          width: 8px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: rgba(255, 255, 255, 0.05);
          border-radius: 4px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: rgba(255, 255, 255, 0.2);
          border-radius: 4px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background: rgba(255, 255, 255, 0.3);
        }
      `}</style>
    </div>
  );
}