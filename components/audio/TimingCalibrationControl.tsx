'use client';

import React, { useState, useEffect } from 'react';
import { TimingCalibrator } from '@/lib/audio/TimingCalibrator';

interface TimingCalibrationControlProps {
  bookId?: string;
  onOffsetChange?: (offset: number) => void;
}

export const TimingCalibrationControl: React.FC<TimingCalibrationControlProps> = ({
  bookId,
  onOffsetChange
}) => {
  const [calibrator, setCalibrator] = useState<TimingCalibrator | null>(null);
  const [currentOffset, setCurrentOffset] = useState(0.25);
  const [confidence, setConfidence] = useState(0);
  const [showControls, setShowControls] = useState(false);

  useEffect(() => {
    const cal = new TimingCalibrator();
    setCalibrator(cal);
    const offset = cal.getOptimalOffset(bookId);
    setCurrentOffset(offset);
    setConfidence(cal.getConfidence());
  }, [bookId]);

  const handleAdjustOffset = (delta: number) => {
    if (!calibrator) return;

    calibrator.adjustOffset(delta);
    const newOffset = calibrator.getOptimalOffset(bookId);
    setCurrentOffset(newOffset);
    onOffsetChange?.(newOffset);

    // Visual feedback
    const button = document.activeElement as HTMLButtonElement;
    if (button) {
      button.style.transform = 'scale(0.95)';
      setTimeout(() => {
        button.style.transform = 'scale(1)';
      }, 100);
    }
  };

  const handleReset = () => {
    if (!calibrator) return;

    calibrator.reset();
    const newOffset = calibrator.getOptimalOffset(bookId);
    setCurrentOffset(newOffset);
    setConfidence(0);
    onOffsetChange?.(newOffset);
  };

  return (
    <div style={{
      position: 'fixed',
      bottom: '80px',
      right: '20px',
      zIndex: 1000,
      background: 'rgba(17, 24, 39, 0.95)',
      backdropFilter: 'blur(10px)',
      borderRadius: '12px',
      padding: '12px',
      border: '1px solid rgba(75, 85, 99, 0.3)',
      boxShadow: '0 4px 15px rgba(0, 0, 0, 0.3)'
    }}>
      <button
        onClick={() => setShowControls(!showControls)}
        style={{
          background: 'transparent',
          border: 'none',
          color: '#10b981',
          fontSize: '14px',
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          padding: '4px 8px',
          borderRadius: '6px',
          transition: 'background 0.2s'
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.background = 'rgba(16, 185, 129, 0.1)';
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.background = 'transparent';
        }}
      >
        <span>⚡</span>
        <span>Sync: {(currentOffset * 1000).toFixed(0)}ms</span>
        {confidence > 0 && (
          <span style={{
            fontSize: '11px',
            color: confidence > 0.7 ? '#10b981' : '#f59e0b'
          }}>
            ({(confidence * 100).toFixed(0)}%)
          </span>
        )}
      </button>

      {showControls && (
        <div style={{
          marginTop: '12px',
          padding: '12px',
          borderTop: '1px solid rgba(75, 85, 99, 0.3)'
        }}>
          <div style={{
            fontSize: '12px',
            color: '#94a3b8',
            marginBottom: '12px'
          }}>
            Adjust if highlighting is off:
          </div>

          <div style={{
            display: 'flex',
            gap: '8px',
            marginBottom: '12px'
          }}>
            <button
              onClick={() => handleAdjustOffset(-0.05)}
              style={{
                flex: 1,
                padding: '8px',
                background: 'rgba(239, 68, 68, 0.1)',
                border: '1px solid rgba(239, 68, 68, 0.3)',
                borderRadius: '6px',
                color: '#ef4444',
                fontSize: '12px',
                cursor: 'pointer',
                transition: 'all 0.2s'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = 'rgba(239, 68, 68, 0.2)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = 'rgba(239, 68, 68, 0.1)';
              }}
            >
              ← Earlier
              <div style={{ fontSize: '10px', opacity: 0.7 }}>
                (if behind voice)
              </div>
            </button>

            <button
              onClick={() => handleAdjustOffset(0.05)}
              style={{
                flex: 1,
                padding: '8px',
                background: 'rgba(59, 130, 246, 0.1)',
                border: '1px solid rgba(59, 130, 246, 0.3)',
                borderRadius: '6px',
                color: '#3b82f6',
                fontSize: '12px',
                cursor: 'pointer',
                transition: 'all 0.2s'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = 'rgba(59, 130, 246, 0.2)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = 'rgba(59, 130, 246, 0.1)';
              }}
            >
              Later →
              <div style={{ fontSize: '10px', opacity: 0.7 }}>
                (if ahead of voice)
              </div>
            </button>
          </div>

          <button
            onClick={handleReset}
            style={{
              width: '100%',
              padding: '6px',
              background: 'rgba(107, 114, 128, 0.1)',
              border: '1px solid rgba(107, 114, 128, 0.3)',
              borderRadius: '6px',
              color: '#6b7280',
              fontSize: '11px',
              cursor: 'pointer',
              transition: 'all 0.2s'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = 'rgba(107, 114, 128, 0.2)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = 'rgba(107, 114, 128, 0.1)';
            }}
          >
            Reset to Default
          </button>

          <div style={{
            marginTop: '12px',
            fontSize: '10px',
            color: '#6b7280',
            textAlign: 'center'
          }}>
            Settings saved per book
          </div>
        </div>
      )}
    </div>
  );
};