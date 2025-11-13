/**
 * Micro-Feedback Service
 *
 * Pure functions for managing micro-feedback submissions.
 * Handles pause-moment surveys and other lightweight feedback collection.
 *
 * @module lib/services/feedback-micro
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

/**
 * Check if user should see micro-feedback survey
 * Enforces cooldown rules and mutual exclusion with full feedback
 */
export async function shouldShowMicroFeedback(params: {
  email?: string;
  cooldownDays?: number;
}): Promise<{ shouldShow: boolean; reason?: string }> {
  const { email, cooldownDays = 60 } = params;

  // If no email, can show (anonymous users)
  if (!email) {
    return { shouldShow: true };
  }

  // Check if user submitted full feedback recently
  const recentFullFeedback = await prisma.feedback.findFirst({
    where: {
      email,
      createdAt: {
        gte: new Date(Date.now() - cooldownDays * 24 * 60 * 60 * 1000),
      },
    },
    orderBy: { createdAt: 'desc' },
  });

  if (recentFullFeedback) {
    return {
      shouldShow: false,
      reason: 'user_submitted_full_feedback',
    };
  }

  // Check if user submitted or dismissed micro-feedback recently
  const recentMicroFeedback = await prisma.microFeedback.findFirst({
    where: {
      email,
      createdAt: {
        gte: new Date(Date.now() - cooldownDays * 24 * 60 * 60 * 1000),
      },
    },
    orderBy: { createdAt: 'desc' },
  });

  if (recentMicroFeedback) {
    return {
      shouldShow: false,
      reason: recentMicroFeedback.dismissed
        ? 'user_dismissed_recently'
        : 'user_submitted_recently',
    };
  }

  return { shouldShow: true };
}

/**
 * Create a micro-feedback submission
 */
export async function createMicroFeedback(data: {
  type?: string;
  npsScore?: number;
  sentiment?: 'negative' | 'neutral' | 'positive';
  feedbackText?: string;
  email?: string;
  city?: string;
  region?: string;
  country?: string;
  deviceType?: string;
  sessionDuration?: number;
  lastBookId?: string;
  lastLevel?: string;
  dismissed?: boolean;
}) {
  const {
    type = 'pause_moment',
    npsScore,
    sentiment,
    feedbackText,
    email,
    city,
    region,
    country,
    deviceType,
    sessionDuration,
    lastBookId,
    lastLevel,
    dismissed = false,
  } = data;

  // Validation: Must have either npsScore OR sentiment
  if (!dismissed && !npsScore && !sentiment) {
    throw new Error('Either npsScore or sentiment is required');
  }

  // Generate cuid
  const cuid = generateCuid();

  const microFeedback = await prisma.microFeedback.create({
    data: {
      id: cuid,
      type,
      npsScore,
      sentiment,
      feedbackText,
      email,
      city,
      region,
      country,
      deviceType,
      sessionDuration,
      lastBookId,
      lastLevel,
      dismissed,
    },
  });

  return microFeedback;
}

/**
 * Record a micro-feedback dismissal
 */
export async function recordMicroFeedbackDismissal(data: {
  email?: string;
  city?: string;
  region?: string;
  country?: string;
  deviceType?: string;
  sessionDuration?: number;
  lastBookId?: string;
  lastLevel?: string;
}) {
  const cuid = generateCuid();

  return prisma.microFeedback.create({
    data: {
      id: cuid,
      type: 'pause_moment',
      dismissed: true,
      ...data,
    },
  });
}

/**
 * Get micro-feedback analytics
 */
export async function getMicroFeedbackAnalytics(params?: {
  startDate?: Date;
  endDate?: Date;
  city?: string;
}) {
  const { startDate, endDate, city } = params || {};

  const where = {
    createdAt: {
      ...(startDate && { gte: startDate }),
      ...(endDate && { lte: endDate }),
    },
    ...(city && { city }),
  };

  const [total, dismissed, responded, byCity, avgNps] = await Promise.all([
    // Total shown
    prisma.microFeedback.count({ where }),

    // Dismissals
    prisma.microFeedback.count({
      where: { ...where, dismissed: true },
    }),

    // Responses (not dismissed)
    prisma.microFeedback.count({
      where: { ...where, dismissed: false },
    }),

    // By city
    prisma.microFeedback.groupBy({
      by: ['city'],
      where: { ...where, city: { not: null } },
      _count: { id: true },
      orderBy: { _count: { id: 'desc' } },
      take: 10,
    }),

    // Average NPS
    prisma.microFeedback.aggregate({
      where: { ...where, npsScore: { not: null } },
      _avg: { npsScore: true },
    }),
  ]);

  return {
    total,
    dismissed,
    responded,
    dismissalRate: total > 0 ? (dismissed / total) * 100 : 0,
    responseRate: total > 0 ? (responded / total) * 100 : 0,
    avgNps: avgNps._avg.npsScore || null,
    topCities: byCity.map((c) => ({
      city: c.city,
      count: c._count.id,
    })),
  };
}

/**
 * Generate a cuid (compatible with Prisma's default)
 * Using simple implementation since we're not adding @paralleldrive/cuid2 as dependency
 */
function generateCuid(): string {
  const timestamp = Date.now().toString(36);
  const randomStr = Math.random().toString(36).substring(2, 15);
  return `c${timestamp}${randomStr}`;
}
