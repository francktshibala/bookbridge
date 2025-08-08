'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useESLMode } from '@/hooks/useESLMode';
import { ESLControlsDemo } from '@/components/esl/ESLControlsDemo';

export default function DebugESLPage() {
  const [debugInfo, setDebugInfo] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const { eslEnabled, eslLevel, isLoading } = useESLMode();

  useEffect(() => {
    async function checkEverything() {
      try {
        const supabase = createClient();
        
        // Check auth user
        const { data: { user }, error: authError } = await supabase.auth.getUser();
        
        // Check database user
        let dbUser = null;
        let dbError = null;
        if (user) {
          const { data, error } = await supabase
            .from('users')
            .select('id, email, esl_level, native_language')
            .eq('id', user.id)
            .single();
          dbUser = data;
          dbError = error;
        }
        
        // Check subscription
        let subscription = null;
        let subError = null;
        if (user) {
          const { data, error } = await supabase
            .from('subscriptions')
            .select('tier, status')
            .eq('userId', user.id)
            .single();
          subscription = data;
          subError = error;
        }

        setDebugInfo({
          authUser: user,
          authError,
          dbUser,
          dbError,
          subscription,
          subError,
          eslHook: { eslEnabled, eslLevel, isLoading }
        });
        
        setLoading(false);
      } catch (error) {
        console.error('Debug error:', error);
        setDebugInfo({ error: error instanceof Error ? error.message : 'Unknown error' });
        setLoading(false);
      }
    }
    
    checkEverything();
  }, [eslEnabled, eslLevel, isLoading]);

  if (loading) return <div style={{ padding: '40px', color: 'white' }}>Loading debug info...</div>;

  return (
    <div style={{
      minHeight: '100vh',
      background: 'linear-gradient(135deg, #1a1a2e 0%, #16213e 50%, #0f1419 100%)',
      padding: '40px',
      color: '#e2e8f0',
      fontFamily: 'monospace'
    }}>
      <div style={{ maxWidth: '800px', margin: '0 auto' }}>
        <h1 style={{ fontSize: '24px', marginBottom: '20px', color: '#f7fafc' }}>
          🔍 ESL Controls Debug Page
        </h1>
        
        <div style={{
          background: 'rgba(26, 32, 44, 0.8)',
          borderRadius: '12px',
          padding: '24px',
          marginBottom: '20px',
          border: '1px solid rgba(102, 126, 234, 0.2)'
        }}>
          <h2 style={{ fontSize: '18px', marginBottom: '16px', color: '#cbd5e0' }}>Debug Information:</h2>
          <pre style={{ 
            fontSize: '12px', 
            lineHeight: '1.5',
            overflow: 'auto',
            whiteSpace: 'pre-wrap'
          }}>
            {JSON.stringify(debugInfo, null, 2)}
          </pre>
        </div>

        <div style={{
          background: 'rgba(26, 32, 44, 0.8)',
          borderRadius: '12px',
          padding: '24px',
          border: '1px solid rgba(102, 126, 234, 0.2)'
        }}>
          <h2 style={{ fontSize: '18px', marginBottom: '16px', color: '#cbd5e0' }}>
            Expected: ESL Controls should appear below if user has esl_level
          </h2>
        </div>
      </div>

      {/* Demo ESL Controls for comparison */}
      <ESLControlsDemo 
        onESLModeChange={(enabled, level) => {
          console.log('Demo ESL Mode changed:', { enabled, level });
        }}
        variant="floating"
      />
    </div>
  );
}