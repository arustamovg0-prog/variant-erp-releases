export type DealStatus = 'active' | 'completed' | 'overdue';
export type PaymentStatus = 'paid' | 'pending' | 'overdue' | 'extended';

export interface Agent {
  id: string;
  name: string;
  phone: string;
  login: string;
  password?: string;
  role: 'admin' | 'agent';
  avatar?: string;
}

export interface AgentStats {
  id: string;
  name: string;
  role: 'admin' | 'agent';
  totalDeals: number;
  totalPortfolio: number;
  overdueAmount: number;
}

export interface Referral {
  id: string;
  name: string;
  phone: string;
  relation: string; // e.g. "друг", "коллега", "родственник"
}

export interface Deal {
  id: string;
  agentId: string;
  client: string;
  phone: string;
  product: string;
  totalAmount: number;     // in USD
  monthlyAmount: number;   // in USD
  months: number;
  paidMonths: number;
  startDate: string;
  status: DealStatus;
  referral?: Referral;
  comment?: string;
  costPrice?: number;
  downPayment?: number;
}

export interface Payment {
  id: string;
  dealId: string;
  monthNumber: number;
  dueDate: string;
  paidDate?: string;
  extendedDate?: string;
  amount: number;          // in USD
  principalAmount: number; // in USD
  profitAmount: number;    // in USD
  status: PaymentStatus;
  overdueDays?: number;
}

export interface KPIStats {
  totalDeals: number;
  portfolioAmount: number;
  paidAmount: number;
  remainingAmount: number;
  overduePayments: number;
  overdueAmount: number;
  collectionRate: number;
  upcomingPayments: number;
}

export interface CashboxTransaction {
  id: string;
  agentId?: string | null;
  type: 'income' | 'expense';
  amount: number;
  category: 'capital' | 'down_payment' | 'payment' | 'cost_price' | 'salary' | 'tax' | 'other';
  reason: string;
  dealId?: string | null;
  date: string;
  createdAt?: string;
  updatedAt?: string;
}

