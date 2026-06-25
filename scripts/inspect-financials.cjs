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
  console.log('No database file found.');
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
  // 1. Total paid payments
  const payments = await prisma.payment.findMany({
    where: { status: 'paid' }
  });
  const totalPaidPayments = payments.reduce((sum, p) => sum + p.amount, 0);
  console.log(`\n--- Payments Analysis ---`);
  console.log(`Total Paid Payments: $${totalPaidPayments}`);
  console.log(`Count of Paid Payments: ${payments.length}`);

  // 2. Cashbox transactions breakdown
  const txs = await prisma.cashboxTransaction.findMany();
  let totalInflow = 0;
  let totalOutflow = 0;
  const categoriesInflow = {};
  const categoriesOutflow = {};

  txs.forEach(t => {
    if (t.type === 'income') {
      totalInflow += t.amount;
      categoriesInflow[t.category] = (categoriesInflow[t.category] || 0) + t.amount;
    } else {
      totalOutflow += t.amount;
      categoriesOutflow[t.category] = (categoriesOutflow[t.category] || 0) + t.amount;
    }
  });

  console.log(`\n--- Cashbox Transactions Analysis ---`);
  console.log(`Total Inflow: $${totalInflow}`);
  console.log(`Total Outflow: $${totalOutflow}`);
  console.log(`Net Cashbox Balance: $${totalInflow - totalOutflow}`);
  
  console.log(`\nInflow by Category:`);
  console.log(JSON.stringify(categoriesInflow, null, 2));

  console.log(`\nOutflow by Category:`);
  console.log(JSON.stringify(categoriesOutflow, null, 2));

  // 3. Difference analysis
  // Let's find payments that don't have matching cashbox transactions or vice versa
  console.log(`\nDifference: Paid Payments ($${totalPaidPayments}) - Net Cashbox ($${totalInflow - totalOutflow}) = $${totalPaidPayments - (totalInflow - totalOutflow)}`);
}

main()
  .catch(e => console.error(e))
  .finally(() => prisma.$disconnect());
