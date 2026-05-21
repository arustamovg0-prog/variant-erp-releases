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
  console.log('User database file does not exist.');
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
  // Find a pending payment
  const payment = await prisma.payment.findFirst({
    where: { status: 'pending' },
    include: { deal: true }
  });

  if (!payment) {
    console.log('No pending payment found to test with.');
    return;
  }

  console.log('Found pending payment:', {
    id: payment.id,
    monthNumber: payment.monthNumber,
    amount: payment.amount,
    status: payment.status,
    dealId: payment.dealId,
    client: payment.deal.client
  });

  const today = new Date().toISOString().split('T')[0];

  // 1. Update payment in DB
  console.log('Updating payment status to paid...');
  const updatedPayment = await prisma.payment.update({
    where: { id: payment.id },
    data: {
      status: 'paid',
      paidDate: today
    }
  });
  console.log('Updated payment successfully:', updatedPayment);

  // 2. Create cashbox transaction
  const payTx = {
    agentId: payment.deal.agentId,
    type: 'income',
    amount: payment.amount,
    category: 'payment',
    reason: `Оплата от: ${payment.deal.client} (Договор: ${payment.dealId}) | Ежемесячный платеж №${payment.monthNumber} за ${payment.deal.product}`,
    dealId: payment.dealId,
    date: today
  };

  console.log('Creating cashbox transaction with payload:', payTx);
  const tx = await prisma.cashboxTransaction.create({
    data: payTx
  });
  console.log('Created cashbox transaction successfully:', tx);

  // Verification count
  const txCount = await prisma.cashboxTransaction.count();
  console.log(`Total cashbox transactions in database now: ${txCount}`);
}

main()
  .catch(e => console.error('Error during test:', e))
  .finally(() => prisma.$disconnect());
