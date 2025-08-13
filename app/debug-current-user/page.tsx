'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';

export default function DebugCurrentUserPage() {
  const [userInfo, setUserInfo] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);


  useEffect(() => {
    async function getCurrentUser() {
      try {
        const supabase = createClient();
        
        // Get auth user
        const { data: { user }, error: authError } = await supabase.auth.getUser();
        
        // Get database user
        let dbUser = null;
        if (user) {
          const { data, error } = await supabase
            .from('users')
            .select('*')
            .eq('id', user.id)
            .single();
          dbUser = data;
        }

        setUserInfo({
          authUser: user,
          authError,
          dbUser
        });
        
        setLoading(false);
      } catch (error) {
        console.error('Debug error:', error);
        setUserInfo({ error: error instanceof Error ? error.message : 'Unknown error' });
        setLoading(false);
      }
    }
    
    getCurrentUser();
  }, []);

  if (loading) return <div style={{ padding: '40px', color: 'white' }}>Loading...</div>;

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
          🔍 Current User Debug
        </h1>
        
        <div style={{
          background: 'rgba(26, 32, 44, 0.8)',
          borderRadius: '12px',
          padding: '24px',
          marginBottom: '20px',
          border: '1px solid rgba(102, 126, 234, 0.2)'
        }}>
          <h2 style={{ fontSize: '18px', marginBottom: '16px', color: '#cbd5e0' }}>Current User Info:</h2>
          <pre style={{ 
            fontSize: '12px', 
            lineHeight: '1.5',
            overflow: 'auto',
            whiteSpace: 'pre-wrap',
            marginBottom: '20px'
          }}>
            {JSON.stringify(userInfo, null, 2)}
          </pre>
          
        </div>
      </div>
    </div>
  );
}