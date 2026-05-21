import type { Deal, Payment, KPIStats } from '@/types';

// ─── Currency ──────────────────────────────────────────
// Курс UZS за 1 USD (настраиваемый)
export const UZS_RATE = 12_800;

// ─── Вариант: Логика расчета наценки (из Excel) ────────
const TERM_MULTIPLIERS: Record<number, number> = {
  1: 1.08, 2: 1.07, 3: 1.05, 4: 1.03, 5: 1.01, 6: 1.00,
  7: 0.99, 8: 0.98, 9: 0.97, 10: 0.96, 11: 0.95, 12: 0.94
};

// Точки интерполяции базовой маржи (FOYDA) из таблицы
const FOYDA_POINTS = [
  { price: 0, foyda: 0 },
  { price: 50, foyda: 5.00 },
  { price: 100, foyda: 7.20 },
  { price: 200, foyda: 11.36 },
  { price: 300, foyda: 15.28 },
  { price: 400, foyda: 18.96 },
  { price: 500, foyda: 22.40 },
  { price: 600, foyda: 25.60 },
  { price: 700, foyda: 28.76 },
  { price: 800, foyda: 31.28 },
  { price: 900, foyda: 33.76 }
];

export function getBaseFoyda(price: number): number {
  if (price <= 0) return 0;
  
  // Линейная интерполяция по заданным точкам
  for (let i = 0; i < FOYDA_POINTS.length - 1; i++) {
    const p1 = FOYDA_POINTS[i];
    const p2 = FOYDA_POINTS[i + 1];
    if (price >= p1.price && price <= p2.price) {
      const ratio = (price - p1.price) / (p2.price - p1.price);
      return p1.foyda + ratio * (p2.foyda - p1.foyda);
    }
  }
  
  // Экстраполяция для сумм больше 900$
  const p1 = FOYDA_POINTS[FOYDA_POINTS.length - 2];
  const p2 = FOYDA_POINTS[FOYDA_POINTS.length - 1];
  const slope = (p2.foyda - p1.foyda) / (p2.price - p1.price);
  return p2.foyda + (price - p2.price) * slope;
}

/**
 * Расчёт ежемесячного платежа (Точно как в Excel)
 * Формула: округление( (Сумма / Месяцы) + (БазоваяFoyda * КоэфСрока) )
 */
export function calculateMonthlyPayment(price: number, months: number): number {
  const foyda = getBaseFoyda(price);
  const multiplier = TERM_MULTIPLIERS[months] || 1.0;
  return Math.round((price / months) + (foyda * multiplier));
}

/**
 * Расчёт общей суммы сделки
 */
export function calculateTotalAmount(price: number, months: number): number {
  return calculateMonthlyPayment(price, months) * months;
}

/**
 * Расчёт наценки
 */
export function calculateMarkup(price: number, months: number): number {
  return calculateTotalAmount(price, months) - price;
}

/**
 * Остаток по сделке
 */
export function calculateRemaining(deal: Deal, payments: Payment[]): number {
  const dealPayments = payments.filter(p => p.dealId === deal.id);
  const actuallyPaid = dealPayments
    .filter(p => p.status === 'paid')
    .reduce((sum, p) => sum + p.amount, 0);
    
  return Math.max(0, deal.totalAmount - actuallyPaid);
}

/**
 * Дни просрочки
 */
export function calculateOverdueDays(dueDate: string, extendedDate?: string): number {
  const deadlineStr = extendedDate || dueDate;
  const parts = deadlineStr.split('-');
  if (parts.length !== 3) return 0;
  const year = parseInt(parts[0], 10);
  const month = parseInt(parts[1], 10) - 1;
  const day = parseInt(parts[2], 10);
  if (isNaN(year) || isNaN(month) || isNaN(day)) return 0;

  const deadline = new Date(Date.UTC(year, month, day));
  const now = new Date();
  const nowUTC = new Date(Date.UTC(now.getFullYear(), now.getMonth(), now.getDate()));
  
  const diff = Math.round((nowUTC.getTime() - deadline.getTime()) / (1000 * 60 * 60 * 24));
  return Math.max(0, diff);
}

/**
 * Расчёт KPI
 */
export function calculateKPI(deals: Deal[], payments: Payment[]): KPIStats {
  const totalDeals = deals.length;
  const portfolioAmount = deals.reduce((sum, d) => sum + d.totalAmount, 0);
  const paidAmount = deals.reduce((sum, d) => sum + d.paidMonths * d.monthlyAmount, 0);
  const remainingAmount = portfolioAmount - paidAmount;

  const overduePaymentsList = payments.filter(p => p.status === 'overdue');
  const overduePayments = overduePaymentsList.length;
  const overdueAmount = overduePaymentsList.reduce((sum, p) => sum + p.amount, 0);

  const duePayments = payments.filter(p => p.status === 'paid' || p.status === 'overdue');
  const paidPayments = payments.filter(p => p.status === 'paid');
  const dueAmount = duePayments.reduce((sum, p) => sum + p.amount, 0);
  const collectedAmount = paidPayments.reduce((sum, p) => sum + p.amount, 0);
  const collectionRate = dueAmount > 0 ? (collectedAmount / dueAmount) * 100 : 0;

  const now = new Date();
  const weekLater = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
  const upcomingPayments = payments.filter(p => {
    if (p.status !== 'pending') return false;
    const due = new Date(p.dueDate);
    return due >= now && due <= weekLater;
  }).length;

  return {
    totalDeals,
    portfolioAmount,
    paidAmount,
    remainingAmount,
    overduePayments,
    overdueAmount,
    collectionRate,
    upcomingPayments,
  };
}

// ─── Formatting ──────────────────────────────────────

/**
 * Форматирование суммы в USD (основная валюта)
 */
export function formatAmount(amount: number): string {
  return '$' + new Intl.NumberFormat('en-US', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(Math.round(amount));
}

/**
 * Форматирование суммы в UZS (вспомогательная валюта)
 */
export function formatAmountUZS(amountUSD: number): string {
  const uzs = Math.round(amountUSD * UZS_RATE);
  return new Intl.NumberFormat('ru-RU', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(uzs) + ' сўм';
}

/**
 * Конвертация USD → UZS
 */
export function toUZS(amountUSD: number): number {
  return amountUSD * UZS_RATE;
}

/**
 * Форматирование даты
 */
export function formatDate(dateString: string): string {
  const parts = dateString.split('-');
  if (parts.length !== 3) return dateString;
  const year = parts[0];
  const month = parts[1];
  const day = parts[2];
  return `${day}.${month}.${year}`;
}

/**
 * Форматирование процента
 */
export function formatPercent(value: number): string {
  return value.toFixed(1) + '%';
}

// ─── Scoring ─────────────────────────────────────────

export interface TrustScore {
  score: number; // 0-100
  grade: 'A' | 'B' | 'C' | 'D';
  color: string;
  label: string;
}

/**
 * Расчет индекса надежности клиента (0-100)
 */
export function calculateClientTrustScore(deals: Deal[], payments: Payment[]): TrustScore {
  let score = 80; // Базовый рейтинг нового клиента

  // +10 за каждую успешно закрытую сделку
  const completedDeals = deals.filter(d => d.status === 'completed').length;
  score += completedDeals * 10;

  let currentOverdueDays = 0;
  let historicalLatePayments = 0;
  let extendedPayments = 0;
  let onTimePayments = 0;

  payments.forEach(p => {
    // Текущие просрочки
    if (p.status === 'overdue') {
      const days = calculateOverdueDays(p.dueDate, p.extendedDate);
      currentOverdueDays += days;
    }
    
    // Продления
    if (p.status === 'extended' || p.extendedDate) {
      extendedPayments++;
    }

    // Исторические платежи (если оплачен)
    if (p.status === 'paid' && p.paidDate) {
      // Сбрасываем время для честного сравнения дат
      const paidDate = new Date(p.paidDate);
      paidDate.setHours(0, 0, 0, 0);
      
      const dueDate = new Date(p.extendedDate || p.dueDate);
      dueDate.setHours(0, 0, 0, 0);

      if (paidDate > dueDate) {
        historicalLatePayments++;
      } else {
        onTimePayments++;
      }
    }
  });

  // Применяем модификаторы
  score += onTimePayments * 5;           // +5 за каждый платеж вовремя
  score -= currentOverdueDays * 2;       // -2 за каждый день ТЕКУЩЕЙ просрочки
  score -= historicalLatePayments * 2;   // -2 за каждый ИСТОРИЧЕСКИЙ платеж с опозданием
  score -= extendedPayments * 5;         // -5 за каждое продление

  // Ограничиваем от 0 до 100
  score = Math.max(0, Math.min(100, Math.round(score)));

  let grade: 'A' | 'B' | 'C' | 'D' = 'A';
  let color = 'var(--color-success)';
  let label = 'Надежный';

  if (score >= 90) {
    grade = 'A';
    color = 'var(--color-success)';
    label = 'Отличный';
  } else if (score >= 70) {
    grade = 'B';
    color = 'var(--color-info)';
    label = 'Хороший';
  } else if (score >= 50) {
    grade = 'C';
    color = 'var(--color-warning)';
    label = 'Рискованный';
  } else {
    grade = 'D';
    color = 'var(--color-danger)';
    label = 'Проблемный';
  }

  return { score, grade, color, label };
}

/**
 * Вычисляет дату через N месяцев со дня startDate.
 * Гарантирует правильный календарный перенос месяцев без перелетов на следующий месяц.
 * Например: 31 января + 1 месяц = 28/29 февраля.
 */
export function addMonths(dateStr: string, monthsNum: number): string {
  const parts = dateStr.split('-');
  if (parts.length !== 3) return dateStr;
  const year = parseInt(parts[0], 10);
  const month = parseInt(parts[1], 10) - 1;
  const day = parseInt(parts[2], 10);
  if (isNaN(year) || isNaN(month) || isNaN(day)) return dateStr;

  const date = new Date(Date.UTC(year, month, day));
  if (isNaN(date.getTime())) return dateStr;
  
  const targetMonth = date.getUTCMonth() + monthsNum;
  const tempDate = new Date(Date.UTC(date.getUTCFullYear(), targetMonth, 1));
  
  const maxDays = new Date(Date.UTC(tempDate.getUTCFullYear(), tempDate.getUTCMonth() + 1, 0)).getUTCDate();
  const targetDay = Math.min(day, maxDays);
  tempDate.setUTCDate(targetDay);
  
  return tempDate.toISOString().split('T')[0];
}

/**
 * Форматирование суммы в UZS с динамическим курсом
 */
export function formatAmountUZSWithRate(amountUSD: number, rate: number): string {
  const uzs = Math.round(amountUSD * rate);
  return new Intl.NumberFormat('ru-RU', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(uzs) + ' сўм';
}


