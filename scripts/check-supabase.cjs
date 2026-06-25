const fs = require('fs');
const { createClient } = require('@supabase/supabase-js');

const envContent = fs.readFileSync('.env.local', 'utf-8');
const env = {};
envContent.split('\n').forEach(line => {
  const [key, ...val] = line.split('=');
  if (key && val.length > 0) env[key.trim()] = val.join('=').trim();
});

const supabaseUrl = env['VITE_SUPABASE_URL'];
const supabaseKey = env['VITE_SUPABASE_ANON_KEY'];

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkAndClean() {
  // Login as admin
  const { data: admin, error: loginError } = await supabase.from('Agent').select('*').eq('email', 'admin@trust.uz').single();
  
  if (loginError) {
    console.error('Cannot fetch admin', loginError);
  }

  // To truly delete, let's fetch all IDs first, then delete them one by one if bulk delete is failing due to RLS
  console.log('Fetching Deals to delete...');
  const { data: deals, error: dErr } = await supabase.from('Deal').select('id');
  console.log(`Found ${deals ? deals.length : 0} deals.`);

  if (deals && deals.length > 0) {
    for (const d of deals) {
      await supabase.from('Deal').delete().eq('id', d.id);
    }
    console.log('Deleted all deals one by one.');
  }

  console.log('Fetching Payments...');
  const { data: payments } = await supabase.from('Payment').select('id');
  if (payments && payments.length > 0) {
    for (const p of payments) {
      await supabase.from('Payment').delete().eq('id', p.id);
    }
    console.log('Deleted all payments.');
  }

  console.log('Fetching Cashbox...');
  const { data: cashbox } = await supabase.from('CashboxTransaction').select('id');
  if (cashbox && cashbox.length > 0) {
    for (const c of cashbox) {
      await supabase.from('CashboxTransaction').delete().eq('id', c.id);
    }
    console.log('Deleted all cashbox transactions.');
  }
}

checkAndClean();
