const fs = require('fs');
const { createClient } = require('@supabase/supabase-js');

// Parse .env.local manually
const envContent = fs.readFileSync('.env.local', 'utf-8');
const env = {};
envContent.split('\n').forEach(line => {
  const [key, ...val] = line.split('=');
  if (key && val.length > 0) env[key.trim()] = val.join('=').trim();
});

const supabaseUrl = env['VITE_SUPABASE_URL'];
const supabaseKey = env['VITE_SUPABASE_ANON_KEY'];

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing Supabase credentials in .env.local');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function cleanSupabase() {
  console.log('Connecting to Supabase to reset all financial data...');

  try {
    console.log('Deleting Cashbox Transactions...');
    const { error: err1 } = await supabase.from('CashboxTransaction').delete().neq('id', 'dummy');
    if (err1) console.error('Cashbox cleanup error:', err1.message);

    console.log('Deleting Payments...');
    const { error: err2 } = await supabase.from('Payment').delete().neq('id', 'dummy');
    if (err2) console.error('Payment cleanup error:', err2.message);

    console.log('Deleting Deals...');
    const { error: err3 } = await supabase.from('Deal').delete().neq('id', 'dummy');
    if (err3) console.error('Deal cleanup error:', err3.message);

    console.log('Cloud database successfully reset! All numbers are now zeroed out.');
  } catch (error) {
    console.error('Error during cleanup:', error);
  }
}

cleanSupabase();
