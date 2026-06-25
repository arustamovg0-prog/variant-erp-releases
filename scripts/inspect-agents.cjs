const { PrismaClient } = require('@prisma/client');
const path = require('path');
const os = require('os');
const fs = require('fs');

let userDataDir;
const home = os.homedir();
if (process.platform === 'win32') {
  userDataDir = path.join(process.env.APPDATA || path.join(home, 'AppData', 'Roaming'), 'variant-epr');
} else if (process.platform === 'darwin') {
  userDataDir = path.join(home, 'Library', 'Application Support', 'variant-epr');
} else {
  userDataDir = path.join(process.env.XDG_CONFIG_HOME || path.join(home, '.config'), 'variant-epr');
}

const dbPath = path.join(userDataDir, 'database.sqlite');
console.log('Database path:', dbPath);

if (!fs.existsSync(dbPath)) {
  console.log('User database file does not exist at this path. Checking Trust-Network ERP directory...');
  const alternateDir = userDataDir.replace('variant-epr', 'Trust-Network ERP');
  const alternateDbPath = path.join(alternateDir, 'database.sqlite');
  if (fs.existsSync(alternateDbPath)) {
    console.log('Found database at alternate path:', alternateDbPath);
    runWithDb(alternateDbPath);
  } else {
    console.log('No database file found.');
    process.exit(1);
  }
} else {
  runWithDb(dbPath);
}

function runWithDb(path) {
  const prisma = new PrismaClient({
    datasources: {
      db: {
        url: `file:${path}`
      }
    }
  });

  async function main() {
    const agents = await prisma.agent.findMany();
    console.log('\n--- Local Agents ---');
    agents.forEach(agent => {
      console.log(`Name: ${agent.name}`);
      console.log(`Email: ${agent.email}`);
      console.log(`Password: ${agent.password}`);
      console.log(`Role: ${agent.role}`);
      console.log('--------------------');
    });
  }

  main()
    .catch(e => console.error(e))
    .finally(() => prisma.$disconnect());
}
