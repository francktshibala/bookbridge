export interface ElevenLabsVoice {
  voice_id: string;
  name: string;
  category: 'male' | 'female' | 'child';
  accent: string;
  description: string;
  preview_url?: string;
}

// Popular ElevenLabs voices for book narration
export const ELEVENLABS_VOICES: ElevenLabsVoice[] = [
  // Female Voices
  {
    voice_id: 'EXAVITQu4vr4xnSDxMaL',
    name: 'Bella',
    category: 'female',
    accent: 'American',
    description: 'Warm, engaging female narrator'
  },
  {
    voice_id: 'MF3mGyEYCl7XYWbV9V6O',
    name: 'Elli',
    category: 'female',
    accent: 'American',
    description: 'Young adult female voice'
  },
  {
    voice_id: 'pNInz6obpgDQGcFmaJgB',
    name: 'Adam',
    category: 'male',
    accent: 'American',
    description: 'Deep, professional male narrator'
  },
  {
    voice_id: 'VR6AewLTigWG4xSOukaG',
    name: 'Arnold',
    category: 'male',
    accent: 'American',
    description: 'Strong, authoritative male voice'
  },
  {
    voice_id: 'onwK4e9ZLuTAKqWW03F9',
    name: 'Daniel',
    category: 'male',
    accent: 'British',
    description: 'British male narrator'
  },
  {
    voice_id: 'ThT5KcBeYPX3keUQqHPh',
    name: 'Dorothy',
    category: 'female',
    accent: 'British',
    description: 'British female narrator'
  }
];

// Default voice for new users
export const DEFAULT_ELEVENLABS_VOICE = 'EXAVITQu4vr4xnSDxMaL'; // Bella