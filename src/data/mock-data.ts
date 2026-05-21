import type { Deal, Payment, Agent } from '@/types';

// ─── Mock Agents ──────────────────────────────────────
// (also exported from auth.tsx, duplicated here for data generation)

export const AGENT_IDS = {
  RUSLAN: 'agent-001',
  NILUFAR: 'agent-002',
  SHERZOD: 'agent-003',
};

// ─── Mock Deals (amounts in USD) ──────────────────────

export const mockDeals: Deal[] = [
  // ── Agent 1: Ruslan ──
  {
    id: 'D-001',
    agentId: AGENT_IDS.RUSLAN,
    client: 'Алимов Бахтиёр',
    phone: '+998 90 111 2233',
    product: 'iPhone 15 Pro Max 256GB',
    totalAmount: 1620,
    monthlyAmount: 135,
    months: 12,
    paidMonths: 8,
    startDate: '2025-08-01',
    status: 'active',
    referral: { id: 'R-001', name: 'Рахимов Фаррух', phone: '+998 90 555 1234', relation: 'коллега' },
    comment: 'Постоянный клиент, всегда платит вовремя',
  },
  {
    id: 'D-002',
    agentId: AGENT_IDS.RUSLAN,
    client: 'Хасанов Ойбек',
    phone: '+998 91 222 3344',
    product: 'Samsung Galaxy S24 Ultra',
    totalAmount: 1350,
    monthlyAmount: 168.75,
    months: 8,
    paidMonths: 5,
    startDate: '2025-11-01',
    status: 'active',
    referral: { id: 'R-002', name: 'Алимов Бахтиёр', phone: '+998 90 111 2233', relation: 'друг' },
  },
  {
    id: 'D-003',
    agentId: AGENT_IDS.RUSLAN,
    client: 'Мирзаева Дилноза',
    phone: '+998 93 333 4455',
    product: 'MacBook Air M3 15"',
    totalAmount: 2430,
    monthlyAmount: 202.5,
    months: 12,
    paidMonths: 3,
    startDate: '2026-01-15',
    status: 'overdue',
    referral: { id: 'R-003', name: 'Каримов Жасур', phone: '+998 94 888 9999', relation: 'родственник' },
    comment: 'Просит продлить срок на месяц',
  },
  {
    id: 'D-004',
    agentId: AGENT_IDS.RUSLAN,
    client: 'Юлдашев Сардор',
    phone: '+998 95 444 5566',
    product: 'iPad Pro 12.9" M2',
    totalAmount: 1050,
    monthlyAmount: 175,
    months: 6,
    paidMonths: 6,
    startDate: '2025-10-01',
    status: 'completed',
  },

  // ── Agent 2: Nilufar ──
  {
    id: 'D-005',
    agentId: AGENT_IDS.NILUFAR,
    client: 'Исмоилова Шахло',
    phone: '+998 90 555 6677',
    product: 'Sony PlayStation 5 + аксессуары',
    totalAmount: 810,
    monthlyAmount: 135,
    months: 6,
    paidMonths: 4,
    startDate: '2025-12-01',
    status: 'active',
    referral: { id: 'R-004', name: 'Юлдашев Сардор', phone: '+998 95 444 5566', relation: 'друг' },
  },
  {
    id: 'D-006',
    agentId: AGENT_IDS.NILUFAR,
    client: 'Абдуллаев Достон',
    phone: '+998 91 666 7788',
    product: 'Apple Watch Ultra 2',
    totalAmount: 540,
    monthlyAmount: 135,
    months: 4,
    paidMonths: 1,
    startDate: '2026-03-01',
    status: 'overdue',
    comment: 'Не выходит на связь уже 5 дней',
  },
  {
    id: 'D-007',
    agentId: AGENT_IDS.NILUFAR,
    client: 'Норматова Зулфия',
    phone: '+998 93 777 8899',
    product: 'Samsung 65" QLED TV',
    totalAmount: 1200,
    monthlyAmount: 150,
    months: 8,
    paidMonths: 7,
    startDate: '2025-09-01',
    status: 'active',
    referral: { id: 'R-005', name: 'Хасанов Ойбек', phone: '+998 91 222 3344', relation: 'коллега' },
  },

  // ── Agent 3: Sherzod ──
  {
    id: 'D-008',
    agentId: AGENT_IDS.SHERZOD,
    client: 'Тошматов Улугбек',
    phone: '+998 94 888 9900',
    product: 'DJI Mavic 3 Pro',
    totalAmount: 990,
    monthlyAmount: 165,
    months: 6,
    paidMonths: 2,
    startDate: '2026-02-01',
    status: 'active',
    referral: { id: 'R-006', name: 'Мирзаева Дилноза', phone: '+998 93 333 4455', relation: 'подруга' },
  },
  {
    id: 'D-009',
    agentId: AGENT_IDS.SHERZOD,
    client: 'Эргашев Аброр',
    phone: '+998 95 999 0011',
    product: 'Dyson V15 + Air Purifier',
    totalAmount: 720,
    monthlyAmount: 120,
    months: 6,
    paidMonths: 6,
    startDate: '2025-10-15',
    status: 'completed',
  },
  {
    id: 'D-010',
    agentId: AGENT_IDS.SHERZOD,
    client: 'Рузиева Малика',
    phone: '+998 90 100 1122',
    product: 'iPhone 16 Pro 512GB',
    totalAmount: 1890,
    monthlyAmount: 157.5,
    months: 12,
    paidMonths: 0,
    startDate: '2026-04-15',
    status: 'active',
    referral: { id: 'R-007', name: 'Норматова Зулфия', phone: '+998 93 777 8899', relation: 'сестра' },
    comment: 'Новая сделка, первый платёж 15 мая',
  },
];

// ─── Generate payments from deals ─────────────────────

function generatePayments(deal: Deal): Payment[] {
  const payments: Payment[] = [];
  const startDate = new Date(deal.startDate);
  const now = new Date();

  for (let i = 1; i <= deal.months; i++) {
    const dueDate = new Date(startDate);
    dueDate.setMonth(dueDate.getMonth() + i);

    let status: Payment['status'];
    let paidDate: string | undefined;
    let extendedDate: string | undefined;
    let overdueDays: number | undefined;

    if (i <= deal.paidMonths) {
      status = 'paid';
      const pd = new Date(dueDate);
      pd.setDate(pd.getDate() - Math.floor(Math.random() * 3));
      paidDate = pd.toISOString().split('T')[0];
    } else if (dueDate < now) {
      if (deal.id === 'D-003' && i === 4) {
        status = 'extended';
        const ext = new Date(dueDate);
        ext.setDate(ext.getDate() + 15);
        extendedDate = ext.toISOString().split('T')[0];
        overdueDays = Math.max(0, Math.floor((now.getTime() - ext.getTime()) / (1000 * 60 * 60 * 24)));
      } else {
        status = 'overdue';
        overdueDays = Math.floor((now.getTime() - dueDate.getTime()) / (1000 * 60 * 60 * 24));
      }
    } else {
      status = 'pending';
    }

    const costPrice = deal.costPrice || (deal.totalAmount * 0.7);
    const downPayment = deal.downPayment || 0;
    const principalAmount = (costPrice - downPayment) / deal.months;
    const profitAmount = deal.monthlyAmount - principalAmount;

    payments.push({
      id: `P-${deal.id}-${String(i).padStart(2, '0')}`,
      dealId: deal.id,
      monthNumber: i,
      dueDate: dueDate.toISOString().split('T')[0],
      paidDate,
      extendedDate,
      amount: deal.monthlyAmount,
      principalAmount,
      profitAmount,
      status,
      overdueDays,
    });
  }

  return payments;
}

export const mockPayments: Payment[] = mockDeals.flatMap(generatePayments);
