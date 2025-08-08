const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function listUsers() {
  const { data: users } = await supabase.from('users').select('id, email');
  const { data: subs } = await supabase.from('subscriptions').select('userId, tier, status');
  
  console.log('👥 All Users:');
  users?.forEach(u => console.log(`  ${u.id} - ${u.email}`));
  
  console.log('\n💳 All Subscriptions:');
  subs?.forEach(s => console.log(`  ${s.userId} - ${s.tier} (${s.status})`));
}

listUsers();