const { PrismaClient } = require('@prisma/client');

async function fixUsageTrackingView() {
  const prisma = new PrismaClient();
  
  console.log('🔧 Fixing usage_tracking view...\n');
  
  try {
    // Drop and recreate the view with all necessary columns
    await prisma.$executeRawUnsafe(`DROP VIEW IF EXISTS usage_tracking`);
    
    // Create a more complete view that matches what the app expects
    await prisma.$executeRawUnsafe(`
      CREATE VIEW usage_tracking AS
      SELECT 
        u.id,
        u."userId",
        COALESCE(u.date, CURRENT_DATE - INTERVAL '30 days')::timestamp as "lastResetDate",
        COALESCE(u.queries, 0) as "bookAnalysesCount",
        COALESCE(u.tokens, 0) as "queriesCount",
        COALESCE(u.cost, 0)::numeric as "totalCost",
        COALESCE(u.date, CURRENT_DATE)::timestamp as "createdAt",
        COALESCE(u.date, CURRENT_DATE)::timestamp as "updatedAt"
      FROM usage u
      WHERE u."userId" IS NOT NULL
    `);
    
    console.log('✅ Created improved usage_tracking view');
    
    // Grant all permissions
    await prisma.$executeRawUnsafe(`GRANT ALL ON usage_tracking TO postgres, anon, authenticated, service_role`);
    console.log('✅ Granted permissions on view');
    
    // Test the view
    const testResult = await prisma.$queryRawUnsafe(`
      SELECT * FROM usage_tracking 
      WHERE "userId" = '750ecd93-5bc3-44bb-bc49-b03e165e386a'
      LIMIT 1
    `);
    
    console.log('\n✅ View test successful:', testResult.length > 0 ? 'Found records' : 'No records yet');
    
    // Also ensure the subscription exists and is properly set up
    const subscription = await prisma.subscription.findUnique({
      where: { userId: '750ecd93-5bc3-44bb-bc49-b03e165e386a' }
    });
    
    if (!subscription) {
      console.log('\n⚠️  No subscription found, creating one...');
      await prisma.subscription.create({
        data: {
          userId: '750ecd93-5bc3-44bb-bc49-b03e165e386a',
          tier: 'free',
          status: 'active'
        }
      });
      console.log('✅ Created subscription');
    } else {
      console.log('\n✅ Subscription exists:', subscription.tier, subscription.status);
    }
    
    console.log('\n✨ Usage tracking view fixed! AI features should now work.');
    
  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

fixUsageTrackingView();