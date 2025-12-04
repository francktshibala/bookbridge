/**
 * Test script to verify Resend signup email API
 * Run: node scripts/test-signup-email.js
 */

const email = 'francoismatenda022@gmail.com';
const name = 'Francois Test';

async function testSignupEmail() {
  console.log('🧪 Testing signup email API...');
  console.log(`📧 Email: ${email}`);
  console.log(`👤 Name: ${name}`);
  console.log('');

  try {
    // Call the API endpoint
    const response = await fetch('http://localhost:3000/api/auth/send-confirmation', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ email, name }),
    });

    const result = await response.json();
    
    console.log(`📊 Status: ${response.status} ${response.statusText}`);
    console.log('📦 Response:', JSON.stringify(result, null, 2));
    
    if (response.ok) {
      console.log('');
      console.log('✅ SUCCESS! Email should appear in Resend dashboard');
      console.log('🔍 Check: https://resend.com/emails');
    } else {
      console.log('');
      console.log('❌ FAILED! Check error above');
    }
  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error('Stack:', error.stack);
  }
}

testSignupEmail();

