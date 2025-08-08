import HighlightableTextTest from '@/components/__tests__/HighlightableTextTest';
import TextHighlightingHookTest from '@/components/__tests__/TextHighlightingHookTest';
import AudioPlayerIntegrationTest from '@/components/__tests__/AudioPlayerIntegrationTest';

export default function TestHighlightingPage() {
  return (
    <div style={{ 
      minHeight: '100vh', 
      backgroundColor: '#1a202c',
      padding: '20px',
      display: 'flex',
      flexDirection: 'column',
      gap: '40px'
    }}>
      <AudioPlayerIntegrationTest />
      <HighlightableTextTest />
      <TextHighlightingHookTest />
    </div>
  );
}