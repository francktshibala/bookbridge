export type SubscriptionTier = 'free' | 'premium' | 'student';

export interface Subscription {
  id: string;
  userId: string;
  tier: SubscriptionTier;
  stripeCustomerId?: string;
  stripeSubscriptionId?: string;
  appleOriginalTransactionId?: string;
  appleLatestTransactionId?: string;
  appleEnvironment?: 'Production' | 'Sandbox';
  appleExpiresDate?: Date;
  appleIsInBillingRetry?: boolean;
  appleStatus?: string;
  appleProductId?: string;
  appleOfferType?: string;
  appleRevocationReason?: string;
  appleRevocationDate?: Date;
  currentPeriodStart?: Date;
  currentPeriodEnd?: Date;
  cancelAtPeriodEnd: boolean;
  isStudentVerified: boolean;
  studentEmail?: string;
  studentVerificationDate?: Date;
  createdAt: Date;
  updatedAt: Date;
}

export interface UsageTracking {
  id: string;
  userId: string;
  bookAnalysesCount: number;
  lastResetDate: Date;
  currentMonthStart: Date;
  createdAt: Date;
  updatedAt: Date;
}

export interface PaymentHistory {
  id: string;
  userId: string;
  stripePaymentIntentId?: string;
  amount: number; // in cents
  currency: string;
  status: string;
  description?: string;
  createdAt: Date;
}

export interface AnalyzedBook {
  id: string;
  userId: string;
  bookId: string;
  bookTitle?: string;
  bookSource?: 'uploaded' | 'gutenberg' | 'openlibrary' | 'googlebooks';
  analyzedAt: Date;
  isPublicDomain: boolean;
}

export interface SubscriptionLimits {
  monthlyBookLimit: number;
  hasUnlimitedPublicDomain: boolean;
  canUseVoiceFeatures: boolean;
  canExportNotes: boolean;
  prioritySupport: boolean;
}

export const SUBSCRIPTION_LIMITS: Record<SubscriptionTier, SubscriptionLimits> = {
  free: {
    monthlyBookLimit: 3,
    hasUnlimitedPublicDomain: true,
    canUseVoiceFeatures: false,
    canExportNotes: false,
    prioritySupport: false,
  },
  premium: {
    monthlyBookLimit: -1, // unlimited
    hasUnlimitedPublicDomain: true,
    canUseVoiceFeatures: true,
    canExportNotes: true,
    prioritySupport: true,
  },
  student: {
    monthlyBookLimit: -1, // unlimited
    hasUnlimitedPublicDomain: true,
    canUseVoiceFeatures: true,
    canExportNotes: true,
    prioritySupport: false,
  },
};

export const PRICING = {
  premium: {
    monthly: 400, // $4.00 in cents
    display: '$4/month',
  },
  student: {
    monthly: 200, // $2.00 in cents
    display: '$2/month',
  },
};