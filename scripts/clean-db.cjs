const { PrismaClient } = require('@prisma/client');
const path = require('path');
const os = require('os');
const fs = require('fs');

async function cleanDatabase() {
  console.log('Starting database cleanup...');
  
  // Try to determine the correct db path like electron/main.cjs does
  let userDataDir;
  const home = os.homedir();
  if (process.platform === 'win32') {
    userDataDir = path.join(process.env.APPDATA, 'variant-epr');
  } else if (process.platform === 'darwin') {
    userDataDir = path.join(home, 'Library/Application Support/variant-epr');
  } else {
    userDataDir = path.join(home, '.config/variant-epr');
  }
  
  // Check if we should use Trust-Network ERP directory instead
  const alternativeDir = path.join(home, 'Library/Application Support/Trust-Network ERP');
  if (fs.existsSync(alternativeDir) && process.platform === 'darwin') {
     userDataDir = alternativeDir;
  }

  const dbPath = path.join(userDataDir, 'database.sqlite');
  
  if (!fs.existsSync(dbPath)) {
    console.log(`Could not find database at ${dbPath}. Attempting to clean local dev.db instead.`);
    process.env.DATABASE_URL = 'file:../prisma/dev.db';
  } else {
    console.log(`Connecting to active database at: ${dbPath}`);
    process.env.DATABASE_URL = `file:${dbPath}`;
  }

  const prisma = new PrismaClient();
  
  try {
    const cashboxDeleted = await prisma.cashboxTransaction.deleteMany({});
    console.log(`Deleted ${cashboxDeleted.count} cashbox transactions.`);

    const paymentsDeleted = await prisma.payment.deleteMany({});
    console.log(`Deleted ${paymentsDeleted.count} payments.`);

    const dealsDeleted = await prisma.deal.deleteMany({});
    console.log(`Deleted ${dealsDeleted.count} deals.`);

    console.log('Database successfully cleaned! The platform is now ready for real use.');
  } catch (error) {
    console.error('Error cleaning database:', error);
  } finally {
    await prisma.$disconnect();
  }
}

cleanDatabase();
