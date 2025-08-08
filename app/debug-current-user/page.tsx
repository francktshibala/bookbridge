'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';

export default function DebugCurrentUserPage() {
  const [userInfo, setUserInfo] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);

  const addESLProfile = async () => {
    if (!userInfo?.authUser) return;
    
    setUpdating(true);
    try {
      const supabase = createClient();
      
      // Add ESL profile to current user
      const { error } = await supabase
        .from('users')
        .update({
          esl_level: 'B2',
          native_language: 'Spanish',
          learning_goals: JSON.stringify([
            'Improve reading comprehension',
            'Learn academic vocabulary',
            'Better understanding of cultural references'
          ]),
          reading_speed_wpm: 130
        })
        .eq('id', userInfo.authUser.id);
      
      if (error) {
        console.error('Update error:', error);
        alert('Error updating profile: ' + error.message);
      } else {
        alert('ESL profile added! Refresh the page.');
        window.location.reload();
      }
    } catch (error) {
      console.error('Error:', error);
      alert('Error: ' + error);
    }
    setUpdating(false);
  };

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
        setUserInfo({ error: error.message });
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
          
          {userInfo?.authUser && (
            <div>
              <h3 style={{ marginBottom: '10px', color: '#cbd5e0' }}>Quick Fix:</h3>
              {!userInfo?.dbUser?.esl_level ? (
                <button
                  onClick={addESLProfile}
                  disabled={updating}
                  style={{
                    padding: '12px 24px',
                    background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
                    color: 'white',
                    border: 'none',
                    borderRadius: '8px',
                    fontSize: '14px',
                    fontWeight: '600',
                    cursor: updating ? 'not-allowed' : 'pointer',
                    opacity: updating ? 0.5 : 1
                  }}
                >
                  {updating ? 'Adding ESL Profile...' : 'Add ESL Profile (B2 Spanish)'}
                </button>
              ) : (
                <div style={{ color: '#10b981' }}>
                  ✅ User has ESL profile: {userInfo.dbUser.esl_level} 
                  ({userInfo.dbUser.native_language})
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}