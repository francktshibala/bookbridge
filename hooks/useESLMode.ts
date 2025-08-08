import { useState, useEffect, useCallback } from 'react';
import { createClient } from '@/lib/supabase/client';

interface ESLModeState {
  enabled: boolean;
  level: string | null;
  nativeLanguage: string | null;
  learningGoals: string | null;
  isLoading: boolean;
}

export function useESLMode() {
  const [eslState, setESLState] = useState<ESLModeState>({
    enabled: false,
    level: null,
    nativeLanguage: null,
    learningGoals: null,
    isLoading: true
  });

  useEffect(() => {
    initializeESLMode();
  }, []);

  const initializeESLMode = async () => {
    try {
      // Check localStorage for ESL mode preference
      const savedESLMode = localStorage.getItem('esl-mode-enabled');
      const enabled = savedESLMode === 'true';

      // Fetch user's ESL profile
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      
      if (user) {
        const { data, error } = await supabase
          .from('users')
          .select('esl_level, native_language, learning_goals')
          .eq('id', user.id)
          .single();

        if (data) {
          setESLState({
            enabled: enabled && !!data.esl_level, // Only enable if user has ESL level
            level: data.esl_level,
            nativeLanguage: data.native_language,
            learningGoals: data.learning_goals,
            isLoading: false
          });
          return;
        }
      }

      setESLState(prev => ({ ...prev, isLoading: false }));
    } catch (error) {
      console.error('Error initializing ESL mode:', error);
      setESLState(prev => ({ ...prev, isLoading: false }));
    }
  };

  const toggleESLMode = useCallback(() => {
    setESLState(prev => {
      const newEnabled = !prev.enabled;
      localStorage.setItem('esl-mode-enabled', newEnabled.toString());
      return { ...prev, enabled: newEnabled };
    });
  }, []);

  const setESLLevel = useCallback(async (level: string) => {
    try {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      
      if (user) {
        const { error } = await supabase
          .from('users')
          .update({ esl_level: level })
          .eq('id', user.id);

        if (!error) {
          setESLState(prev => ({ ...prev, level }));
        }
      }
    } catch (error) {
      console.error('Error updating ESL level:', error);
    }
  }, []);

  const simplifyText = useCallback(async (bookId: string, text: string) => {
    if (!eslState.enabled || !eslState.level) {
      return text;
    }

    try {
      const response = await fetch(`/api/esl/books/${bookId}/simplify`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          text,
          targetLevel: eslState.level,
          nativeLanguage: eslState.nativeLanguage
        })
      });

      if (response.ok) {
        const data = await response.json();
        return data.simplifiedText || text;
      }
    } catch (error) {
      console.error('Error simplifying text:', error);
    }

    return text;
  }, [eslState]);

  return {
    eslEnabled: eslState.enabled,
    eslLevel: eslState.level,
    nativeLanguage: eslState.nativeLanguage,
    learningGoals: eslState.learningGoals,
    isLoading: eslState.isLoading,
    toggleESLMode,
    setESLLevel,
    simplifyText
  };
}