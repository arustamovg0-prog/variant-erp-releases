import { PrismaClient } from '@prisma/client';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Set DATABASE_URL relative to prisma/schema.prisma
process.env.DATABASE_URL = 'file:./dev.db';
const prisma = new PrismaClient();

const AGENT_RUSLAN_ID = 'f66013a3-bd83-415b-ab5c-0344080cb273';
const AGENT_ADMIN_ID = 'a1111111-1111-1111-1111-111111111111';

// Helper to calculate relative dates easily
const getPastDate = (daysAgo) => {
  const d = new Date();
  d.setDate(d.getDate() - daysAgo);
  return d.toISOString().split('T')[0];
};

const getFutureDate = (daysAhead) => {
  const d = new Date();
  d.setDate(d.getDate() + daysAhead);
  return d.toISOString().split('T')[0];
};

async function main() {
  console.log('Starting seed process...');

  // 1. Clean existing data
  console.log('Clearing old database records...');
  await prisma.payment.deleteMany({});
  await prisma.deal.deleteMany({});
  await prisma.agent.deleteMany({});
  await prisma.setting.deleteMany({});

  // 2. Create Agents
  console.log('Creating demo agents...');
  const ruslan = await prisma.agent.create({
    data: {
      id: AGENT_RUSLAN_ID,
      name: 'Руслан Ахметов',
      email: 'ruslan@trust.uz',
      password: 'trust123',
      role: 'agent'
    }
  });

  const admin = await prisma.agent.create({
    data: {
      id: AGENT_ADMIN_ID,
      name: 'Администратор ERP',
      email: 'admin@trust.uz',
      password: 'trust123',
      role: 'admin'
    }
  });

  console.log(`Created agents: ${ruslan.name} (${ruslan.role}), ${admin.name} (${admin.role})`);

  // 3. Create Settings
  console.log('Creating settings...');
  await prisma.setting.createMany({
    data: [
      { key: 'company_name', value: 'Trust-Network' },
      { key: 'penalty_rate', value: '0.1' }, // 0.1% per day of delay
      { key: 'grace_period', value: '3' } // 3 days grace period
    ]
  });

  // 4. Seed 8 Cases
  console.log('Creating 8 mock cases (deals & payments)...');

  // --- CASE 1: Новый клиент (Brand New Client) ---
  // Client: Алишер Каримов
  const deal1 = await prisma.deal.create({
    data: {
      agentId: AGENT_RUSLAN_ID,
      client: 'Алишер Каримов',
      phone: '+998901234567',
      product: 'iPhone 15 Pro',
      totalAmount: 1200,
      monthlyAmount: 200,
      months: 6,
      paidMonths: 0,
      startDate: getPastDate(2), // Created 2 days ago
      status: 'active',
      comment: 'Новый клиент. Договор оформлен. Первый платеж ожидается в срок.'
    }
  });

  await prisma.payment.createMany({
    data: [
      { dealId: deal1.id, monthNumber: 1, amount: 200, dueDate: getFutureDate(28), status: 'pending' },
      { dealId: deal1.id, monthNumber: 2, amount: 200, dueDate: getFutureDate(58), status: 'pending' },
      { dealId: deal1.id, monthNumber: 3, amount: 200, dueDate: getFutureDate(88), status: 'pending' },
      { dealId: deal1.id, monthNumber: 4, amount: 200, dueDate: getFutureDate(118), status: 'pending' },
      { dealId: deal1.id, monthNumber: 5, amount: 200, dueDate: getFutureDate(148), status: 'pending' },
      { dealId: deal1.id, monthNumber: 6, amount: 200, dueDate: getFutureDate(178), status: 'pending' }
    ]
  });

  // --- CASE 2: Идеальный плательщик (Perfect Client) ---
  // Client: Дилшод Тохиров
  const deal2 = await prisma.deal.create({
    data: {
      agentId: AGENT_RUSLAN_ID,
      client: 'Дилшод Тохиров',
      phone: '+998934445566',
      product: 'MacBook Pro 16 M3 Max',
      totalAmount: 3600,
      monthlyAmount: 600,
      months: 6,
      paidMonths: 3,
      startDate: getPastDate(90),
      status: 'active',
      comment: 'Идеальный клиент. Всегда платит за 2-3 дня до даты платежа.'
    }
  });

  await prisma.payment.createMany({
    data: [
      { dealId: deal2.id, monthNumber: 1, amount: 600, dueDate: getPastDate(60), paidDate: getPastDate(62), status: 'paid' },
      { dealId: deal2.id, monthNumber: 2, amount: 600, dueDate: getPastDate(30), paidDate: getPastDate(33), status: 'paid' },
      { dealId: deal2.id, monthNumber: 3, amount: 600, dueDate: getPastDate(0), paidDate: getPastDate(1), status: 'paid' },
      { dealId: deal2.id, monthNumber: 4, amount: 600, dueDate: getFutureDate(30), status: 'pending' },
      { dealId: deal2.id, monthNumber: 5, amount: 600, dueDate: getFutureDate(60), status: 'pending' },
      { dealId: deal2.id, monthNumber: 6, amount: 600, dueDate: getFutureDate(90), status: 'pending' }
    ]
  });

  // --- CASE 3: Клиент с оформленным продлением/отсрочкой (Extended/Deferred Client) ---
  // Client: Сардор Рахимов
  const deal3 = await prisma.deal.create({
    data: {
      agentId: AGENT_RUSLAN_ID,
      client: 'Сардор Рахимов',
      phone: '+998997776655',
      product: 'Игровой ПК Core i9',
      totalAmount: 2400,
      monthlyAmount: 400,
      months: 6,
      paidMonths: 3,
      startDate: getPastDate(95),
      status: 'active',
      comment: 'Предоставлена отсрочка до конца недели в связи с задержкой заработной платы.'
    }
  });

  await prisma.payment.createMany({
    data: [
      { dealId: deal3.id, monthNumber: 1, amount: 400, dueDate: getPastDate(65), paidDate: getPastDate(65), status: 'paid' },
      { dealId: deal3.id, monthNumber: 2, amount: 400, dueDate: getPastDate(35), paidDate: getPastDate(35), status: 'paid' },
      { dealId: deal3.id, monthNumber: 3, amount: 400, dueDate: getPastDate(5), paidDate: getPastDate(5), status: 'paid' },
      { dealId: deal3.id, monthNumber: 4, amount: 400, dueDate: getPastDate(-5), extendedDate: getFutureDate(5), status: 'extended' }, // Extended 5 days ago, new due in 5 days
      { dealId: deal3.id, monthNumber: 5, amount: 400, dueDate: getFutureDate(25), status: 'pending' },
      { dealId: deal3.id, monthNumber: 6, amount: 400, dueDate: getFutureDate(55), status: 'pending' }
    ]
  });

  // --- CASE 4: Средняя просрочка - требует напоминания (Medium Overdue - Needs Reminder) ---
  // Client: Мадина Усманова
  const deal4 = await prisma.deal.create({
    data: {
      agentId: AGENT_RUSLAN_ID,
      client: 'Мадина Усманова',
      phone: '+998911122334',
      product: 'Dyson Airwrap Long',
      totalAmount: 800,
      monthlyAmount: 200,
      months: 4,
      paidMonths: 1,
      startDate: getPastDate(42),
      status: 'active',
      comment: 'Небольшая просрочка. Говорит, что забыла оплатить. Обещала внести завтра.'
    }
  });

  await prisma.payment.createMany({
    data: [
      { dealId: deal4.id, monthNumber: 1, amount: 200, dueDate: getPastDate(12), paidDate: getPastDate(12), status: 'paid' },
      { dealId: deal4.id, monthNumber: 2, amount: 200, dueDate: getPastDate(-12), status: 'overdue' }, // Overdue by 12 days
      { dealId: deal4.id, monthNumber: 3, amount: 200, dueDate: getFutureDate(18), status: 'pending' },
      { dealId: deal4.id, monthNumber: 4, amount: 200, dueDate: getFutureDate(48), status: 'pending' }
    ]
  });

  // --- CASE 5: Тяжелая просрочка/Дефолт - критический клиент (Critical Overdue / Default - High Risk) ---
  // Client: Лола Камилова
  const deal5 = await prisma.deal.create({
    data: {
      agentId: AGENT_RUSLAN_ID,
      client: 'Лола Камилова',
      phone: '+998972223344',
      product: 'Samsung Galaxy S24 Ultra',
      totalAmount: 1600,
      monthlyAmount: 400,
      months: 4,
      paidMonths: 0,
      startDate: getPastDate(78),
      status: 'default',
      comment: 'Не выходит на связь. Телефон отключен. Направлена досудебная претензия.'
    }
  });

  await prisma.payment.createMany({
    data: [
      { dealId: deal5.id, monthNumber: 1, amount: 400, dueDate: getPastDate(48), status: 'overdue' }, // Overdue by 48 days
      { dealId: deal5.id, monthNumber: 2, amount: 400, dueDate: getPastDate(18), status: 'overdue' }, // Overdue by 18 days
      { dealId: deal5.id, monthNumber: 3, amount: 400, dueDate: getFutureDate(12), status: 'pending' },
      { dealId: deal5.id, monthNumber: 4, amount: 400, dueDate: getFutureDate(42), status: 'pending' }
    ]
  });

  // --- CASE 6: Сделка с поручителем (Deal with Guarantor) ---
  // Client: Жасур Бекмурадов
  const deal6 = await prisma.deal.create({
    data: {
      agentId: AGENT_RUSLAN_ID,
      client: 'Жасур Бекмурадов',
      phone: '+998905556677',
      product: 'Смарт-телевизор LG OLED 55',
      totalAmount: 1500,
      monthlyAmount: 250,
      months: 6,
      paidMonths: 2,
      startDate: getPastDate(60),
      status: 'active',
      referralName: 'Алишер Каримов',
      referralPhone: '+998901234567',
      referralRelation: 'Друг',
      comment: 'Клиент пришел по рекомендации. Поручитель подтвержден звонком.'
    }
  });

  await prisma.payment.createMany({
    data: [
      { dealId: deal6.id, monthNumber: 1, amount: 250, dueDate: getPastDate(30), paidDate: getPastDate(30), status: 'paid' },
      { dealId: deal6.id, monthNumber: 2, amount: 250, dueDate: getPastDate(0), paidDate: getPastDate(0), status: 'paid' },
      { dealId: deal6.id, monthNumber: 3, amount: 250, dueDate: getFutureDate(30), status: 'pending' },
      { dealId: deal6.id, monthNumber: 4, amount: 250, dueDate: getFutureDate(60), status: 'pending' },
      { dealId: deal6.id, monthNumber: 5, amount: 250, dueDate: getFutureDate(90), status: 'pending' },
      { dealId: deal6.id, monthNumber: 6, amount: 250, dueDate: getFutureDate(120), status: 'pending' }
    ]
  });

  // --- CASE 7: Полностью закрытая рассрочка (Fully Completed / Closed Deal) ---
  // Client: Елена Смирнова
  const deal7 = await prisma.deal.create({
    data: {
      agentId: AGENT_RUSLAN_ID,
      client: 'Елена Смирнова',
      phone: '+998909876543',
      product: 'iPad Pro 11 M2',
      totalAmount: 1000,
      monthlyAmount: 250,
      months: 4,
      paidMonths: 4,
      startDate: getPastDate(120),
      status: 'completed',
      comment: 'Рассрочка успешно выплачена в полном объеме. Договор закрыт.'
    }
  });

  await prisma.payment.createMany({
    data: [
      { dealId: deal7.id, monthNumber: 1, amount: 250, dueDate: getPastDate(90), paidDate: getPastDate(90), status: 'paid' },
      { dealId: deal7.id, monthNumber: 2, amount: 250, dueDate: getPastDate(60), paidDate: getPastDate(59), status: 'paid' },
      { dealId: deal7.id, monthNumber: 3, amount: 250, dueDate: getPastDate(30), paidDate: getPastDate(30), status: 'paid' },
      { dealId: deal7.id, monthNumber: 4, amount: 250, dueDate: getPastDate(0), paidDate: getPastDate(0), status: 'paid' }
    ]
  });

  // --- CASE 8: Крупный B2B-контракт под администратором (Enterprise Deal under Admin) ---
  // Client: ООО "Grand IT Solutions"
  const deal8 = await prisma.deal.create({
    data: {
      agentId: AGENT_ADMIN_ID,
      client: 'ООО "Grand IT Solutions"',
      phone: '+998712003040',
      product: 'Офисная техника (10x Lenovo ThinkPad)',
      totalAmount: 9000,
      monthlyAmount: 900,
      months: 10,
      paidMonths: 4,
      startDate: getPastDate(120),
      status: 'active',
      comment: 'Корпоративный контракт. Оплата по безналичному расчету.'
    }
  });

  await prisma.payment.createMany({
    data: [
      { dealId: deal8.id, monthNumber: 1, amount: 900, dueDate: getPastDate(90), paidDate: getPastDate(90), status: 'paid' },
      { dealId: deal8.id, monthNumber: 2, amount: 900, dueDate: getPastDate(60), paidDate: getPastDate(60), status: 'paid' },
      { dealId: deal8.id, monthNumber: 3, amount: 900, dueDate: getPastDate(30), paidDate: getPastDate(30), status: 'paid' },
      { dealId: deal8.id, monthNumber: 4, amount: 900, dueDate: getPastDate(0), paidDate: getPastDate(0), status: 'paid' },
      { dealId: deal8.id, monthNumber: 5, amount: 900, dueDate: getFutureDate(30), status: 'pending' },
      { dealId: deal8.id, monthNumber: 6, amount: 900, dueDate: getFutureDate(60), status: 'pending' },
      { dealId: deal8.id, monthNumber: 7, amount: 900, dueDate: getFutureDate(90), status: 'pending' },
      { dealId: deal8.id, monthNumber: 8, amount: 900, dueDate: getFutureDate(120), status: 'pending' },
      { dealId: deal8.id, monthNumber: 9, amount: 900, dueDate: getFutureDate(150), status: 'pending' },
      { dealId: deal8.id, monthNumber: 10, amount: 900, dueDate: getFutureDate(180), status: 'pending' }
    ]
  });

  console.log('All 8 demo cases created successfully!');

  // 5. Sync to Electron's userData dbPath if it exists or if we can make it
  const paths = [
    '/Users/akmalrustamov/Library/Application Support/variant-epr',
    '/Users/akmalrustamov/Library/Application Support/Trust-Network ERP'
  ];
  
  for (const dir of paths) {
    const userDataDbPath = path.join(dir, 'database.sqlite');
    try {
      if (!fs.existsSync(dir)) {
        console.log(`Creating directory: ${dir}`);
        fs.mkdirSync(dir, { recursive: true });
      }
      // Copy the seeded dev.db directly to Electron's userData path
      fs.copyFileSync(path.join(__dirname, 'prisma/dev.db'), userDataDbPath);
      console.log(`Successfully synced seeded database to Electron userData: ${userDataDbPath}`);
    } catch (err) {
      console.error(`Warning: Could not sync db directly to Electron userData at ${dir}: ${err.message}`);
    }
  }

  console.log('Seeding finished!');
}

main()
  .catch((e) => {
    console.error('Error during seeding:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
