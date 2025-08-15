'use client';

import { useState, useEffect, useRef } from 'react';
import { createClient } from '@/lib/supabase/client';

interface ESLControlsProps {
  onLevelChange?: (level: string) => void;
}

export function ESLControls({ onLevelChange }: ESLControlsProps) {
  const [eslLevel, setESLLevel] = useState<string>('B2');
  const [isLoading, setIsLoading] = useState(true);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    loadUserLevel();
  }, []);

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsDropdownOpen(false);
      }
    }

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const loadUserLevel = async () => {
    try {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      
      if (user) {
        const { data } = await supabase
          .from('users')
          .select('esl_level')
          .eq('id', user.id)
          .single();
        
        if (data?.esl_level) {
          setESLLevel(data.esl_level);
        }
      }
    } catch (error) {
      console.error('Failed to load ESL level:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleLevelChange = async (newLevel: string) => {
    setESLLevel(newLevel);
    setIsDropdownOpen(false);
    onLevelChange?.(newLevel);
    
    // Save to database
    try {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      
      if (user) {
        await supabase
          .from('users')
          .update({ esl_level: newLevel })
          .eq('id', user.id);
      }
    } catch (error) {
      console.error('Failed to save ESL level:', error);
    }
  };

  const levels = ['A1', 'A2', 'B1', 'B2', 'C1', 'C2'];

  if (isLoading) {
    return (
      <div className="flex items-center gap-2 px-3 py-2 bg-white rounded-lg border border-gray-200">
        <div className="w-4 h-4 border-2 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
        <span className="text-sm text-gray-600">Loading...</span>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-1">
      <label className="text-xs font-medium text-gray-700 hidden sm:block">Level:</label>
      <div className="relative" ref={dropdownRef}>
        {/* Badge Button - Matches Wireframe Design */}
        <button
          onClick={() => {
            console.log('CEFR Badge clicked, dropdown open:', !isDropdownOpen);
            setIsDropdownOpen(!isDropdownOpen);
          }}
          style={{
            width: '64px',
            height: '64px',
            backgroundColor: '#667eea',
            color: 'white',
            fontWeight: 'bold',
            borderRadius: '50%',
            border: 'none',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '18px',
            boxShadow: '0 6px 16px rgba(102, 126, 234, 0.4)',
            transition: 'all 0.2s ease'
          }}
          onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#5a6fd8'}
          onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#667eea'}
          aria-label={`CEFR Level ${eslLevel}`}
          aria-expanded={isDropdownOpen}
          aria-haspopup="listbox"
        >
          {eslLevel}
        </button>

        {/* Dropdown Menu */}
        {isDropdownOpen && (
          <div className="absolute top-full left-0 mt-2 bg-white border border-gray-200 rounded-lg shadow-lg z-50 min-w-[80px]">
            {levels.map((level) => (
              <button
                key={level}
                onClick={() => handleLevelChange(level)}
                className={`w-full px-3 py-2 text-left text-sm hover:bg-gray-50 first:rounded-t-lg last:rounded-b-lg transition-colors ${
                  level === eslLevel ? 'bg-blue-50 text-blue-600 font-medium' : 'text-gray-700'
                }`}
                role="option"
                aria-selected={level === eslLevel}
              >
                {level}
                {level === eslLevel && (
                  <span className="ml-2 text-blue-500">✓</span>
                )}
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}