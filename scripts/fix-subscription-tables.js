const { PrismaClient } = require('@prisma/client');

async function setupSubscriptionData() {
  const prisma = new PrismaClient();
  
  console.log('🔧 Setting up subscription data...\n');
  
  try {
    // First, let's check if we have the user
    const userId = '750ecd93-5bc3-44bb-bc49-b03e165e386a';
    
    // Check if user exists
    let user = await prisma.user.findUnique({
      where: { id: userId }
    });
    
    if (!user) {
      console.log('Creating user...');
      user = await prisma.user.create({
        data: {
          id: userId,
          email: 'test@example.com', // You can update this later
          name: 'Test User'
        }
      });
      console.log('✅ User created');
    } else {
      console.log('✅ User already exists');
    }
    
    // Check if subscription exists
    const existingSubscription = await prisma.subscription.findUnique({
      where: { userId: userId }
    });
    
    if (!existingSubscription) {
      console.log('Creating subscription...');
      await prisma.subscription.create({
        data: {
          userId: userId,
          tier: 'free',
          status: 'active'
        }
      });
      console.log('✅ Subscription created');
    } else {
      console.log('✅ Subscription already exists');
    }
    
    // Check if usage record exists
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const existingUsage = await prisma.usage.findFirst({
      where: {
        userId: userId,
        date: today
      }
    });
    
    if (!existingUsage) {
      console.log('Creating usage record...');
      await prisma.usage.create({
        data: {
          userId: userId,
          date: today,
          queries: 0,
          tokens: 0,
          cost: 0
        }
      });
      console.log('✅ Usage record created');
    } else {
      console.log('✅ Usage record already exists');
    }
    
    // Create view or alias for usage_tracking if needed
    console.log('\n🔧 Creating compatibility view for usage_tracking...');
    try {
      // Drop existing view if it exists
      await prisma.$executeRawUnsafe(`DROP VIEW IF EXISTS usage_tracking`);
      
      // Create view that maps usage table to expected usage_tracking structure
      await prisma.$executeRawUnsafe(`
        CREATE VIEW usage_tracking AS
        SELECT 
          id,
          "userId",
          date::timestamp as "lastResetDate",
          queries as "bookAnalysesCount",
          tokens as "queriesCount",
          cost as "totalCost",
          date as "createdAt",
          date as "updatedAt"
        FROM usage
      `);
      console.log('✅ Created usage_tracking view');
    } catch (error) {
      console.log('⚠️  Could not create view:', error.message);
    }
    
    console.log('\n✨ Setup complete! Your subscription system should now work.');
    
  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

setupSubscriptionData();