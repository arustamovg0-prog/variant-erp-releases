import { useState, useMemo, useEffect } from 'react';
import { useApp } from '@/lib/store';
import { useAuth } from '@/lib/auth';
import { useLanguage } from '@/lib/language';
import { formatAmount, formatAmountUZS, formatPercent, formatDate, formatAmountUZSWithRate } from '@/lib/calculations';
import { exportExcel, exportCSV, exportForecastCSV } from '@/lib/export';
import KPICard from '@/components/shared/KPICard';
import StatusBadge from '@/components/shared/StatusBadge';
import type { Agent } from '@/types';
import {
  FileBarChart,
  Download,
  FileSpreadsheet,
  Calendar,
  DollarSign,
  TrendingUp,
  AlertTriangle,
  CheckCircle,
  CreditCard,
} from 'lucide-react';

export default function Reports() {
  const { agent } = useAuth();
  const { t, language } = useLanguage();
  const { state, getPaymentsInRange, getDealsInRange } = useApp();

  const [activeTab, setActiveTab] = useState<'analytics' | 'forecast'>('analytics');

  // Analytics (existing reports) state
  const defaultEnd = new Date().toISOString().split('T')[0];
  const defaultStart = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

  const [startDate, setStartDate] = useState(defaultStart);
  const [endDate, setEndDate] = useState(defaultEnd);

  // Forecast state
  const now = new Date();
  const [selectedMonth, setSelectedMonth] = useState<number>(now.getMonth()); // 0-11
  const [selectedYear, setSelectedYear] = useState<number>(now.getFullYear());
  const [selectedAgentId, setSelectedAgentId] = useState<string>('all');
  const [agents, setAgents] = useState<Agent[]>([]);

  useEffect(() => {
    async function loadAgents() {
      if (agent?.role === 'admin' && window.api?.getAllAgents) {
        const res = await window.api.getAllAgents();
        if (res.success && res.data) {
          setAgents(res.data);
        }
      }
    }
    loadAgents();
  }, [agent]);

  const agentMap = useMemo(() => {
    const map: Record<string, string> = {};
    agents.forEach(a => {
      map[a.id] = a.name;
    });
    if (agent) {
      map[agent.id] = agent.name;
    }
    return map;
  }, [agents, agent]);

  const monthsList = [
    { value: 0, label: language === 'ru' ? 'Январь' : 'Yanvar' },
    { value: 1, label: language === 'ru' ? 'Февраль' : 'Fevral' },
    { value: 2, label: language === 'ru' ? 'Март' : 'Mart' },
    { value: 3, label: language === 'ru' ? 'Апрель' : 'Aprel' },
    { value: 4, label: language === 'ru' ? 'Май' : 'May' },
    { value: 5, label: language === 'ru' ? 'Июнь' : 'Iyun' },
    { value: 6, label: language === 'ru' ? 'Июль' : 'Iyul' },
    { value: 7, label: language === 'ru' ? 'Август' : 'Avgust' },
    { value: 8, label: language === 'ru' ? 'Сентябрь' : 'Sentabr' },
    { value: 9, label: language === 'ru' ? 'Октябрь' : 'Oktabr' },
    { value: 10, label: language === 'ru' ? 'Ноябрь' : 'Noyabr' },
    { value: 11, label: language === 'ru' ? 'Декабрь' : 'Dekabr' },
  ];

  const availableYears = useMemo(() => {
    const years = new Set<number>();
    for (const p of state.payments) {
      const parts = p.dueDate.split('-');
      if (parts.length > 0) {
        const y = parseInt(parts[0], 10);
        if (!isNaN(y)) years.add(y);
      }
    }
    const cy = new Date().getFullYear();
    years.add(cy);
    years.add(cy - 1);
    years.add(cy + 1);
    return Array.from(years).sort((a, b) => b - a);
  }, [state.payments]);

  const filteredPayments = useMemo(() => {
    return state.payments.filter(p => {
      const parts = p.dueDate.split('-');
      if (parts.length < 2) return false;
      const year = parseInt(parts[0], 10);
      const month = parseInt(parts[1], 10) - 1; // 0-indexed month
      
      const matchesMonthYear = year === selectedYear && month === selectedMonth;
      if (!matchesMonthYear) return false;
      
      const deal = state.deals.find(d => d.id === p.dealId);
      if (!deal) return false;
      
      if (!agent) return false;
      if (agent.role === 'admin') {
        if (selectedAgentId !== 'all' && deal.agentId !== selectedAgentId) {
          return false;
        }
      } else {
        if (deal.agentId !== agent.id) {
          return false;
        }
      }
      
      return true;
    }).sort((a, b) => a.dueDate.localeCompare(b.dueDate));
  }, [state.payments, state.deals, selectedMonth, selectedYear, selectedAgentId, agent]);

  const forecastKPI = useMemo(() => {
    let totalPlan = 0;
    let totalTani = 0;
    let totalFoyda = 0;
    let totalPaidFact = 0;

    for (const p of filteredPayments) {
      totalPlan += p.amount;
      
      let tani = p.principalAmount || 0;
      let foyda = p.profitAmount || 0;
      
      if (tani === 0 && foyda === 0) {
        const deal = state.deals.find(d => d.id === p.dealId);
        if (deal) {
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
      }
      
      totalTani += tani;
      totalFoyda += foyda;
      
      if (p.status === 'paid') {
        totalPaidFact += p.amount;
      }
    }

    return {
      totalPlan,
      totalTani,
      totalFoyda,
      totalPaidFact,
    };
  }, [filteredPayments, state.deals]);

  const handleExportForecast = () => {
    const monthLabel = monthsList[selectedMonth].label + ' ' + selectedYear;
    // We need an agentMap of agentId -> agentName
    const aMap: Record<string, string> = {};
    agents.forEach(a => {
      aMap[a.id] = a.name;
    });
    if (agent && !aMap[agent.id]) {
      aMap[agent.id] = agent.name;
    }
    state.deals.forEach(d => {
      if (!aMap[d.agentId]) {
        aMap[d.agentId] = d.agentId;
      }
    });

    exportForecastCSV(filteredPayments, state.deals, aMap, monthLabel, state.uzsRate);
  };

  if (!agent) return null;

  // Analytics calculations (existing)
  const rangePayments = useMemo(() => getPaymentsInRange(agent.id, startDate, endDate), [agent.id, startDate, endDate, getPaymentsInRange]);
  const rangeDeals = useMemo(() => getDealsInRange(agent.id, startDate, endDate), [agent.id, startDate, endDate, getDealsInRange]);

  const kpi = useMemo(() => {
    const totalDeals = rangeDeals.length;
    const totalPayments = rangePayments.length;
    const dueAmount = rangePayments.reduce((s, p) => s + p.amount, 0);
    const paidPayments = rangePayments.filter(p => p.status === 'paid');
    const paidAmount = paidPayments.reduce((s, p) => s + p.amount, 0);
    const overduePayments = rangePayments.filter(p => p.status === 'overdue');
    const overdueAmount = overduePayments.reduce((s, p) => s + p.amount, 0);
    const collectionRate = dueAmount > 0 ? (paidAmount / dueAmount) * 100 : 0;

    let collectedBody = 0;
    let collectedProfit = 0;
    let dueBody = 0;
    let dueProfit = 0;

    for (const payment of rangePayments) {
      const deal = state.deals.find(d => d.id === payment.dealId);
      if (deal) {
        let tani = payment.principalAmount || 0;
        let foyda = payment.profitAmount || 0;
        if (tani === 0 && foyda === 0) {
          const costPrice = deal.costPrice || 0;
          const downPayment = deal.downPayment || 0;
          if (costPrice > 0) {
            tani = Math.max(0, (costPrice - downPayment) / deal.months);
            foyda = payment.amount - tani;
          } else {
            tani = 0;
            foyda = payment.amount;
          }
        }

        if (payment.status === 'paid') {
          collectedBody += tani;
          collectedProfit += foyda;
        }
        dueBody += tani;
        dueProfit += foyda;
      }
    }

    return {
      totalDeals,
      totalPayments,
      dueAmount,
      paidAmount,
      overdueAmount,
      overduePayments: overduePayments.length,
      collectionRate,
      collectedBody,
      collectedProfit,
      dueBody,
      dueProfit
    };
  }, [rangePayments, rangeDeals, state.deals]);

  const handleExportExcel = () => {
    exportExcel(rangeDeals, rangePayments, startDate, endDate, state.uzsRate);
  };

  const handleExportCSV = () => {
    exportCSV(rangeDeals, rangePayments, startDate, endDate, state.uzsRate);
  };

  return (
    <div style={{ maxWidth: '1200px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1.5rem' }}>
        <div>
          <h1 style={{ fontSize: '1.5rem', fontWeight: 700, marginBottom: '0.25rem' }}>
            <FileBarChart size={22} style={{ display: 'inline', verticalAlign: 'middle', marginRight: '0.5rem' }} />
            {t('reports.title')}
          </h1>
          <p style={{ fontSize: '0.875rem', color: 'var(--foreground-muted)' }}>
            {t('reports.subtitle')}
          </p>
        </div>
      </div>

      {/* Tab Switcher */}
      <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1.5rem', borderBottom: '1px solid var(--border)', paddingBottom: '0.5rem' }}>
        <button
          className={`tab-btn ${activeTab === 'analytics' ? 'tab-btn-active' : 'tab-btn-inactive'}`}
          onClick={() => setActiveTab('analytics')}
          style={{ padding: '0.5rem 1rem', fontSize: '0.875rem' }}
        >
          {language === 'ru' ? 'Аналитика за период' : 'Davr hisoboti'}
        </button>
        <button
          className={`tab-btn ${activeTab === 'forecast' ? 'tab-btn-active' : 'tab-btn-inactive'}`}
          onClick={() => setActiveTab('forecast')}
          style={{ padding: '0.5rem 1rem', fontSize: '0.875rem' }}
        >
          {language === 'ru' ? 'Финансовый прогноз (План/Факт)' : 'Moliyaviy prognoz (Reja/Haqiqat)'}
        </button>
      </div>

      {activeTab === 'analytics' ? (
        <>
          {/* Period selector + Export */}
          <div className="glass-card" style={{ padding: '1rem 1.25rem', marginBottom: '1.5rem', display: 'flex', alignItems: 'flex-end', gap: '1rem', flexWrap: 'wrap' }}>
            <div>
              <label style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--foreground-muted)', display: 'block', marginBottom: '0.375rem' }}>
                <Calendar size={12} style={{ display: 'inline', verticalAlign: 'middle', marginRight: '0.25rem' }} />
                {language === 'ru' ? 'Дата начала' : 'Boshlanish sanasi'}
              </label>
              <input 
                className="input-field" 
                type="date" 
                value={startDate} 
                onChange={e => setStartDate(e.target.value)} 
                onClick={(e) => { try { if ('showPicker' in e.currentTarget) (e.currentTarget as HTMLInputElement).showPicker(); } catch(err){} }}
                style={{ width: '180px', cursor: 'pointer' }} 
              />
            </div>
            <div>
              <label style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--foreground-muted)', display: 'block', marginBottom: '0.375rem' }}>
                <Calendar size={12} style={{ display: 'inline', verticalAlign: 'middle', marginRight: '0.25rem' }} />
                {language === 'ru' ? 'Дата окончания' : 'Tugash sanasi'}
              </label>
              <input 
                className="input-field" 
                type="date" 
                value={endDate} 
                onChange={e => setEndDate(e.target.value)} 
                onClick={(e) => { try { if ('showPicker' in e.currentTarget) (e.currentTarget as HTMLInputElement).showPicker(); } catch(err){} }}
                style={{ width: '180px', cursor: 'pointer' }} 
              />
            </div>
            <div style={{ flex: 1 }} />
            <button className="btn-primary" onClick={handleExportExcel}>
              <FileSpreadsheet size={16} />
              Excel (.xlsx)
            </button>
            <button className="btn-secondary" onClick={handleExportCSV}>
              <Download size={16} />
              CSV
            </button>
          </div>

          {/* Period KPI */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem', marginBottom: '1.5rem' }}>
            <KPICard label={language === 'ru' ? 'Сделок за период' : 'Davr uchun shartnomalar'} value={String(kpi.totalDeals)} icon={<DollarSign size={20} />} accentColor="var(--primary)" />
            <KPICard label={language === 'ru' ? 'Платежей' : 'To\'lovlar'} value={String(kpi.totalPayments)} icon={<CreditCard size={20} />} accentColor="var(--color-info)" />
            <KPICard label={language === 'ru' ? 'Сумма к оплате' : 'To\'lanadigan summa'} value={formatAmount(kpi.dueAmount)} subtitle={formatAmountUZSWithRate(kpi.dueAmount, state.uzsRate)} icon={<DollarSign size={20} />} accentColor="var(--color-warning)" />
            <KPICard label={t('db.paid')} value={formatAmount(kpi.paidAmount)} subtitle={formatAmountUZSWithRate(kpi.paidAmount, state.uzsRate)} icon={<CheckCircle size={20} />} accentColor="var(--color-success)" />
            <KPICard label={t('db.overdues')} value={formatAmount(kpi.overdueAmount)} subtitle={`${kpi.overduePayments} ${language === 'ru' ? 'платежей' : 'ta to\'lov'}`} icon={<AlertTriangle size={20} />} accentColor="var(--color-danger)" />
            <KPICard label={t('db.collection')} value={formatPercent(kpi.collectionRate)} icon={<TrendingUp size={20} />} accentColor={kpi.collectionRate >= 80 ? 'var(--color-success)' : 'var(--color-warning)'} />
          </div>

          {/* Delineated Reports Card (Cost body vs Profit Margin) */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(340px, 1fr))', gap: '1rem', marginBottom: '2rem' }}>
            {/* Cost Body "Тело долга" Card */}
            <div className="glass-card" style={{ padding: '1.25rem', borderLeft: '4px solid var(--primary)' }}>
              <h3 style={{ fontSize: '0.9375rem', fontWeight: 700, marginBottom: '0.75rem', color: 'var(--foreground)' }}>
                {language === 'ru' ? 'Тело долга (Себестоимость)' : 'Qarz tanasi (Tannarx)'}
              </h3>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem', fontSize: '0.8125rem' }}>
                <span style={{ color: 'var(--foreground-muted)' }}>{language === 'ru' ? 'Получено тело долга:' : 'Olingan qarz tanasi:'}</span>
                <span style={{ fontWeight: 700, color: 'var(--color-success)' }}>
                  {formatAmount(kpi.collectedBody)} ({formatPercent(kpi.dueBody > 0 ? (kpi.collectedBody / kpi.dueBody) * 100 : 0)})
                </span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.75rem', fontSize: '0.8125rem' }}>
                <span style={{ color: 'var(--foreground-muted)' }}>{language === 'ru' ? 'Осталось собрать:' : 'Qolgan yig\'ish:'}</span>
                <span style={{ fontWeight: 700 }}>
                  {formatAmount(Math.max(0, kpi.dueBody - kpi.collectedBody))}
                </span>
              </div>
              {/* Progress Bar */}
              <div style={{ width: '100%', height: '8px', background: 'rgba(255,255,255,0.05)', borderRadius: '4px', overflow: 'hidden' }}>
                <div style={{
                  width: `${kpi.dueBody > 0 ? Math.min(100, (kpi.collectedBody / kpi.dueBody) * 100) : 0}%`,
                  height: '100%',
                  background: 'var(--primary)',
                  borderRadius: '4px'
                }} />
              </div>
              <div style={{ fontSize: '0.6875rem', color: 'var(--foreground-muted)', marginTop: '0.5rem', textAlign: 'right' }}>
                {language === 'ru' ? 'Общее начислено:' : 'Jami hisoblangan:'} {formatAmount(kpi.dueBody)}
              </div>
            </div>

            {/* Profit Margin "Прибыль" Card */}
            <div className="glass-card" style={{ padding: '1.25rem', borderLeft: '4px solid var(--color-success)' }}>
              <h3 style={{ fontSize: '0.9375rem', fontWeight: 700, marginBottom: '0.75rem', color: 'var(--foreground)' }}>
                {language === 'ru' ? 'Чистая прибыль (Наценка)' : 'Sof foyda (Ustama)'}
              </h3>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem', fontSize: '0.8125rem' }}>
                <span style={{ color: 'var(--foreground-muted)' }}>{language === 'ru' ? 'Получено прибыли:' : 'Olingan foyda:'}</span>
                <span style={{ fontWeight: 700, color: 'var(--color-success)' }}>
                  {formatAmount(kpi.collectedProfit)} ({formatPercent(kpi.dueProfit > 0 ? (kpi.collectedProfit / kpi.dueProfit) * 100 : 0)})
                </span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.75rem', fontSize: '0.8125rem' }}>
                <span style={{ color: 'var(--foreground-muted)' }}>{language === 'ru' ? 'Осталось собрать:' : 'Qolgan yig\'ish:'}</span>
                <span style={{ fontWeight: 700 }}>
                  {formatAmount(Math.max(0, kpi.dueProfit - kpi.collectedProfit))}
                </span>
              </div>
              {/* Progress Bar */}
              <div style={{ width: '100%', height: '8px', background: 'rgba(255,255,255,0.05)', borderRadius: '4px', overflow: 'hidden' }}>
                <div style={{
                  width: `${kpi.dueProfit > 0 ? Math.min(100, (kpi.collectedProfit / kpi.dueProfit) * 100) : 0}%`,
                  height: '100%',
                  background: 'var(--color-success)',
                  borderRadius: '4px'
                }} />
              </div>
              <div style={{ fontSize: '0.6875rem', color: 'var(--foreground-muted)', marginTop: '0.5rem', textAlign: 'right' }}>
                {language === 'ru' ? 'Общее начислено:' : 'Jami hisoblangan:'} {formatAmount(kpi.dueProfit)}
              </div>
            </div>
          </div>

          {/* Table */}
          <div className="glass-card" style={{ overflow: 'hidden' }}>
            <div style={{ padding: '1rem 1.25rem', borderBottom: '1px solid var(--border)' }}>
              <h2 style={{ fontSize: '0.9375rem', fontWeight: 700, fontFamily: 'var(--font-heading)' }}>
                {language === 'ru' ? 'Детали платежей за период' : 'Davr uchun to\'lovlar tafsilotlari'}
              </h2>
              <span style={{ fontSize: '0.75rem', color: 'var(--foreground-muted)' }}>
                {formatDate(startDate)} — {formatDate(endDate)} • {rangePayments.length} {language === 'ru' ? 'записей' : 'ta yozuv'}
              </span>
            </div>

            <div style={{ overflowX: 'auto' }}>
              <table className="data-table">
                <thead>
                  <tr>
                    <th>ID</th>
                    <th>{t('deals.col_client')}</th>
                    <th>{t('deals.col_product')}</th>
                    <th>{language === 'ru' ? 'Месяц' : 'Oy'}</th>
                    <th>{language === 'ru' ? 'Сумма (USD)' : 'Summa (USD)'}</th>
                    <th>{language === 'ru' ? 'Тело долга (USD)' : 'Qarz tanasi (USD)'}</th>
                    <th>{language === 'ru' ? 'Прибыль (USD)' : 'Foyda (USD)'}</th>
                    <th>{t('deals.col_status')}</th>
                    <th>{language === 'ru' ? 'Дата' : 'Sana'}</th>
                    <th>{language === 'ru' ? 'Продление' : 'Uzaytirish'}</th>
                    <th>{t('db.overdues')}</th>
                  </tr>
                </thead>
                <tbody>
                  {rangePayments.map(payment => {
                    const deal = state.deals.find(d => d.id === payment.dealId);
                    if (!deal) return null;

                    const costPrice = deal.costPrice || 0;
                    const totalAmount = deal.totalAmount || 1;
                    const bodyRatio = costPrice / totalAmount;
                    const profitRatio = (totalAmount - costPrice) / totalAmount;

                    const bodyAmount = payment.amount * bodyRatio;
                    const profitAmount = payment.amount * profitRatio;

                    return (
                      <tr key={payment.id}>
                        <td style={{ fontWeight: 600, fontFamily: 'var(--font-heading)', color: 'var(--primary)' }}>{deal.id}</td>
                        <td>{deal.client}</td>
                        <td style={{ color: 'var(--foreground-muted)', maxWidth: '140px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{deal.product}</td>
                        <td>{payment.monthNumber}</td>
                        <td style={{ fontWeight: 600, fontFamily: 'var(--font-heading)' }}>{formatAmount(payment.amount)}</td>
                        <td style={{ color: 'var(--primary)', fontWeight: 600 }}>{formatAmount(bodyAmount)}</td>
                        <td style={{ color: 'var(--color-success)', fontWeight: 600 }}>{formatAmount(profitAmount)}</td>
                        <td><StatusBadge status={payment.status} /></td>
                        <td style={{ fontSize: '0.8125rem', color: 'var(--foreground-muted)' }}>{payment.paidDate ? formatDate(payment.paidDate) : formatDate(payment.dueDate)}</td>
                        <td style={{ fontSize: '0.8125rem', color: payment.extendedDate ? '#60a5fa' : 'var(--foreground-muted)' }}>{payment.extendedDate ? formatDate(payment.extendedDate) : '—'}</td>
                        <td>{payment.overdueDays && payment.overdueDays > 0 ? <span style={{ color: '#f87171', fontWeight: 600, fontSize: '0.8125rem' }}>{payment.overdueDays} {t('common.days')}</span> : '—'}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {rangePayments.length === 0 && (
              <div style={{ padding: '3rem', textAlign: 'center', color: 'var(--foreground-muted)' }}>
                {language === 'ru' ? 'Нет платежей за выбранный период' : 'Tanlangan davr uchun to\'lovlar yo\'q'}
              </div>
            )}
          </div>
        </>
      ) : (
        <>
          {/* Forecast filters */}
          <div className="glass-card" style={{ padding: '1rem 1.25rem', marginBottom: '1.5rem', display: 'flex', alignItems: 'flex-end', gap: '1rem', flexWrap: 'wrap' }}>
            <div>
              <label style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--foreground-muted)', display: 'block', marginBottom: '0.375rem' }}>
                {language === 'ru' ? 'Месяц' : 'Oy'}
              </label>
              <select 
                className="input-field" 
                value={selectedMonth} 
                onChange={e => setSelectedMonth(Number(e.target.value))} 
                style={{ width: '160px', height: '38px' }}
              >
                {monthsList.map(m => (
                  <option key={m.value} value={m.value}>{m.label}</option>
                ))}
              </select>
            </div>
            <div>
              <label style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--foreground-muted)', display: 'block', marginBottom: '0.375rem' }}>
                {language === 'ru' ? 'Год' : 'Yil'}
              </label>
              <select 
                className="input-field" 
                value={selectedYear} 
                onChange={e => setSelectedYear(Number(e.target.value))} 
                style={{ width: '120px', height: '38px' }}
              >
                {availableYears.map(y => (
                  <option key={y} value={y}>{y}</option>
                ))}
              </select>
            </div>
            <div>
              <label style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--foreground-muted)', display: 'block', marginBottom: '0.375rem' }}>
                {language === 'ru' ? 'Агент' : 'Agent'}
              </label>
              <select 
                className="input-field" 
                value={selectedAgentId} 
                onChange={e => setSelectedAgentId(e.target.value)} 
                disabled={agent.role !== 'admin'}
                style={{ width: '200px', height: '38px' }}
              >
                {agent.role === 'admin' ? (
                  <>
                    <option value="all">{language === 'ru' ? 'Все агенты' : 'Barcha agentlar'}</option>
                    {agents.map(a => (
                      <option key={a.id} value={a.id}>{a.name}</option>
                    ))}
                  </>
                ) : (
                  <option value={agent.id}>{agent.name}</option>
                )}
              </select>
            </div>
            <div style={{ flex: 1 }} />
            <button 
              className="btn-primary" 
              onClick={handleExportForecast}
              disabled={filteredPayments.length === 0}
            >
              <Download size={16} />
              {language === 'ru' ? 'Экспорт прогноза (CSV)' : 'Prognozni eksport qilish (CSV)'}
            </button>
          </div>

          {/* Forecast KPI Cards */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1rem', marginBottom: '1.5rem' }}>
            <KPICard 
              label={language === 'ru' ? 'План сборов' : 'Yig\'ish rejasi'} 
              value={formatAmount(forecastKPI.totalPlan)} 
              subtitle={formatAmountUZSWithRate(forecastKPI.totalPlan, state.uzsRate)}
              icon={<CreditCard size={20} />} 
              accentColor="var(--primary)" 
            />
            <KPICard 
              label={language === 'ru' ? 'Ожидаемый возврат капитала (TANI)' : 'Kutilayotgan kapital qaytishi (TANI)'} 
              value={formatAmount(forecastKPI.totalTani)} 
              subtitle={formatAmountUZSWithRate(forecastKPI.totalTani, state.uzsRate)}
              icon={<TrendingUp size={20} />} 
              accentColor="var(--color-info)" 
            />
            <KPICard 
              label={language === 'ru' ? 'Ожидаемая прибыль (FOYDA)' : 'Kutilayotgan foyda (FOYDA)'} 
              value={formatAmount(forecastKPI.totalFoyda)} 
              subtitle={formatAmountUZSWithRate(forecastKPI.totalFoyda, state.uzsRate)}
              icon={<DollarSign size={20} />} 
              accentColor="var(--color-success)" 
            />
            <KPICard 
              label={language === 'ru' ? 'Факт сборов' : 'Haqiqiy yig\'im'} 
              value={formatAmount(forecastKPI.totalPaidFact)} 
              subtitle={formatAmountUZSWithRate(forecastKPI.totalPaidFact, state.uzsRate)}
              icon={<CheckCircle size={20} />} 
              accentColor="var(--color-success)" 
            />
          </div>

          {/* Detailed Forecast Table */}
          <div className="glass-card" style={{ overflow: 'hidden' }}>
            <div style={{ padding: '1rem 1.25rem', borderBottom: '1px solid var(--border)' }}>
              <h2 style={{ fontSize: '0.9375rem', fontWeight: 700, fontFamily: 'var(--font-heading)' }}>
                {language === 'ru' ? 'Детали прогноза платежей' : 'To\'lovlar prognozi tafsilotlari'}
              </h2>
              <span style={{ fontSize: '0.75rem', color: 'var(--foreground-muted)' }}>
                {monthsList[selectedMonth].label} {selectedYear} • {filteredPayments.length} {language === 'ru' ? 'записей' : 'ta yozuv'}
              </span>
            </div>

            <div style={{ overflowX: 'auto' }}>
              <table className="data-table">
                <thead>
                  <tr>
                    <th style={{ width: '40px', textAlign: 'center' }}>N</th>
                    <th>{language === 'ru' ? 'Агент' : 'Agent'}</th>
                    <th>{language === 'ru' ? 'Клиент' : 'Mijoz'}</th>
                    <th>{language === 'ru' ? 'Товар' : 'Mahsulot'}</th>
                    <th>{language === 'ru' ? 'Реферал' : 'Kafillik beruvchi'}</th>
                    <th>{language === 'ru' ? 'Счетчик платежа' : 'To\'lov hisoblagichi'}</th>
                    <th>{language === 'ru' ? 'Дата' : 'Sana'}</th>
                    <th>{language === 'ru' ? 'Общий Платеж' : 'Umumiy to\'lov'}</th>
                    <th>{language === 'ru' ? 'Тело долга (Tani)' : 'Qarz tanasi (Tani)'}</th>
                    <th>{language === 'ru' ? 'Прибыль (Foyda)' : 'Sof foyda (Foyda)'}</th>
                    <th style={{ width: '100px' }}>{language === 'ru' ? 'Статус' : 'Status'}</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredPayments.map((p, idx) => {
                    const deal = state.deals.find(d => d.id === p.dealId);
                    if (!deal) return null;

                    const agentName = agentMap[deal.agentId] || deal.agentId;
                    const referralText = deal.referral 
                      ? `${deal.referral.name} (${deal.referral.relation})` 
                      : '—';

                    const counterText = `${p.monthNumber} ${language === 'ru' ? 'из' : 'dan'} ${deal.months}`;

                    let tani = p.principalAmount || 0;
                    let foyda = p.profitAmount || 0;

                    if (tani === 0 && foyda === 0) {
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

                    return (
                      <tr key={p.id}>
                        <td style={{ textAlign: 'center' }}>{idx + 1}</td>
                        <td style={{ fontWeight: 500 }}>{agentName}</td>
                        <td style={{ fontWeight: 600 }}>{deal.client}</td>
                        <td style={{ color: 'var(--foreground-muted)', maxWidth: '140px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{deal.product}</td>
                        <td style={{ fontSize: '0.8125rem', color: 'var(--foreground-muted)' }}>{referralText}</td>
                        <td style={{ textAlign: 'center' }}>{counterText}</td>
                        <td style={{ fontSize: '0.8125rem', color: 'var(--foreground-muted)' }}>{formatDate(p.dueDate)}</td>
                        <td style={{ fontWeight: 600, fontFamily: 'var(--font-heading)' }}>
                          <div>{formatAmount(p.amount)}</div>
                          <div style={{ fontSize: '0.6875rem', color: 'var(--foreground-muted)', fontWeight: 400 }}>
                            {formatAmountUZSWithRate(p.amount, state.uzsRate)}
                          </div>
                        </td>
                        <td style={{ color: 'var(--primary)', fontWeight: 600, fontFamily: 'var(--font-heading)' }}>
                          <div>{formatAmount(tani)}</div>
                          <div style={{ fontSize: '0.6875rem', color: 'var(--foreground-muted)', fontWeight: 400 }}>
                            {formatAmountUZSWithRate(tani, state.uzsRate)}
                          </div>
                        </td>
                        <td style={{ color: 'var(--color-success)', fontWeight: 600, fontFamily: 'var(--font-heading)' }}>
                          <div>{formatAmount(foyda)}</div>
                          <div style={{ fontSize: '0.6875rem', color: 'var(--foreground-muted)', fontWeight: 400 }}>
                            {formatAmountUZSWithRate(foyda, state.uzsRate)}
                          </div>
                        </td>
                        <td>
                          <StatusBadge status={p.status} />
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {filteredPayments.length === 0 && (
              <div style={{ padding: '3rem', textAlign: 'center', color: 'var(--foreground-muted)' }}>
                {language === 'ru' ? 'Нет прогнозируемых платежей за этот месяц' : 'Ushbu oy uchun kutilayotgan to\'lovlar yo\'q'}
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}
