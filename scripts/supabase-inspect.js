import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { createClient } from '@supabase/supabase-js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const envLocalPath = path.resolve(__dirname, '../.env.local');
let supabaseUrl = '';
let supabaseAnonKey = '';

if (fs.existsSync(envLocalPath)) {
  const content = fs.readFileSync(envLocalPath, 'utf8');
  content.split('\n').forEach(line => {
    const parts = line.split('=');
    if (parts.length >= 2) {
      const key = parts[0].trim();
      const val = parts.slice(1).join('=').trim();
      if (key === 'VITE_SUPABASE_URL') supabaseUrl = val;
      if (key === 'VITE_SUPABASE_ANON_KEY') supabaseAnonKey = val;
    }
  });
}

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('Credentials not found.');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function inspect() {
  console.log('Inspecting tables in public schema...');
  // Postgrest allows calling rpc or querying schema if exposed.
  // Since we can run raw query via sql editor, let's see if we can do rpc or query some system views.
  // If no custom RPC is exposed, we can try to query a non-existent table or inspect the error message.
  // Or we can just query some common tables to see what fails and what succeeds.
  
  const tablesToCheck = [
    'Agent', 'agents', 'Deal', 'deals', 'Payment', 'payments', 
    'CashboxTransaction', 'cashbox_transactions', 'Setting', 'settings', 
    'SupportSession', 'support_sessions'
  ];

  for (const table of tablesToCheck) {
    const { error } = await supabase.from(table).select('*').limit(0);
    if (error) {
      console.log(`Table "${table}": NOT FOUND/ERROR (${error.code}) - ${error.message}`);
    } else {
      console.log(`Table "${table}": EXISTS`);
    }
  }
}

inspect().catch(console.error);
