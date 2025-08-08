import { createClient } from '@/lib/supabase/client';

export interface VoiceUsageEvent {
  user_id: string;
  provider: 'web-speech' | 'openai' | 'elevenlabs' | 'elevenlabs-websocket';
  voice_id?: string;
  character_count: number;
  duration_seconds?: number;
  book_id?: string;
  created_at: Date;
}

export class VoiceUsageTracker {
  private static instance: VoiceUsageTracker;
  private supabase = createClient();

  private constructor() {}

  public static getInstance(): VoiceUsageTracker {
    if (!VoiceUsageTracker.instance) {
      VoiceUsageTracker.instance = new VoiceUsageTracker();
    }
    return VoiceUsageTracker.instance;
  }

  async trackUsage(event: Omit<VoiceUsageEvent, 'created_at' | 'user_id'>): Promise<void> {
    try {
      // Get current user
      const { data: { user } } = await this.supabase.auth.getUser();
      if (!user) return;

      // Store in local storage for now (can be moved to database later)
      const storageKey = `voice-usage-${user.id}`;
      const existingData = localStorage.getItem(storageKey);
      const usageData = existingData ? JSON.parse(existingData) : [];
      
      usageData.push({
        ...event,
        user_id: user.id,
        created_at: new Date().toISOString()
      });

      // Keep only last 100 events
      if (usageData.length > 100) {
        usageData.splice(0, usageData.length - 100);
      }

      localStorage.setItem(storageKey, JSON.stringify(usageData));

      // Log to console for monitoring
      console.log('Voice usage tracked:', {
        provider: event.provider,
        characters: event.character_count,
        voice: event.voice_id
      });
    } catch (error) {
      console.error('Failed to track voice usage:', error);
    }
  }

  async getUsageStats(userId?: string): Promise<{
    total_characters: number;
    by_provider: Record<string, number>;
    premium_usage_percentage: number;
  }> {
    try {
      const { data: { user } } = await this.supabase.auth.getUser();
      const targetUserId = userId || user?.id;
      if (!targetUserId) {
        return {
          total_characters: 0,
          by_provider: {},
          premium_usage_percentage: 0
        };
      }

      const storageKey = `voice-usage-${targetUserId}`;
      const existingData = localStorage.getItem(storageKey);
      const usageData: VoiceUsageEvent[] = existingData ? JSON.parse(existingData) : [];

      const stats = {
        total_characters: 0,
        by_provider: {} as Record<string, number>,
        premium_usage_percentage: 0
      };

      let premiumChars = 0;
      
      usageData.forEach(event => {
        stats.total_characters += event.character_count;
        stats.by_provider[event.provider] = (stats.by_provider[event.provider] || 0) + event.character_count;
        
        if (event.provider === 'elevenlabs' || event.provider === 'openai') {
          premiumChars += event.character_count;
        }
      });

      if (stats.total_characters > 0) {
        stats.premium_usage_percentage = (premiumChars / stats.total_characters) * 100;
      }

      return stats;
    } catch (error) {
      console.error('Failed to get usage stats:', error);
      return {
        total_characters: 0,
        by_provider: {},
        premium_usage_percentage: 0
      };
    }
  }

  async getMonthlyUsage(): Promise<{
    elevenlabs_characters: number;
    openai_characters: number;
    estimated_cost: number;
  }> {
    try {
      const stats = await this.getUsageStats();
      
      // ElevenLabs: ~1000 characters per credit, 100k credits = $11/month
      const elevenlabsCredits = (stats.by_provider['elevenlabs'] || 0) / 1000;
      const elevenlabsCost = (elevenlabsCredits / 100000) * 11;
      
      // OpenAI TTS: $15 per 1M characters
      const openaiCost = ((stats.by_provider['openai'] || 0) / 1000000) * 15;
      
      return {
        elevenlabs_characters: stats.by_provider['elevenlabs'] || 0,
        openai_characters: stats.by_provider['openai'] || 0,
        estimated_cost: elevenlabsCost + openaiCost
      };
    } catch (error) {
      console.error('Failed to get monthly usage:', error);
      return {
        elevenlabs_characters: 0,
        openai_characters: 0,
        estimated_cost: 0
      };
    }
  }
}

export const voiceUsageTracker = VoiceUsageTracker.getInstance();