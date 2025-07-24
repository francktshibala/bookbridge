export interface VoiceError {
  provider: string;
  error: Error;
  timestamp: Date;
  fallbackUsed: boolean;
}

export class VoiceErrorHandler {
  private static errors: VoiceError[] = [];
  private static MAX_ERRORS = 50;

  static logError(provider: string, error: Error, fallbackUsed: boolean = false) {
    const voiceError: VoiceError = {
      provider,
      error,
      timestamp: new Date(),
      fallbackUsed
    };

    this.errors.push(voiceError);
    
    // Keep only recent errors
    if (this.errors.length > this.MAX_ERRORS) {
      this.errors.shift();
    }

    // Log to console for debugging
    console.error(`Voice Error [${provider}]:`, error.message);
    if (fallbackUsed) {
      console.log(`Fallback activated: Using Web Speech API`);
    }

    // Check if we should disable premium temporarily
    const recentErrors = this.getRecentErrors(5); // Last 5 minutes
    const premiumErrors = recentErrors.filter(e => 
      e.provider === 'elevenlabs' || e.provider === 'openai'
    );

    if (premiumErrors.length >= 3) {
      console.warn('Multiple premium voice failures detected. Consider using standard voice.');
      this.notifyUser('Premium voices are experiencing issues. Using standard voice for reliability.');
    }
  }

  static getRecentErrors(minutes: number = 5): VoiceError[] {
    const cutoff = new Date(Date.now() - minutes * 60 * 1000);
    return this.errors.filter(e => e.timestamp > cutoff);
  }

  static clearErrors() {
    this.errors = [];
  }

  private static notifyUser(message: string) {
    // This could be enhanced to show a toast notification
    console.log(`User notification: ${message}`);
  }

  static shouldUseFallback(provider: string): boolean {
    const recentErrors = this.getRecentErrors(2);
    const providerErrors = recentErrors.filter(e => e.provider === provider);
    return providerErrors.length >= 2; // Fallback after 2 errors in 2 minutes
  }
}