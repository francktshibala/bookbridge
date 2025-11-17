/**
 * Script to fetch feedback from 11/10/2025
 *
 * Retrieves all feedback submitted on November 10, 2025 with:
 * - User names
 * - Email addresses
 * - NPS ratings
 * - Whether they want a 15-minute meeting
 */

import { prisma } from '../lib/prisma';

async function getFeedbackFromYesterday() {
  try {
    // Define the date range for 11/10/2025 (yesterday)
    const startDate = new Date('2025-11-10T00:00:00.000Z');
    const endDate = new Date('2025-11-10T23:59:59.999Z');

    console.log(`\nFetching feedback from ${startDate.toLocaleDateString()} to ${endDate.toLocaleDateString()}...\n`);

    // Query feedback from yesterday
    const feedbackList = await prisma.feedback.findMany({
      where: {
        createdAt: {
          gte: startDate,
          lte: endDate,
        },
      },
      select: {
        id: true,
        name: true,
        email: true,
        npsScore: true,
        wantsInterview: true,
        source: true,
        purpose: true,
        featuresUsed: true,
        improvement: true,
        createdAt: true,
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    if (feedbackList.length === 0) {
      console.log('No feedback found for 11/10/2025.');
      return;
    }

    console.log(`Found ${feedbackList.length} feedback submission(s) from 11/10/2025:\n`);
    console.log('='.repeat(80));

    feedbackList.forEach((feedback, index) => {
      console.log(`\n${index + 1}. Feedback ID: ${feedback.id}`);
      console.log(`   Name: ${feedback.name || 'Not provided'}`);
      console.log(`   Email: ${feedback.email}`);
      console.log(`   NPS Rating: ${feedback.npsScore}/10`);
      console.log(`   Wants 15-min Meeting: ${feedback.wantsInterview ? 'YES ✓' : 'No'}`);
      console.log(`   Source: ${feedback.source}`);
      console.log(`   Purpose: ${feedback.purpose.join(', ')}`);
      console.log(`   Features Used: ${feedback.featuresUsed.join(', ')}`);
      console.log(`   Improvement Suggestions: ${feedback.improvement}`);
      console.log(`   Submitted At: ${feedback.createdAt.toLocaleString()}`);
      console.log('   ' + '-'.repeat(76));
    });

    console.log('\n' + '='.repeat(80));
    console.log('\nSummary:');
    console.log(`- Total feedback: ${feedbackList.length}`);
    console.log(`- Want interview: ${feedbackList.filter(f => f.wantsInterview).length}`);
    console.log(`- Average NPS: ${(feedbackList.reduce((sum, f) => sum + f.npsScore, 0) / feedbackList.length).toFixed(1)}/10`);

    const wantsInterviewList = feedbackList.filter(f => f.wantsInterview);
    if (wantsInterviewList.length > 0) {
      console.log('\n📞 Users who want a 15-minute meeting:');
      wantsInterviewList.forEach((f, i) => {
        console.log(`   ${i + 1}. ${f.name || 'No name'} (${f.email}) - Rating: ${f.npsScore}/10`);
      });
    }

  } catch (error) {
    console.error('Error fetching feedback:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// Run the script
getFeedbackFromYesterday()
  .then(() => {
    console.log('\n✓ Script completed successfully\n');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n✗ Script failed:', error);
    process.exit(1);
  });
