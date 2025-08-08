import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase/client';

interface ESLProgressMetrics {
  readingSpeed: number; // WPM
  comprehensionScore: number; // 0-1
  vocabularyGrowth: number; // new words per week
  sessionConsistency: number; // days active per week
  levelProgression: {
    currentLevel: string;
    timeAtLevel: number; // days
    readinessScore: number; // 0-1 (ready to advance)
  };
  totalWords: number;
  masteredWords: number;
  recentSessions: number;
  averageSessionLength: number; // minutes
}

interface ProgressRecommendation {
  type: 'vocabulary' | 'reading' | 'comprehension' | 'level_advancement';
  priority: 'low' | 'medium' | 'high';
  title: string;
  description: string;
  actionable: string;
}

export async function GET(
  request: NextRequest,
  { params }: { params: { userId: string } }
) {
  try {
    const userId = params.userId;
    const { searchParams } = new URL(request.url);
    const days = parseInt(searchParams.get('days') || '30');
    const includeRecommendations = searchParams.get('recommendations') === 'true';

    // Get user's ESL profile
    const { data: user, error: userError } = await supabase
      .from('users')
      .select('esl_level, native_language, reading_speed_wpm, created_at')
      .eq('id', userId)
      .single();

    if (userError || !user) {
      return NextResponse.json(
        { error: 'User not found or not an ESL user' },
        { status: 404 }
      );
    }

    if (!user.esl_level) {
      return NextResponse.json(
        { error: 'User is not registered as ESL learner' },
        { status: 400 }
      );
    }

    // Calculate date range
    const fromDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
    const toDate = new Date();

    // Get reading sessions data
    const { data: sessions, error: sessionsError } = await supabase
      .from('reading_sessions')
      .select('*')
      .eq('user_id', userId)
      .gte('created_at', fromDate.toISOString())
      .order('created_at', { ascending: false });

    // Get vocabulary progress data
    const { data: vocabularyProgress, error: vocabError } = await supabase
      .from('esl_vocabulary_progress')
      .select('*')
      .eq('user_id', userId);

    // Calculate progress metrics
    const metrics = calculateProgressMetrics(sessions || [], vocabularyProgress || [], user, days);
    
    // Generate recommendations if requested
    let recommendations: ProgressRecommendation[] = [];
    if (includeRecommendations) {
      recommendations = generateProgressRecommendations(metrics, user);
    }

    // Get recent vocabulary words
    const recentVocabulary = vocabularyProgress
      ?.sort((a, b) => new Date(b.last_reviewed).getTime() - new Date(a.last_reviewed).getTime())
      .slice(0, 10)
      .map(v => ({
        word: v.word,
        masteryLevel: v.mastery_level,
        encounters: v.encounters,
        difficultyLevel: v.difficulty_level,
        lastReviewed: v.last_reviewed
      })) || [];

    // Get level progression analysis
    const levelProgression = analyzeLevelProgression(metrics, user.esl_level);

    return NextResponse.json({
      success: true,
      userId,
      period: {
        days,
        from: fromDate.toISOString(),
        to: toDate.toISOString()
      },
      userProfile: {
        currentLevel: user.esl_level,
        nativeLanguage: user.native_language,
        baselineReadingSpeed: user.reading_speed_wpm || 150,
        accountAge: Math.floor((Date.now() - new Date(user.created_at).getTime()) / (1000 * 60 * 60 * 24))
      },
      metrics,
      levelProgression,
      recentVocabulary,
      recommendations,
      generatedAt: new Date().toISOString()
    });

  } catch (error) {
    console.error('ESL progress tracking failed:', error);
    return NextResponse.json(
      { 
        error: 'Progress tracking failed',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

function calculateProgressMetrics(
  sessions: any[],
  vocabularyProgress: any[],
  user: any,
  days: number
): ESLProgressMetrics {
  // Reading speed calculation
  const sessionsWithSpeed = sessions.filter(s => s.avg_reading_speed);
  const avgReadingSpeed = sessionsWithSpeed.length > 0
    ? sessionsWithSpeed.reduce((sum, s) => sum + s.avg_reading_speed, 0) / sessionsWithSpeed.length
    : user.reading_speed_wpm || 150;

  // Comprehension score calculation
  const sessionsWithComprehension = sessions.filter(s => s.comprehension_score);
  const avgComprehension = sessionsWithComprehension.length > 0
    ? sessionsWithComprehension.reduce((sum, s) => sum + parseFloat(s.comprehension_score), 0) / sessionsWithComprehension.length
    : 0.7; // Default moderate comprehension

  // Vocabulary growth (new words in the period)
  const periodStart = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
  const newWordsInPeriod = vocabularyProgress.filter(v => 
    new Date(v.first_seen) > periodStart
  ).length;
  const vocabularyGrowthPerWeek = (newWordsInPeriod / days) * 7;

  // Session consistency (days active)
  const sessionDates = [...new Set(sessions.map(s => s.created_at.split('T')[0]))];
  const activeDaysInPeriod = sessionDates.length;
  const sessionConsistency = activeDaysInPeriod / Math.min(days, 7); // Max 7 days per week

  // Vocabulary statistics
  const totalWords = vocabularyProgress.length;
  const masteredWords = vocabularyProgress.filter(v => v.mastery_level >= 4).length;

  // Session statistics
  const recentSessions = sessions.length;
  const avgSessionLength = sessions.length > 0
    ? sessions
        .filter(s => s.session_end)
        .map(s => (new Date(s.session_end).getTime() - new Date(s.session_start).getTime()) / (1000 * 60))
        .reduce((sum, duration) => sum + duration, 0) / sessions.filter(s => s.session_end).length
    : 0;

  // Time at current level (simplified calculation)
  const accountAge = Math.floor((Date.now() - new Date(user.created_at).getTime()) / (1000 * 60 * 60 * 24));
  const timeAtLevel = Math.min(accountAge, 90); // Assume max 90 days at current level

  return {
    readingSpeed: Math.round(avgReadingSpeed),
    comprehensionScore: Math.round(avgComprehension * 100) / 100,
    vocabularyGrowth: Math.round(vocabularyGrowthPerWeek * 10) / 10,
    sessionConsistency: Math.round(sessionConsistency * 100) / 100,
    levelProgression: {
      currentLevel: user.esl_level,
      timeAtLevel,
      readinessScore: calculateReadinessScore(avgReadingSpeed, avgComprehension, masteredWords, user.esl_level)
    },
    totalWords,
    masteredWords,
    recentSessions,
    averageSessionLength: Math.round(avgSessionLength)
  };
}

function calculateReadinessScore(
  readingSpeed: number,
  comprehension: number,
  masteredWords: number,
  currentLevel: string
): number {
  const levelRequirements = {
    'A1': { minSpeed: 80, minComprehension: 0.8, minWords: 20 },
    'A2': { minSpeed: 100, minComprehension: 0.8, minWords: 50 },
    'B1': { minSpeed: 120, minComprehension: 0.82, minWords: 100 },
    'B2': { minSpeed: 150, minComprehension: 0.85, minWords: 200 },
    'C1': { minSpeed: 180, minComprehension: 0.88, minWords: 350 },
    'C2': { minSpeed: 200, minComprehension: 0.9, minWords: 500 }
  };

  const nextLevel = getNextLevel(currentLevel);
  if (!nextLevel) return 1.0; // Already at highest level

  const requirements = levelRequirements[nextLevel as keyof typeof levelRequirements];
  if (!requirements) return 0.0;

  const speedScore = Math.min(1, readingSpeed / requirements.minSpeed);
  const comprehensionScore = Math.min(1, comprehension / requirements.minComprehension);
  const vocabularyScore = Math.min(1, masteredWords / requirements.minWords);

  return Math.round(((speedScore + comprehensionScore + vocabularyScore) / 3) * 100) / 100;
}

function getNextLevel(currentLevel: string): string | null {
  const levelProgression = ['A1', 'A2', 'B1', 'B2', 'C1', 'C2'];
  const currentIndex = levelProgression.indexOf(currentLevel);
  return currentIndex >= 0 && currentIndex < levelProgression.length - 1
    ? levelProgression[currentIndex + 1]
    : null;
}

function analyzeLevelProgression(metrics: ESLProgressMetrics, currentLevel: string) {
  const nextLevel = getNextLevel(currentLevel);
  const readinessScore = metrics.levelProgression.readinessScore;
  
  let status = 'developing';
  let recommendation = 'Continue practicing at your current level.';
  
  if (readinessScore >= 0.8) {
    status = 'ready';
    recommendation = nextLevel 
      ? `You're ready to advance to ${nextLevel} level!`
      : 'Congratulations! You have reached the highest level.';
  } else if (readinessScore >= 0.6) {
    status = 'approaching';
    recommendation = nextLevel
      ? `You're making good progress toward ${nextLevel} level.`
      : 'Keep up the excellent work!';
  }

  return {
    currentLevel,
    nextLevel,
    readinessScore,
    status,
    recommendation,
    timeAtLevel: metrics.levelProgression.timeAtLevel,
    strengthAreas: identifyStrengths(metrics),
    improvementAreas: identifyImprovements(metrics, currentLevel)
  };
}

function identifyStrengths(metrics: ESLProgressMetrics): string[] {
  const strengths = [];
  
  if (metrics.readingSpeed > 150) strengths.push('Excellent reading speed');
  if (metrics.comprehensionScore > 0.85) strengths.push('Strong comprehension skills');
  if (metrics.vocabularyGrowth > 8) strengths.push('Rapid vocabulary acquisition');
  if (metrics.sessionConsistency >= 0.7) strengths.push('Consistent daily practice');
  if (metrics.masteredWords > 100) strengths.push('Strong vocabulary foundation');

  return strengths.length > 0 ? strengths : ['Committed to learning', 'Making steady progress'];
}

function identifyImprovements(metrics: ESLProgressMetrics, currentLevel: string): string[] {
  const improvements = [];
  
  if (metrics.readingSpeed < 100) improvements.push('Reading speed could be improved');
  if (metrics.comprehensionScore < 0.75) improvements.push('Focus on comprehension exercises');
  if (metrics.vocabularyGrowth < 3) improvements.push('Increase vocabulary learning');
  if (metrics.sessionConsistency < 0.4) improvements.push('Try to read more consistently');
  if (metrics.averageSessionLength < 15) improvements.push('Consider longer reading sessions');

  return improvements;
}

function generateProgressRecommendations(
  metrics: ESLProgressMetrics,
  user: any
): ProgressRecommendation[] {
  const recommendations: ProgressRecommendation[] = [];

  // Vocabulary recommendations
  if (metrics.vocabularyGrowth < 5) {
    recommendations.push({
      type: 'vocabulary',
      priority: 'high',
      title: 'Increase Vocabulary Learning',
      description: `You're learning ${metrics.vocabularyGrowth.toFixed(1)} new words per week. Aim for 8-10 words.`,
      actionable: 'Try to look up 2-3 new words during each reading session.'
    });
  }

  // Reading speed recommendations
  const expectedSpeed = getExpectedSpeedForLevel(user.esl_level);
  if (metrics.readingSpeed < expectedSpeed * 0.8) {
    recommendations.push({
      type: 'reading',
      priority: 'medium',
      title: 'Improve Reading Speed',
      description: `Your reading speed is ${metrics.readingSpeed} WPM. Target: ${expectedSpeed} WPM for ${user.esl_level} level.`,
      actionable: 'Practice reading easier texts to build fluency before tackling complex literature.'
    });
  }

  // Session consistency
  if (metrics.sessionConsistency < 0.6) {
    recommendations.push({
      type: 'reading',
      priority: 'high',
      title: 'Read More Consistently',
      description: `You're active ${Math.round(metrics.sessionConsistency * 7)} days per week. Aim for 5-6 days.`,
      actionable: 'Set a daily reading goal of 15-20 minutes to build consistent habits.'
    });
  }

  // Level advancement
  if (metrics.levelProgression.readinessScore >= 0.8) {
    recommendations.push({
      type: 'level_advancement',
      priority: 'high',
      title: 'Ready to Advance!',
      description: `Your readiness score is ${(metrics.levelProgression.readinessScore * 100).toFixed(0)}%`,
      actionable: `Consider updating your profile to ${getNextLevel(user.esl_level)} level for more challenging content.`
    });
  }

  // Comprehension improvements
  if (metrics.comprehensionScore < 0.8) {
    recommendations.push({
      type: 'comprehension',
      priority: 'medium',
      title: 'Focus on Comprehension',
      description: `Your comprehension score is ${(metrics.comprehensionScore * 100).toFixed(0)}%. Aim for 85%+.`,
      actionable: 'Try asking more questions about themes and character motivations while reading.'
    });
  }

  return recommendations.sort((a, b) => {
    const priorityOrder = { 'high': 3, 'medium': 2, 'low': 1 };
    return priorityOrder[b.priority] - priorityOrder[a.priority];
  });
}

function getExpectedSpeedForLevel(level: string): number {
  const expectedSpeeds = {
    'A1': 80, 'A2': 100, 'B1': 120, 'B2': 150, 'C1': 180, 'C2': 200
  };
  return expectedSpeeds[level as keyof typeof expectedSpeeds] || 120;
}