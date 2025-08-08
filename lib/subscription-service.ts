import { createClient } from '@/lib/supabase/server';
import { 
  Subscription, 
  UsageTracking, 
  AnalyzedBook, 
  SubscriptionTier,
  SUBSCRIPTION_LIMITS 
} from '@/types/subscription';

export class SubscriptionService {
  static async getUserSubscription(userId: string): Promise<Subscription | null> {
    const supabase = await createClient();
    
    const { data, error } = await supabase
      .from('subscriptions')
      .select('*')
      .eq('userId', userId)
      .single();
    
    if (error) {
      console.error('Error fetching subscription:', error);
      return null;
    }
    
    return data;
  }

  static async getUserUsage(userId: string): Promise<UsageTracking | null> {
    const supabase = await createClient();
    
    const { data, error } = await supabase
      .from('usage_tracking')
      .select('*')
      .eq('userId', userId)
      .order('lastResetDate', { ascending: false })
      .limit(1);
    
    if (error) {
      console.error('Error fetching usage:', error);
      return null;
    }
    
    // Return the first (most recent) record if multiple exist
    return data && data.length > 0 ? data[0] : null;
  }

  static async canAnalyzeBook(userId: string, bookSource?: string): Promise<{
    allowed: boolean;
    reason?: string;
    remainingAnalyses?: number;
  }> {
    let subscription = await this.getUserSubscription(userId);
    let usage = await this.getUserUsage(userId);
    
    // Create default subscription if missing
    if (!subscription) {
      console.log('Creating default free subscription for user:', userId);
      const supabase = await createClient();
      const { data, error } = await supabase
        .from('subscriptions')
        .insert({
          userId: userId,
          tier: 'free',
          status: 'active'
        })
        .select()
        .single();
      
      if (!error && data) {
        subscription = data;
      }
    }
    
    // Create default usage record if missing
    if (!usage && subscription) {
      console.log('Creating default usage record for user:', userId);
      const supabase = await createClient();
      const { data, error } = await supabase
        .from('usage')
        .insert({
          id: `usage-${Date.now()}`,
          userId: userId,
          date: new Date().toISOString(),
          queries: 0,
          tokens: 0,
          cost: 0
        });
      
      if (!error) {
        // Try to fetch again
        usage = await this.getUserUsage(userId);
      }
    }
    
    if (!subscription || !usage) {
      return { allowed: false, reason: 'Unable to verify subscription status' };
    }

    // Check if book is public domain
    const isPublicDomain = bookSource && ['gutenberg', 'openlibrary', 'standardebooks'].includes(bookSource);
    
    // Premium and student users have unlimited analyses
    if (subscription.tier === 'premium' || subscription.tier === 'student') {
      return { allowed: true };
    }
    
    // Free users with public domain books
    if (isPublicDomain && SUBSCRIPTION_LIMITS.free.hasUnlimitedPublicDomain) {
      return { allowed: true };
    }
    
    // Check monthly limit for free users
    const limit = SUBSCRIPTION_LIMITS.free.monthlyBookLimit;
    const currentUsage = usage.bookAnalysesCount;
    
    // Check if we need to reset the monthly counter
    const now = new Date();
    const lastReset = new Date(usage.lastResetDate);
    const daysSinceReset = Math.floor((now.getTime() - lastReset.getTime()) / (1000 * 60 * 60 * 24));
    
    if (daysSinceReset >= 30) {
      // Reset the counter
      await this.resetMonthlyUsage(userId);
      return { allowed: true, remainingAnalyses: limit - 1 };
    }
    
    if (currentUsage >= limit) {
      return { 
        allowed: false, 
        reason: `You've reached your monthly limit of ${limit} book analyses. Upgrade to Premium for unlimited access.`,
        remainingAnalyses: 0
      };
    }
    
    return { 
      allowed: true, 
      remainingAnalyses: limit - currentUsage - 1 
    };
  }

  static async trackBookAnalysis(
    userId: string, 
    bookId: string, 
    bookTitle?: string,
    bookSource?: string
  ): Promise<void> {
    const supabase = await createClient();
    
    // Record the analyzed book
    await supabase
      .from('analyzedBooks')
      .insert({
        userId: userId,
        bookId: bookId,
        bookTitle: bookTitle,
        bookSource: bookSource,
        isPublicDomain: bookSource && ['gutenberg', 'openlibrary', 'standardebooks'].includes(bookSource)
      });
    
    // Update usage count if not public domain
    const isPublicDomain = bookSource && ['gutenberg', 'openlibrary', 'standardebooks'].includes(bookSource);
    const subscription = await this.getUserSubscription(userId);
    
    if (subscription?.tier === 'free' && !isPublicDomain) {
      // Get current usage
      const currentUsage = await this.getUserUsage(userId);
      const newCount = (currentUsage?.bookAnalysesCount || 0) + 1;
      
      await supabase
        .from('usage_tracking')
        .update({ 
          bookAnalysesCount: newCount,
          updatedAt: new Date().toISOString()
        })
        .eq('userId', userId);
    }
  }

  static async resetMonthlyUsage(userId: string): Promise<void> {
    const supabase = await createClient();
    
    await supabase
      .from('usage_tracking')
      .update({
        bookAnalysesCount: 0,
        lastResetDate: new Date().toISOString(),
        currentMonthStart: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      })
      .eq('userId', userId);
  }

  static async updateSubscriptionTier(
    userId: string, 
    tier: SubscriptionTier,
    stripeData?: {
      customerId?: string;
      subscriptionId?: string;
      currentPeriodStart?: Date;
      currentPeriodEnd?: Date;
    }
  ): Promise<void> {
    const supabase = await createClient();
    
    const updateData: any = {
      tier,
      updatedAt: new Date().toISOString()
    };
    
    if (stripeData) {
      if (stripeData.customerId) updateData.stripeCustomerId = stripeData.customerId;
      if (stripeData.subscriptionId) updateData.stripeSubscriptionId = stripeData.subscriptionId;
      if (stripeData.currentPeriodStart) updateData.currentPeriodStart = stripeData.currentPeriodStart.toISOString();
      if (stripeData.currentPeriodEnd) updateData.currentPeriodEnd = stripeData.currentPeriodEnd.toISOString();
    }
    
    await supabase
      .from('subscriptions')
      .update(updateData)
      .eq('userId', userId);
  }

  static async getAnalyzedBooksThisMonth(userId: string): Promise<AnalyzedBook[]> {
    const supabase = await createClient();
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    
    const { data, error } = await supabase
      .from('analyzedBooks')
      .select('*')
      .eq('userId', userId)
      .gte('analyzedAt', thirtyDaysAgo.toISOString())
      .order('analyzedAt', { ascending: false });
    
    if (error) {
      console.error('Error fetching analyzed books:', error);
      return [];
    }
    
    return data || [];
  }

  static async verifyStudentEmail(userId: string, email: string): Promise<boolean> {
    // Check if email ends with .edu
    if (!email.toLowerCase().endsWith('.edu')) {
      return false;
    }
    
    const supabase = await createClient();
    
    await supabase
      .from('subscriptions')
      .update({
        isStudentVerified: true,
        studentEmail: email,
        studentVerificationDate: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      })
      .eq('userId', userId);
    
    return true;
  }
}