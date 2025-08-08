'use client';

import { ESLControlsDemo } from '@/components/esl/ESLControlsDemo';

export default function TestESLControlsPage() {
  return (
    <div style={{
      minHeight: '100vh',
      background: 'linear-gradient(135deg, #1a1a2e 0%, #16213e 50%, #0f1419 100%)',
      padding: '40px',
      color: '#e2e8f0'
    }}>
      <div style={{
        maxWidth: '800px',
        margin: '0 auto',
        textAlign: 'center'
      }}>
        <h1 style={{
          fontSize: '32px',
          fontWeight: '700',
          marginBottom: '20px',
          color: '#f7fafc'
        }}>
          ESL Controls Test Page
        </h1>
        
        <div style={{
          background: 'rgba(26, 32, 44, 0.8)',
          borderRadius: '16px',
          padding: '32px',
          marginBottom: '40px',
          border: '1px solid rgba(102, 126, 234, 0.2)'
        }}>
          <h2 style={{
            fontSize: '24px',
            fontWeight: '600',
            marginBottom: '16px',
            color: '#cbd5e0'
          }}>
            Testing Instructions
          </h2>
          
          <div style={{ textAlign: 'left', lineHeight: '1.8' }}>
            <p style={{ marginBottom: '16px' }}>
              🎯 <strong>What to test:</strong> ESL controls should appear in the bottom-right corner
            </p>
            
            <p style={{ marginBottom: '16px' }}>
              📱 <strong>Expected behavior:</strong>
            </p>
            <ul style={{ marginLeft: '20px', marginBottom: '16px' }}>
              <li>Floating widget with "ESL Mode" toggle</li>
              <li>Shows "Level B1" when enabled</li>
              <li>Toggle remembers state on page refresh</li>
              <li>Green when ON, gray when OFF</li>
            </ul>
            
            <p style={{ marginBottom: '16px' }}>
              🔧 <strong>Mock user:</strong> Using test user with B1 (Intermediate) level
            </p>
          </div>
        </div>

        {/* Sample reading content */}
        <div style={{
          background: 'rgba(26, 32, 44, 0.8)',
          borderRadius: '16px',
          padding: '32px',
          textAlign: 'left',
          border: '1px solid rgba(102, 126, 234, 0.2)',
          marginBottom: '40px'
        }}>
          <h3 style={{
            fontSize: '20px',
            fontWeight: '600',
            marginBottom: '16px',
            color: '#cbd5e0'
          }}>
            Sample Reading Content
          </h3>
          
          <div style={{
            lineHeight: '1.8',
            fontSize: '16px',
            color: '#e2e8f0'
          }}>
            <p style={{ marginBottom: '16px' }}>
              In the heart of Victorian London, where the fog rolled thick through cobblestone streets 
              and gas lamps cast eerie shadows on ancient brick walls, there lived a peculiar gentleman 
              who possessed an extraordinary talent for solving the most perplexing mysteries.
            </p>
            
            <p style={{ marginBottom: '16px' }}>
              His analytical mind could discern patterns where others saw only chaos, and his keen 
              observations often revealed truths that remained hidden to conventional thinking. The 
              residents of Baker Street had grown accustomed to his eccentric habits and late-night 
              visitors seeking solutions to seemingly impossible puzzles.
            </p>
            
            <p>
              This content would normally be simplified for ESL learners when the mode is active, 
              replacing complex vocabulary and cultural references with more accessible alternatives.
            </p>
          </div>
        </div>
      </div>

      {/* ESL Controls - This should appear in bottom-right */}
      <ESLControlsDemo 
        onESLModeChange={(enabled, level) => {
          console.log('ESL Mode changed:', { enabled, level });
        }}
        variant="floating"
      />
    </div>
  );
}