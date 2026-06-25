import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import readline from 'readline';
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

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

function ask(query) {
  return new Promise(resolve => rl.question(query, resolve));
}

async function main() {
  console.log('\x1b[36m==================================================\x1b[0m');
  console.log('\x1b[36m   Trust-Network ERP Remote Support CLI Client    \x1b[0m');
  console.log('\x1b[36m==================================================\x1b[0m');
  
  const code = (await ask('Enter the 6-digit client support passcode: ')).trim();
  
  if (!code || code.length !== 6 || isNaN(Number(code))) {
    console.error('\x1b[31mError: Passcode must be a 6-digit number.\x1b[0m');
    rl.close();
    return;
  }
  
  console.log(`Connecting to Supabase and searching for session with passcode: ${code}...`);
  
  const nowStr = new Date().toISOString();
  const { data: sessions, error } = await supabase
    .from('SupportSession')
    .select('*')
    .eq('passcode', code)
    .eq('status', 'waiting')
    .gt('expiresAt', nowStr);
    
  if (error) {
    console.error('\x1b[31mDatabase query error:\x1b[0m', error.message);
    rl.close();
    return;
  }
  
  if (!sessions || sessions.length === 0) {
    console.error('\x1b[31mError: Active support session with this passcode not found or expired.\x1b[0m');
    rl.close();
    return;
  }
  
  const session = sessions[0];
  console.log(`\x1b[32mSuccess!\x1b[0m Session ID: ${session.id}`);
  console.log(`Admin Client ID: ${session.adminId}`);
  
  // Mark session as connected
  await supabase
    .from('SupportSession')
    .update({ status: 'connected' })
    .eq('id', session.id);
    
  console.log('\x1b[32mConnected successfully!\x1b[0m');
  console.log('Instructions:');
  console.log(' - Type standard SQL queries directly (e.g. \x1b[33mSELECT * FROM "Agent";\x1b[0m)');
  console.log(' - Prefix with \x1b[33mcmd:\x1b[0m to execute system commands (e.g. \x1b[33mcmd:npm run lint\x1b[0m)');
  console.log(' - Type \x1b[35mexit\x1b[0m or hit Ctrl+C to close session and exit.');
  console.log('--------------------------------------------------');

  const cleanup = async () => {
    console.log('\nClosing support session...');
    try {
      await supabase
        .from('SupportSession')
        .update({ status: 'closed' })
        .eq('id', session.id);
    } catch (e) {
      // Ignored
    }
    rl.close();
    console.log('Disconnected. Bye!');
    process.exit(0);
  };

  process.on('SIGINT', cleanup);

  while (true) {
    const input = (await ask('\x1b[34msupport>\x1b[0m ')).trim();
    if (!input) continue;
    if (input.toLowerCase() === 'exit') {
      await cleanup();
      break;
    }
    
    let type = 'sql';
    let payload = input;
    
    if (input.startsWith('cmd:')) {
      type = 'cmd';
      payload = input.substring(4).trim();
    }
    
    // Post payload to session row
    const { error: sendErr } = await supabase
      .from('SupportSession')
      .update({
        requestPayload: JSON.stringify({ type, payload }),
        responsePayload: null
      })
      .eq('id', session.id);
      
    if (sendErr) {
      console.error('\x1b[31mFailed to dispatch request:\x1b[0m', sendErr.message);
      continue;
    }
    
    // Poll for response payload
    process.stdout.write('Executing remote task...');
    let resolved = false;
    let timer = 0;
    
    while (!resolved) {
      await new Promise(resolve => setTimeout(resolve, 300));
      timer += 300;
      
      if (timer > 60000) { // 60s timeout
        console.log('\n\x1b[31mError: Task execution timed out after 60s.\x1b[0m');
        break;
      }
      
      const { data: currentSession, error: pollErr } = await supabase
        .from('SupportSession')
        .select('status, responsePayload')
        .eq('id', session.id);
        
      if (pollErr) {
        console.error('\n\x1b[31mPolling error:\x1b[0m', pollErr.message);
        break;
      }
      
      if (!currentSession || currentSession.length === 0 || currentSession[0].status === 'closed') {
        console.log('\n\x1b[31mSession closed by client.\x1b[0m');
        rl.close();
        process.exit(0);
      }
      
      const resp = currentSession[0].responsePayload;
      if (resp) {
        resolved = true;
        console.log('\n');
        try {
          const resObj = JSON.parse(resp);
          if (resObj.success) {
            if (typeof resObj.data === 'string') {
              console.log(resObj.data);
            } else if (Array.isArray(resObj.data)) {
              if (resObj.data.length > 0) {
                console.table(resObj.data);
              } else {
                console.log('No rows returned.');
              }
            } else {
              console.log(JSON.stringify(resObj.data, null, 2));
            }
          } else {
            console.error('\x1b[31mExecution Failed:\x1b[0m', resObj.error);
          }
        } catch (e) {
          console.log('Raw output:', resp);
        }
      } else {
        process.stdout.write('.');
      }
    }
  }
}

main().catch(err => {
  console.error('CLI Fatal Error:', err);
  rl.close();
});
