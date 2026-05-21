const { PrismaClient } = require('@prisma/client');
const path = require('path');
const os = require('os');
const fs = require('fs');

let userDataDir;
const home = os.homedir();
if (process.platform === 'win32') {
  userDataDir = path.join(process.env.APPDATA || path.join(home, 'AppData', 'Roaming'), 'Trust-Network ERP');
} else if (process.platform === 'darwin') {
  userDataDir = path.join(home, 'Library', 'Application Support', 'Trust-Network ERP');
} else {
  userDataDir = path.join(process.env.XDG_CONFIG_HOME || path.join(home, '.config'), 'Trust-Network ERP');
}

const dbPath = path.join(userDataDir, 'database.sqlite');
console.log('Database path:', dbPath);

if (!fs.existsSync(dbPath)) {
  console.log('User database file does not exist at this path.');
  process.exit(1);
}

const prisma = new PrismaClient({
  datasources: {
    db: {
      url: `file:${dbPath}`
    }
  }
});

async function main() {
  const dealsCount = await prisma.deal.count();
  const paymentsCount = await prisma.payment.count();
  const paidPaymentsCount = await prisma.payment.count({ where: { status: 'paid' } });
  const txCount = await prisma.cashboxTransaction.count();

  console.log(`Deals: ${dealsCount}`);
  console.log(`Payments: ${paymentsCount} (Paid: ${paidPaymentsCount})`);
  console.log(`Cashbox Transactions: ${txCount}`);

  console.log('\n--- Recent Cashbox Transactions ---');
  const recentTxs = await prisma.cashboxTransaction.findMany({
    orderBy: { createdAt: 'desc' },
    take: 10
  });
  console.log(JSON.stringify(recentTxs, null, 2));

  console.log('\n--- Recent Deals ---');
  const recentDeals = await prisma.deal.findMany({
    orderBy: { createdAt: 'desc' },
    take: 5
  });
  console.log(JSON.stringify(recentDeals.map(d => ({ id: d.id, client: d.client, totalAmount: d.totalAmount, paidMonths: d.paidMonths })), null, 2));
}

main()
  .catch(e => console.error(e))
  .finally(() => prisma.$disconnect());
