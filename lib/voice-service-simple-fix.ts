// SIMPLE FIX: Replace the onCharacterTiming function in voice-service.ts with this:

onCharacterTiming: (timing: CharacterTiming) => {
  const words = options.text.trim().split(/\s+/).filter(word => word.length > 0);
  
  // Get audio duration (default to 5 seconds if not available)
  let audioDuration = 5.0;
  if (typeof window !== 'undefined' && (window as any).lastAudioDuration) {
    audioDuration = (window as any).lastAudioDuration;
  }
  
  // Simple time-based word highlighting
  const timePerWord = audioDuration / words.length;
  const currentWord = Math.floor(timing.startTime / timePerWord);
  const clampedWord = Math.min(currentWord, words.length - 1);
  
  // Only log and highlight if we've moved to a new word
  if (clampedWord > lastWordHighlighted) {
    console.log(`✅ WORD ${clampedWord}: "${words[clampedWord]}" at ${timing.startTime.toFixed(2)}s`);
    lastWordHighlighted = clampedWord;
    
    options.onCharacterBoundary?.({
      characterIndex: processedCharacters,
      character: timing.character,
      elapsedTime: timing.startTime,
      wordIndex: clampedWord
    });
  }
  
  processedCharacters++;
};