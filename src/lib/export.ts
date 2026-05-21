import type { Deal, Payment } from '@/types';
import { formatDate, calculateRemaining } from '@/lib/calculations';
import * as XLSX from 'xlsx';
import { saveAs } from 'file-saver';

function getStatusLabel(status: string): string {
  const labels: Record<string, string> = {
    paid: 'Оплачен',
    pending: 'Ожидается',
    overdue: 'Просрочен',
    extended: 'Продлён',
    active: 'Активна',
    completed: 'Завершена',
  };
  return labels[status] || status;
}

/**
 * Экспорт в Excel (.xlsx) — два листа: KPI и Детали
 */
export function exportExcel(
  deals: Deal[],
  payments: Payment[],
  startDate: string,
  endDate: string,
  uzsRate: number
) {
  const wb = XLSX.utils.book_new();

  // ── Sheet 1: KPI ──────────────────────────────
  const totalDeals = deals.length;
  const totalPayments = payments.length;
  const dueAmount = payments.reduce((s, p) => s + p.amount, 0);
  const paidPayments = payments.filter(p => p.status === 'paid');
  const paidAmount = paidPayments.reduce((s, p) => s + p.amount, 0);
  const overduePayments = payments.filter(p => p.status === 'overdue');
  const overdueAmount = overduePayments.reduce((s, p) => s + p.amount, 0);
  const collectionRate = dueAmount > 0 ? ((paidAmount / dueAmount) * 100).toFixed(1) + '%' : '0%';

  const kpiData = [
    ['ОТЧЁТ ЗА ПЕРИОД'],
    ['Период', `${formatDate(startDate)} — ${formatDate(endDate)}`],
    ['Курс UZS/USD', uzsRate],
    [],
    ['ПОКАЗАТЕЛЬ', 'ЗНАЧЕНИЕ (USD)', 'ЗНАЧЕНИЕ (UZS)'],
    ['Количество сделок', totalDeals, ''],
    ['Количество платежей', totalPayments, ''],
    ['Сумма к оплате', dueAmount, Math.round(dueAmount * uzsRate)],
    ['Оплаченная сумма', paidAmount, Math.round(paidAmount * uzsRate)],
    ['Просроченная сумма', overdueAmount, Math.round(overdueAmount * uzsRate)],
    ['Процент собираемости', collectionRate, ''],
  ];

  const wsKPI = XLSX.utils.aoa_to_sheet(kpiData);

  // Column widths
  wsKPI['!cols'] = [
    { wch: 25 },
    { wch: 18 },
    { wch: 20 },
  ];

  XLSX.utils.book_append_sheet(wb, wsKPI, 'KPI');

  // ── Sheet 2: Details ──────────────────────────
  const headers = [
    'ID сделки',
    'Клиент',
    'Телефон',
    'Продукт',
    'Месяц платежа',
    'Сумма (USD)',
    'Сумма (UZS)',
    'Статус',
    'Дата платежа',
    'Дата продления',
    'Дней просрочки',
    'Общая сумма (USD)',
    'Общая сумма (UZS)',
    'Срок (мес)',
    'Оплачено месяцев',
    'Остаток (USD)',
    'Остаток (UZS)',
  ];

  const rows = payments.map(payment => {
    const deal = deals.find(d => d.id === payment.dealId);
    if (!deal) return [];
    const remaining = calculateRemaining(deal, payments);

    return [
      deal.id,
      deal.client,
      deal.phone,
      deal.product,
      `Месяц ${payment.monthNumber}`,
      payment.amount,
      Math.round(payment.amount * uzsRate),
      getStatusLabel(payment.status),
      payment.paidDate ? formatDate(payment.paidDate) : formatDate(payment.dueDate),
      payment.extendedDate ? formatDate(payment.extendedDate) : '',
      payment.overdueDays || '',
      deal.totalAmount,
      Math.round(deal.totalAmount * uzsRate),
      deal.months,
      deal.paidMonths,
      remaining,
      Math.round(remaining * uzsRate),
    ];
  }).filter(r => r.length > 0);

  const wsDetails = XLSX.utils.aoa_to_sheet([headers, ...rows]);

  // Column widths
  wsDetails['!cols'] = [
    { wch: 10 }, { wch: 22 }, { wch: 18 }, { wch: 28 },
    { wch: 14 }, { wch: 12 }, { wch: 16 }, { wch: 12 },
    { wch: 14 }, { wch: 14 }, { wch: 14 }, { wch: 14 },
    { wch: 18 }, { wch: 10 }, { wch: 16 }, { wch: 14 },
    { wch: 18 },
  ];

  XLSX.utils.book_append_sheet(wb, wsDetails, 'Детали');

  // ── Generate & download ───────────────────────
  const buffer = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
  const blob = new Blob([buffer], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  });
  saveAs(blob, `report_${startDate}_${endDate}.xlsx`);
}

/**
 * Fallback: CSV export with UTF-8 BOM
 */
export function exportCSV(
  deals: Deal[],
  payments: Payment[],
  startDate: string,
  endDate: string,
  uzsRate: number
) {
  const BOM = '\uFEFF';
  const SEP = ';';
  const lines: string[] = [];

  const totalDeals = deals.length;
  const totalPayments = payments.length;
  const dueAmount = payments.reduce((s, p) => s + p.amount, 0);
  const paidPayments = payments.filter(p => p.status === 'paid');
  const paidAmount = paidPayments.reduce((s, p) => s + p.amount, 0);
  const overduePayments = payments.filter(p => p.status === 'overdue');
  const overdueAmount = overduePayments.reduce((s, p) => s + p.amount, 0);
  const collectionRate = dueAmount > 0 ? ((paidAmount / dueAmount) * 100).toFixed(1) : '0';

  lines.push('ОТЧЁТ ЗА ПЕРИОД');
  lines.push(`Период${SEP}${formatDate(startDate)} - ${formatDate(endDate)}`);
  lines.push(`Курс UZS/USD${SEP}${uzsRate}`);
  lines.push('');
  lines.push('KPI');
  lines.push(`Количество сделок${SEP}${totalDeals}`);
  lines.push(`Количество платежей${SEP}${totalPayments}`);
  lines.push(`Сумма к оплате (USD)${SEP}${dueAmount}`);
  lines.push(`Сумма к оплате (UZS)${SEP}${Math.round(dueAmount * uzsRate)}`);
  lines.push(`Оплаченная сумма (USD)${SEP}${paidAmount}`);
  lines.push(`Просроченная сумма (USD)${SEP}${overdueAmount}`);
  lines.push(`Процент собираемости${SEP}${collectionRate}%`);
  lines.push('');
  lines.push('');

  lines.push(
    [
      'ID сделки', 'Клиент', 'Телефон', 'Продукт',
      'Месяц платежа', 'Сумма (USD)', 'Сумма (UZS)', 'Статус',
      'Дата платежа', 'Дата продления', 'Дней просрочки',
      'Общая сумма (USD)', 'Срок (мес)', 'Оплачено месяцев', 'Остаток (USD)',
    ].join(SEP)
  );

  for (const payment of payments) {
    const deal = deals.find(d => d.id === payment.dealId);
    if (!deal) continue;
    const remaining = calculateRemaining(deal, payments);

    lines.push(
      [
        deal.id, deal.client, deal.phone, deal.product,
        `Месяц ${payment.monthNumber}`, payment.amount, Math.round(payment.amount * uzsRate),
        getStatusLabel(payment.status),
        payment.paidDate ? formatDate(payment.paidDate) : formatDate(payment.dueDate),
        payment.extendedDate ? formatDate(payment.extendedDate) : '',
        payment.overdueDays || '',
        deal.totalAmount, deal.months, deal.paidMonths, remaining,
      ].join(SEP)
    );
  }

  const csvContent = BOM + lines.join('\n');
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `report_${startDate}_${endDate}.csv`;
  link.click();
  URL.revokeObjectURL(url);
}

/**
 * Экспорт прогноза в CSV с UTF-8 BOM
 */
export function exportForecastCSV(
  payments: Payment[],
  deals: Deal[],
  agentMap: Record<string, string> | Map<string, string>,
  monthLabel: string,
  uzsRate: number
) {
  const BOM = '\uFEFF';
  const SEP = ';';
  const lines: string[] = [];

  lines.push(`ФИНАНСОВЫЙ ПРОГНОЗ (ПЛАН/ФАКТ) — ${monthLabel}`);
  lines.push(`Курс UZS/USD${SEP}${uzsRate}`);
  lines.push('');
  
  lines.push(
    [
      'N', 'Агент', 'Клиент', 'Товар', 'Реферал', 
      'Счетчик платежа', 'Дата платежа', 
      'Общий Платеж (USD)', 'Общий Платеж (UZS)',
      'Тело долга (Tani USD)', 'Тело долга (Tani UZS)',
      'Прибыль (Foyda USD)', 'Прибыль (Foyda UZS)',
      'Статус'
    ].join(SEP)
  );

  let index = 1;
  for (const p of payments) {
    const deal = deals.find(d => d.id === p.dealId);
    if (!deal) continue;

    const agentName = agentMap instanceof Map 
      ? (agentMap.get(deal.agentId) || deal.agentId) 
      : (agentMap[deal.agentId] || deal.agentId);

    const referralText = deal.referral 
      ? `${deal.referral.name} (${deal.referral.relation})` 
      : '—';

    const counterText = `${p.monthNumber} из ${deal.months}`;

    let tani = p.principalAmount || 0;
    let foyda = p.profitAmount || 0;
    if (!tani && !foyda) {
      const costPrice = deal.costPrice || 0;
      const downPayment = deal.downPayment || 0;
      if (costPrice > 0) {
        tani = Math.max(0, (costPrice - downPayment) / deal.months);
        foyda = p.amount - tani;
      } else {
        tani = 0;
        foyda = p.amount;
      }
    }

    lines.push(
      [
        index++,
        agentName,
        deal.client,
        deal.product,
        referralText.replace(/;/g, ','),
        counterText,
        p.dueDate,
        p.amount.toFixed(2),
        Math.round(p.amount * uzsRate),
        tani.toFixed(2),
        Math.round(tani * uzsRate),
        foyda.toFixed(2),
        Math.round(foyda * uzsRate),
        getStatusLabel(p.status)
      ].join(SEP)
    );
  }

  const csvContent = BOM + lines.join('\n');
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `forecast_${monthLabel.replace(/\s+/g, '_')}.csv`;
  link.click();
  URL.revokeObjectURL(url);
}
