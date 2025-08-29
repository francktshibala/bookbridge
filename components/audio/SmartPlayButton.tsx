'use client';

import { useState, useRef } from 'react';
import { Play, Pause } from 'lucide-react';

interface SmartPlayButtonProps {
  isPlaying: boolean;
  isLoading?: boolean;
  autoAdvanceEnabled: boolean;
  onPlayPause: () => void;
  onToggleAutoAdvance: () => void;
}

export function SmartPlayButton({
  isPlaying,
  isLoading = false,
  autoAdvanceEnabled,
  onPlayPause,
  onToggleAutoAdvance
}: SmartPlayButtonProps) {
  const [showAutoAdvanceHint, setShowAutoAdvanceHint] = useState(false);
  const debounceRef = useRef<NodeJS.Timeout | undefined>(undefined);

  const getButtonText = () => {
    if (isLoading) return 'Loading...';
    if (isPlaying && autoAdvanceEnabled) return '⏸ Auto';
    if (isPlaying) return '⏸ Manual';
    if (autoAdvanceEnabled) return '▶ Auto';
    return '▶ Manual';
  };

  const getButtonColor = () => {
    if (isLoading) return '#9ca3af';
    if (autoAdvanceEnabled) return '#10b981'; // Green for auto
    return '#6366f1'; // Blue for manual
  };

  return (
    <div className="smart-play-container" style={{ position: 'relative' }}>
      <button
        onClick={() => {
          if (debounceRef.current) {
            clearTimeout(debounceRef.current);
          }
          
          debounceRef.current = setTimeout(() => {
            console.log('🎛️ SmartPlayButton clicked, current isPlaying:', isPlaying);
            onPlayPause();
          }, 100);
        }}
        disabled={isLoading}
        className="smart-play-button"
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          padding: '12px 20px',
          borderRadius: '12px',
          backgroundColor: getButtonColor(),
          color: 'white',
          fontSize: '16px',
          fontWeight: '600',
          border: 'none',
          cursor: isLoading ? 'not-allowed' : 'pointer',
          minHeight: '48px',
          minWidth: '120px',
          justifyContent: 'center',
          boxShadow: '0 4px 8px rgba(0, 0, 0, 0.1)',
          transition: 'all 0.2s ease',
          opacity: isLoading ? 0.7 : 1
        }}
        onMouseEnter={() => setShowAutoAdvanceHint(true)}
        onMouseLeave={() => setShowAutoAdvanceHint(false)}
      >
        {isLoading ? (
          <div style={{
            width: '16px',
            height: '16px',
            border: '2px solid transparent',
            borderTop: '2px solid white',
            borderRadius: '50%',
            animation: 'spin 1s linear infinite'
          }} />
        ) : (
          <>
            {isPlaying ? <Pause size={18} /> : <Play size={18} />}
            <span>{autoAdvanceEnabled ? 'Auto' : 'Manual'}</span>
          </>
        )}
      </button>

      {/* Auto-advance toggle - accessible control next to main button (avoid button-in-button) */}
      <div
        role="switch"
        aria-checked={autoAdvanceEnabled}
        tabIndex={0}
        onClick={onToggleAutoAdvance}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            onToggleAutoAdvance();
          }
        }}
        className="auto-advance-toggle"
        style={{
          position: 'absolute',
          right: '-12px',
          top: '50%',
          transform: 'translateY(-50%)',
          width: '24px',
          height: '24px',
          borderRadius: '50%',
          backgroundColor: autoAdvanceEnabled ? '#10b981' : '#64748b',
          color: 'white',
          fontSize: '12px',
          border: '2px solid #1e293b',
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          boxShadow: '0 2px 4px rgba(0, 0, 0, 0.2)',
          transition: 'all 0.2s ease'
        }}
        title={autoAdvanceEnabled ? 'Disable auto-advance' : 'Enable auto-advance'}
        aria-label={autoAdvanceEnabled ? 'Disable auto-advance' : 'Enable auto-advance'}
      >
        {autoAdvanceEnabled ? '🔄' : '⏭️'}
      </div>

      {/* Tooltip */}
      {showAutoAdvanceHint && (
        <div
          className="auto-advance-tooltip"
          style={{
            position: 'absolute',
            bottom: '100%',
            left: '50%',
            transform: 'translateX(-50%)',
            marginBottom: '8px',
            padding: '8px 12px',
            backgroundColor: '#1e293b',
            color: '#cbd5e1',
            fontSize: '12px',
            borderRadius: '6px',
            whiteSpace: 'nowrap',
            boxShadow: '0 4px 8px rgba(0, 0, 0, 0.2)',
            zIndex: 10,
            border: '1px solid #475569'
          }}
        >
          {autoAdvanceEnabled 
            ? 'Auto-advance: Will continue to next page after audio ends'
            : 'Manual mode: Stay on current page after audio ends'
          }
          <div style={{
            position: 'absolute',
            top: '100%',
            left: '50%',
            transform: 'translateX(-50%)',
            width: '0',
            height: '0',
            borderLeft: '4px solid transparent',
            borderRight: '4px solid transparent',
            borderTop: '4px solid #1e293b'
          }} />
        </div>
      )}

      <style jsx>{`
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
}