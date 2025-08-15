// Test database connection
const { PrismaClient } = require('@prisma/client');

async function testConnection() {
  console.log('Testing database connection...');
  console.log('DATABASE_URL:', process.env.DATABASE_URL?.replace(/:[^@]+@/, ':****@'));
  
  const prisma = new PrismaClient();
  
  try {
    await prisma.$connect();
    console.log('✅ Successfully connected to database!');
    
    // Try to query the database
    const result = await prisma.$queryRaw`SELECT NOW()`;
    console.log('✅ Database query successful:', result);
    
  } catch (error) {
    console.error('❌ Database connection failed:');
    console.error('Error code:', error.code);
    console.error('Error message:', error.message);
    
    if (error.code === 'P1001') {
      console.log('\n💡 Troubleshooting tips:');
      console.log('1. Check if your Supabase project is paused (free tier pauses after 1 week of inactivity)');
      console.log('2. Try using the Pooler connection string instead of Direct connection');
      console.log('3. Make sure your password is correct');
      console.log('4. Check if you need to allowlist your IP address');
    }
  } finally {
    await prisma.$disconnect();
  }
}

testConnection();