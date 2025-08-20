import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET() {
  try {
    // Get total audio assets count
    const audioAssetsCount = await prisma.bookAudio.count();

    // Get active queue jobs count
    const queueJobsCount = await prisma.precomputeQueue.count({
      where: {
        status: {
          in: ['pending', 'processing']
        }
      }
    });

    // Get monthly costs (current month) - mock for now as there's no cost field
    const startOfMonth = new Date();
    startOfMonth.setDate(1);
    startOfMonth.setHours(0, 0, 0, 0);

    const completedJobs = await prisma.precomputeQueue.count({
      where: {
        status: 'completed',
        createdAt: {
          gte: startOfMonth
        }
      }
    });

    // Mock monthly costs based on completed jobs (assuming $0.05 per job, already in USD)
    const monthlyCosts = completedJobs * 0.05;

    // Calculate average load time (mock for now - would need real metrics)
    const avgLoadTime = 0.8; // seconds

    // Get some recent activity for trends
    const recentJobs = await prisma.precomputeQueue.findMany({
      take: 100,
      orderBy: {
        createdAt: 'desc'
      },
      select: {
        status: true,
        createdAt: true
      }
    });

    // Calculate completion rate for trend
    const completedJobsRecent = recentJobs?.filter(job => job.status === 'completed').length || 0;
    const totalJobs = recentJobs?.length || 1;
    const completionRate = Math.round((completedJobsRecent / totalJobs) * 100);

    return NextResponse.json({
      audioAssets: {
        total: audioAssetsCount || 0,
        trend: '+12%',
        progress: Math.min((audioAssetsCount || 0) / 20000 * 100, 100)
      },
      queueJobs: {
        total: queueJobsCount || 0,
        trend: '-5%',
        progress: Math.min((queueJobsCount || 0) / 5000 * 100, 100)
      },
      monthlyCosts: {
        total: monthlyCosts,
        trend: '-15%',
        progress: Math.min((monthlyCosts) / 200 * 100, 100) // Assuming $200 budget
      },
      avgLoadTime: {
        total: avgLoadTime,
        trend: '+2%',
        progress: avgLoadTime < 2 ? 95 : 50 // Good if under 2 seconds
      },
      completionRate
    });
  } catch (error) {
    console.error('Error fetching admin stats:', error);
    return NextResponse.json(
      { error: 'Failed to fetch stats' },
      { status: 500 }
    );
  }
}