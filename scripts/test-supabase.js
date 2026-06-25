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

console.log('Supabase URL:', supabaseUrl);

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('Credentials not found.');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function check() {
  console.log('Fetching SupportSession...');
  const { data: supportSessionData, error: supportSessionErr } = await supabase
    .from('SupportSession')
    .select('*')
    .limit(1);
  
  if (supportSessionErr) {
    console.error('SupportSession query error:', supportSessionErr);
  } else {
    console.log('SupportSession query success:', supportSessionData);
  }

  console.log('Fetching Agent...');
  const { data: agentData, error: agentErr } = await supabase
    .from('Agent')
    .select('*')
    .limit(1);
    
  if (agentErr) {
    console.error('Agent query error:', agentErr);
  } else {
    console.log('Agent query success:', agentData);
  }
}

check().catch(console.error);
