/**
 * Demo Voice Configuration for Interactive Reading Demo
 *
 * This configuration maps CEFR levels to specific ElevenLabs voices for the
 * homepage Pride & Prejudice interactive demo. Each level has two voice options
 * (male and female) for user testing and preference collection.
 *
 * Purpose: Test user voice preferences on short demos before committing to
 * expensive full-book audio generation ($10 demo vs $500+ full book).
 *
 * Strategic Voice Assignment based on Voice Casting Guide (docs/research/VOICE_CASTING_GUIDE.md)
 */

export interface DemoVoice {
  fileId: string;           // Used in audio filename: pride-prejudice-{level}-{fileId}-enhanced.mp3
  name: string;             // Display name shown in voice selector UI
  gender: 'male' | 'female';
  elevenLabsId: string;     // ElevenLabs API voice ID for TTS generation
  description: string;      // Short description for UI tooltip/display
}

/**
 * All voices available in the demo
 * Key = short identifier used throughout the app
 */
export const DEMO_VOICES = {
  // A1 Voices - Soothing + Proven Authority
  hope: {
    fileId: 'hope',
    name: 'Hope',
    gender: 'female' as const,
    elevenLabsId: 'iCrDUkL56s3C8sCRl7wb',
    description: 'Soothing narrator'
  },
  daniel: {
    fileId: 'daniel',
    name: 'Daniel',
    gender: 'male' as const,
    elevenLabsId: 'onwK4e9ZLuTAKqWW03F9',
    description: 'British authority (locked - proven best)'
  },

  // A2 Voices - Young Enchanting + Warm Storyteller
  arabella: {
    fileId: 'arabella',
    name: 'Arabella',
    gender: 'female' as const,
    elevenLabsId: 'aEO01A4wXwd1O8GPgGlF',
    description: 'Young enchanting narrator'
  },
  grandpa_spuds: {
    fileId: 'grandpa-spuds',
    name: 'Grandpa Spuds',
    gender: 'male' as const,
    elevenLabsId: 'NOpBlnGInO9m6vDvFkFC',
    description: 'Warm storyteller'
  },

  // B1 Voices - Professional + Engaging American
  jane: {
    fileId: 'jane',
    name: 'Jane',
    gender: 'female' as const,
    elevenLabsId: 'RILOU7YmBhvwJGDGjNmP',
    description: 'Professional audiobook reader'
  },
  james: {
    fileId: 'james',
    name: 'James',
    gender: 'male' as const,
    elevenLabsId: 'EkK5I93UQWFDigLMpZcX',
    description: 'Husky & engaging'
  },

  // B2 Voices - Modern Authentic + Educator
  zara: {
    fileId: 'zara',
    name: 'Zara',
    gender: 'female' as const,
    elevenLabsId: 'jqcCZkN6Knx8BJ5TBdYR',
    description: 'Warm, real-world conversationalist'
  },
  david_castlemore: {
    fileId: 'david-castlemore',
    name: 'David Castlemore',
    gender: 'male' as const,
    elevenLabsId: 'XjLkpWUlnhS8i7gGz3lZ',
    description: 'Newsreader and educator'
  },

  // C1 Voices - Elegant British + Documentary
  sally_ford: {
    fileId: 'sally-ford',
    name: 'Sally Ford',
    gender: 'female' as const,
    elevenLabsId: 'kBag1HOZlaVBH7ICPE8x',
    description: 'British mature elegance'
  },
  frederick_surrey: {
    fileId: 'frederick-surrey',
    name: 'Frederick Surrey',
    gender: 'male' as const,
    elevenLabsId: 'j9jfwdrw7BRfcR43Qohk',
    description: 'Documentary British narrator'
  },

  // C2 Voices - Cultured Educational + Deep Authority
  vivie: {
    fileId: 'vivie',
    name: 'Vivie',
    gender: 'female' as const,
    elevenLabsId: 'z7U1SjrEq4fDDDriOQEN',
    description: 'Cultured educational narrator'
  },
  john_doe: {
    fileId: 'john-doe',
    name: 'John Doe',
    gender: 'male' as const,
    elevenLabsId: 'EiNlNiXeDU1pqqOPrYMO',
    description: 'Deep American authority'
  },

  // Original Voices - Baseline + Educator
  sarah: {
    fileId: 'sarah',
    name: 'Sarah',
    gender: 'female' as const,
    elevenLabsId: 'EXAVITQu4vr4xnSDxMaL',
    description: 'Original baseline (locked)'
  }
} as const;

/**
 * TypeScript type for all valid voice IDs
 */
export type DemoVoiceId = keyof typeof DEMO_VOICES;

/**
 * CEFR levels supported in the demo
 */
export type CEFRLevel = 'A1' | 'A2' | 'B1' | 'B2' | 'C1' | 'C2' | 'Original';

/**
 * Strategic Voice Assignment by Level
 *
 * Maps each CEFR level to optimal male/female voice pairing based on:
 * - Voice characteristics matching difficulty level
 * - Strategic reasoning from Voice Casting Guide
 * - User research objectives (testing variety of voice types)
 *
 * Locked Voices (proven successful, kept as controls):
 * - A1 Male: Daniel (production-proven "best voice so far")
 * - Original Female: Sarah (baseline reference)
 */
export const LEVEL_TO_VOICES: Record<CEFRLevel, { female: DemoVoiceId; male: DemoVoiceId }> = {
  'A1': {
    female: 'hope',           // Soothing for beginners
    male: 'daniel'            // LOCKED - Proven best, British authority
  },
  'A2': {
    female: 'arabella',       // Young enchanting for engagement
    male: 'grandpa_spuds'     // Warm approachable storyteller
  },
  'B1': {
    female: 'jane',           // Professional clear narration
    male: 'james'             // Engaging American voice
  },
  'B2': {
    female: 'zara',           // Modern authentic conversationalist
    male: 'david_castlemore'  // ESL educator specialist
  },
  'C1': {
    female: 'sally_ford',     // Elegant sophisticated British
    male: 'frederick_surrey'  // Documentary professional
  },
  'C2': {
    female: 'vivie',          // Cultured educational excellence
    male: 'john_doe'          // Deep authoritative American
  },
  'Original': {
    female: 'sarah',          // LOCKED - Original baseline for comparison
    male: 'david_castlemore'  // Educator voice for original text
  }
};

/**
 * Get voice configuration for a specific level and gender
 *
 * @param level - CEFR level (A1 through C2, or Original)
 * @param gender - 'male' or 'female'
 * @returns Complete voice configuration object
 *
 * @example
 * const femaleA1Voice = getVoiceFor('A1', 'female');
 * // Returns: { fileId: 'hope', name: 'Hope', ... }
 */
export function getVoiceFor(level: CEFRLevel, gender: 'male' | 'female'): DemoVoice {
  const voiceId = LEVEL_TO_VOICES[level][gender];
  return DEMO_VOICES[voiceId];
}

/**
 * Get all voices available for a specific level (both genders)
 *
 * @param level - CEFR level
 * @returns Object with female and male voice configurations
 */
export function getVoicesForLevel(level: CEFRLevel): { female: DemoVoice; male: DemoVoice } {
  return {
    female: getVoiceFor(level, 'female'),
    male: getVoiceFor(level, 'male')
  };
}

/**
 * Get all voices of a specific gender across all levels
 *
 * @param gender - 'male' or 'female'
 * @returns Array of voice configurations
 */
export function getVoicesByGender(gender: 'male' | 'female'): DemoVoice[] {
  return Object.values(DEMO_VOICES).filter(voice => voice.gender === gender);
}

/**
 * Check if a voice ID is valid
 *
 * @param voiceId - Voice ID to validate
 * @returns true if voice ID exists in configuration
 */
export function isValidVoiceId(voiceId: string): voiceId is DemoVoiceId {
  return voiceId in DEMO_VOICES;
}

/**
 * Get voice configuration by ID (with type safety)
 *
 * @param voiceId - Voice ID
 * @returns Voice configuration or undefined if not found
 */
export function getVoiceById(voiceId: string): DemoVoice | undefined {
  if (isValidVoiceId(voiceId)) {
    return DEMO_VOICES[voiceId];
  }
  return undefined;
}
