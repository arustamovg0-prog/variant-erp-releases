const { execSync } = require('child_process');
const path = require('path');
const fs = require('fs');
const os = require('os');

console.log('Running schema push on template database...');
execSync('npx prisma db push', { stdio: 'inherit' });

// Determine userData path
let userDataDir;
const home = os.homedir();
if (process.platform === 'win32') {
  userDataDir = path.join(process.env.APPDATA || path.join(home, 'AppData', 'Roaming'), 'Trust-Network ERP');
} else if (process.platform === 'darwin') {
  userDataDir = path.join(home, 'Library', 'Application Support', 'Trust-Network ERP');
} else {
  userDataDir = path.join(process.env.XDG_CONFIG_HOME || path.join(home, '.config'), 'Trust-Network ERP');
}

const dbPaths = [
  path.join(userDataDir, 'database.sqlite'),
  path.join(userDataDir.replace('Trust-Network ERP', 'variant-epr'), 'database.sqlite')
];

let foundDb = false;

for (const dbPath of dbPaths) {
  if (fs.existsSync(dbPath)) {
    foundDb = true;
    console.log(`Detected local user database at: ${dbPath}`);
    console.log('Running schema push on user database...');
    try {
      execSync(`npx prisma db push`, {
        stdio: 'inherit',
        env: {
          ...process.env,
          DATABASE_URL: `file:${dbPath}`
        }
      });
      console.log(`Database at ${dbPath} successfully synchronized!`);
    } catch (error) {
      console.error(`Failed to sync database at ${dbPath}:`, error.message);
    }
  }
}

if (!foundDb) {
  console.log('No user database found in appData directories. It will be initialized on first run.');
}
