const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function findFeedbackUsers() {
  try {
    console.log('🔍 Searching for feedback from DANIEL, KELLEY, and DMITRII...\n');

    // Search for DANIEL - 9/10 rating, feedback about bold words/definitions
    const danielFeedback = await prisma.feedback.findMany({
      where: {
        OR: [
          {
            name: {
              contains: 'daniel',
              mode: 'insensitive'
            }
          },
          {
            improvement: {
              contains: 'bold words',
              mode: 'insensitive'
            }
          },
          {
            improvement: {
              contains: 'pop-up',
              mode: 'insensitive'
            }
          },
          {
            improvement: {
              contains: 'definitions',
              mode: 'insensitive'
            }
          }
        ],
        npsScore: 9
      },
      orderBy: {
        createdAt: 'desc'
      }
    });

    // Search for KELLEY - feedback "Add more books!"
    const kelleyFeedback = await prisma.feedback.findMany({
      where: {
        OR: [
          {
            name: {
              contains: 'kelley',
              mode: 'insensitive'
            }
          },
          {
            improvement: {
              contains: 'more books',
              mode: 'insensitive'
            }
          },
          {
            improvement: {
              contains: 'add more',
              mode: 'insensitive'
            }
          }
        ]
      },
      orderBy: {
        createdAt: 'desc'
      }
    });

    // Search for DMITRII - feedback "Pronunciation"
    const dmitriiFeedback = await prisma.feedback.findMany({
      where: {
        OR: [
          {
            name: {
              contains: 'dmitrii',
              mode: 'insensitive'
            }
          },
          {
            improvement: {
              contains: 'pronunciation',
              mode: 'insensitive'
            }
          }
        ]
      },
      orderBy: {
        createdAt: 'desc'
      }
    });

    // Display results
    console.log('═══════════════════════════════════════════════════════');
    console.log('📋 FEEDBACK RESULTS');
    console.log('═══════════════════════════════════════════════════════\n');

    if (danielFeedback.length > 0) {
      console.log('👤 DANIEL:');
      danielFeedback.forEach((fb, idx) => {
        console.log(`\n  Entry ${idx + 1}:`);
        console.log(`  📧 Email: ${fb.email}`);
        console.log(`  👤 Name: ${fb.name || 'Not provided'}`);
        console.log(`  ⭐ Rating: ${fb.npsScore}/10`);
        console.log(`  💬 Feedback: ${fb.improvement}`);
        console.log(`  📅 Date: ${fb.createdAt.toISOString().split('T')[0]}`);
        console.log(`  🔗 User ID: ${fb.userId || 'Not linked to user account'}`);
      });
      console.log('\n');
    } else {
      console.log('❌ DANIEL: No matching feedback found\n');
    }

    if (kelleyFeedback.length > 0) {
      console.log('👤 KELLEY:');
      kelleyFeedback.forEach((fb, idx) => {
        console.log(`\n  Entry ${idx + 1}:`);
        console.log(`  📧 Email: ${fb.email}`);
        console.log(`  👤 Name: ${fb.name || 'Not provided'}`);
        console.log(`  ⭐ Rating: ${fb.npsScore || 'Not provided'}/10`);
        console.log(`  💬 Feedback: ${fb.improvement}`);
        console.log(`  📅 Date: ${fb.createdAt.toISOString().split('T')[0]}`);
        console.log(`  🔗 User ID: ${fb.userId || 'Not linked to user account'}`);
      });
      console.log('\n');
    } else {
      console.log('❌ KELLEY: No matching feedback found\n');
    }

    if (dmitriiFeedback.length > 0) {
      console.log('👤 DMITRII:');
      dmitriiFeedback.forEach((fb, idx) => {
        console.log(`\n  Entry ${idx + 1}:`);
        console.log(`  📧 Email: ${fb.email}`);
        console.log(`  👤 Name: ${fb.name || 'Not provided'}`);
        console.log(`  ⭐ Rating: ${fb.npsScore || 'Not provided'}/10`);
        console.log(`  💬 Feedback: ${fb.improvement}`);
        console.log(`  📅 Date: ${fb.createdAt.toISOString().split('T')[0]}`);
        console.log(`  🔗 User ID: ${fb.userId || 'Not linked to user account'}`);
      });
      console.log('\n');
    } else {
      console.log('❌ DMITRII: No matching feedback found\n');
    }

    // Summary table
    console.log('═══════════════════════════════════════════════════════');
    console.log('📊 SUMMARY');
    console.log('═══════════════════════════════════════════════════════\n');
    
    const allFeedback = [
      ...danielFeedback.map(f => ({ ...f, searchName: 'DANIEL' })),
      ...kelleyFeedback.map(f => ({ ...f, searchName: 'KELLEY' })),
      ...dmitriiFeedback.map(f => ({ ...f, searchName: 'DMITRII' }))
    ];

    if (allFeedback.length === 0) {
      console.log('⚠️  No feedback entries found matching the search criteria.');
      console.log('\n💡 Trying broader search...\n');
      
      // Broader search - get all recent feedback
      const allRecentFeedback = await prisma.feedback.findMany({
        take: 50,
        orderBy: {
          createdAt: 'desc'
        },
        select: {
          name: true,
          email: true,
          npsScore: true,
          improvement: true,
          createdAt: true
        }
      });

      console.log('📋 Recent feedback entries (last 50):\n');
      allRecentFeedback.forEach((fb, idx) => {
        console.log(`${idx + 1}. ${fb.name || 'Anonymous'} (${fb.email})`);
        console.log(`   Rating: ${fb.npsScore || 'N/A'}/10`);
        console.log(`   Feedback: ${fb.improvement.substring(0, 100)}${fb.improvement.length > 100 ? '...' : ''}`);
        console.log(`   Date: ${fb.createdAt.toISOString().split('T')[0]}\n`);
      });
    } else {
      allFeedback.forEach(fb => {
        console.log(`✅ ${fb.searchName}: ${fb.email} (Rating: ${fb.npsScore || 'N/A'}/10)`);
      });
    }

  } catch (error) {
    console.error('❌ Error querying database:', error);
  } finally {
    await prisma.$disconnect();
  }
}

findFeedbackUsers();

