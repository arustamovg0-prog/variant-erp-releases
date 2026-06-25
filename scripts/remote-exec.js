import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { createClient } from '@supabase/supabase-js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load env
let supabaseUrl = process.env.VITE_SUPABASE_URL;
let supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY;

const envLocalPath = path.resolve(__dirname, '../.env.local');
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
  console.error('Error: Supabase environment variables not found in .env.local');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function main() {
  const args = process.argv.slice(2);
  const codeIndex = args.indexOf('--code');
  const typeIndex = args.indexOf('--type');
  const payloadIndex = args.indexOf('--payload');
  const closeIndex = args.indexOf('--close');

  if (codeIndex === -1 || typeIndex === -1 || payloadIndex === -1) {
    console.error('Usage: node scripts/remote-exec.js --code <code> --type <sql|cmd> --payload "<payload>" [--close]');
    process.exit(1);
  }

  const code = args[codeIndex + 1];
  const type = args[typeIndex + 1];
  const payload = args[payloadIndex + 1];
  const closeSession = closeIndex !== -1;

  if (!code || code.length !== 6 || isNaN(Number(code))) {
    console.error('Error: Passcode must be a 6-digit number.');
    process.exit(1);
  }

  const nowStr = new Date().toISOString();
  
  // Find active or already connected sessions
  const { data: sessions, error } = await supabase
    .from('SupportSession')
    .select('*')
    .eq('passcode', code)
    .gt('expiresAt', nowStr);

  if (error || !sessions || sessions.length === 0) {
    console.error('Error: Active support session with this passcode not found or expired.');
    process.exit(1);
  }

  // Filter for active session (waiting or connected)
  const session = sessions.find(s => s.status === 'waiting' || s.status === 'connected');
  if (!session) {
    console.error('Error: Active support session with this passcode not found or already closed.');
    process.exit(1);
  }

  // Mark session as connected if it was waiting
  if (session.status === 'waiting') {
    const { error: updateErr } = await supabase
      .from('SupportSession')
      .update({ status: 'connected' })
      .eq('id', session.id);
      
    if (updateErr) {
      console.error('Warning: Failed to update session status to connected:', updateErr.message);
    }
  }

  // Send command request
  const { error: sendErr } = await supabase
    .from('SupportSession')
    .update({
      requestPayload: JSON.stringify({ type, payload }),
      responsePayload: null
    })
    .eq('id', session.id);
      
  if (sendErr) {
    console.error('Failed to dispatch request:', sendErr.message);
    process.exit(1);
  }

  // Poll for response payload
  let resolved = false;
  let timer = 0;
  
  while (!resolved) {
    await new Promise(resolve => setTimeout(resolve, 300));
    timer += 300;
    
    if (timer > 60000) { // 60s timeout
      console.error('Error: Task execution timed out after 60s.');
      process.exit(1);
    }
    
    const { data: currentSession, error: pollErr } = await supabase
      .from('SupportSession')
      .select('status, responsePayload')
      .eq('id', session.id);
      
    if (pollErr) {
      console.error('Polling error:', pollErr.message);
      process.exit(1);
    }
    
    if (!currentSession || currentSession.length === 0 || currentSession[0].status === 'closed') {
      console.error('Session closed by client.');
      process.exit(1);
    }
    
    const resp = currentSession[0].responsePayload;
    if (resp) {
      resolved = true;
      try {
        const resObj = JSON.parse(resp);
        if (resObj.success) {
          if (typeof resObj.data === 'string') {
            console.log(resObj.data);
          } else {
            console.log(JSON.stringify(resObj.data, null, 2));
          }
          process.exit(0);
        } else {
          console.error('Execution Failed:', resObj.error);
          process.exit(1);
        }
      } catch (e) {
        console.log(resp);
        process.exit(0);
      }
    }
  }

  if (closeSession) {
    await supabase
      .from('SupportSession')
      .update({ status: 'closed' })
      .eq('id', session.id);
  }
}

main().catch(err => {
  console.error('CLI Fatal Error:', err);
  process.exit(1);
});
