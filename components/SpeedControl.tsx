'use client';

import { useState, useEffect, useRef } from 'react';

interface SpeedControlProps {
  onSpeedChange?: (speed: number) => void;
  currentSpeed?: number;
}

const speedOptions = [0.5, 0.75, 1.0, 1.25, 1.5, 2.0];

export function SpeedControl({ onSpeedChange, currentSpeed = 1.0 }: SpeedControlProps) {
  const [speed, setSpeed] = useState(currentSpeed);
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSpeedChange = (newSpeed: number) => {
    setSpeed(newSpeed);
    setIsOpen(false);
    onSpeedChange?.(newSpeed);
  };

  return (
    <div className="relative" ref={dropdownRef}>
      {/* Speed Button - Matches Wireframe Design */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        style={{
          minWidth: '80px',
          height: '56px',
          backgroundColor: '#475569',
          color: 'white',
          border: '2px solid #64748b',
          borderRadius: '28px',
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: '16px',
          fontWeight: 'bold',
          transition: 'all 0.2s ease',
          padding: '0 16px',
          boxShadow: '0 4px 8px rgba(0,0,0,0.2)'
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.backgroundColor = 'rgba(107, 114, 128, 0.1)';
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.backgroundColor = 'transparent';
        }}
        aria-label={`Playback speed ${speed}x`}
        aria-expanded={isOpen}
        aria-haspopup="listbox"
      >
        {speed}x
      </button>

      {/* Speed Dropdown Menu */}
      {isOpen && (
        <div 
          style={{
            position: 'absolute',
            top: '100%',
            left: '0',
            marginTop: '8px',
            backgroundColor: 'white',
            border: '1px solid #e5e7eb',
            borderRadius: '8px',
            boxShadow: '0 10px 25px rgba(0,0,0,0.1)',
            zIndex: 50,
            minWidth: '80px'
          }}
        >
          {speedOptions.map((speedOption) => (
            <button
              key={speedOption}
              onClick={() => handleSpeedChange(speedOption)}
              style={{
                width: '100%',
                padding: '8px 12px',
                backgroundColor: speedOption === speed ? '#f3f4f6' : 'transparent',
                color: speedOption === speed ? '#667eea' : '#374151',
                border: 'none',
                textAlign: 'left',
                fontSize: '14px',
                cursor: 'pointer',
                borderRadius: speedOption === speedOptions[0] ? '8px 8px 0 0' : 
                             speedOption === speedOptions[speedOptions.length - 1] ? '0 0 8px 8px' : '0',
                fontWeight: speedOption === speed ? '600' : 'normal'
              }}
              onMouseEnter={(e) => {
                if (speedOption !== speed) {
                  e.currentTarget.style.backgroundColor = '#f9fafb';
                }
              }}
              onMouseLeave={(e) => {
                if (speedOption !== speed) {
                  e.currentTarget.style.backgroundColor = 'transparent';
                }
              }}
              role="option"
              aria-selected={speedOption === speed}
            >
              {speedOption}x
              {speedOption === speed && (
                <span style={{ marginLeft: '8px', color: '#667eea' }}>✓</span>
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}