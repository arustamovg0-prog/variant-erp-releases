import { useState } from 'react';
import { useApp } from '@/lib/store';
import { useAuth } from '@/lib/auth';
import { useLanguage } from '@/lib/language';
import { formatAmount, formatAmountUZSWithRate, formatPercent, calculateRemaining } from '@/lib/calculations';
import KPICard from '@/components/shared/KPICard';
import PaymentCard from '@/components/shared/PaymentCard';
import StatusBadge from '@/components/shared/StatusBadge';
import DealModal from '@/components/shared/DealModal';
import type { Payment } from '@/types';
import {
  Briefcase,
  DollarSign,
  TrendingUp,
  AlertTriangle,
  CheckCircle,
  Clock,
  ArrowRight,
} from 'lucide-react';

export default function Dashboard() {
  const { getKPIStats, getOverduePayments, getUpcomingPayments, getAgentDeals, state } = useApp();
  const { agent } = useAuth();
  const { t, language } = useLanguage();
  const [selectedDealId, setSelectedDealId] = useState<string | null>(null);

  if (!agent) return null;

  const kpi = getKPIStats(agent.id);
  const overduePayments = getOverduePayments(agent.id).slice(0, 5);
  const upcomingPayments = getUpcomingPayments(agent.id).slice(0, 5);
  const criticalDeals = getAgentDeals(agent.id).filter(d => d.status === 'overdue');

  const handlePaymentClick = (payment: Payment) => {
    setSelectedDealId(payment.dealId);
  };

  return (
    <div style={{ maxWidth: '1200px' }}>
      {/* Header */}
      <div style={{ marginBottom: '1.5rem' }}>
        <h1 style={{ fontSize: '1.5rem', fontWeight: 700, marginBottom: '0.25rem' }}>
          {t('db.title')}
        </h1>
        <p style={{ fontSize: '0.875rem', color: 'var(--foreground-muted)' }}>
          {t('db.subtitle')} {agent.name} • {new Date().toLocaleDateString(language === 'ru' ? 'ru-RU' : 'uz-UZ', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
        </p>
      </div>

      {/* KPI Grid */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
          gap: '1rem',
          marginBottom: '1.5rem',
        }}
      >
        <KPICard
          label={t('db.total_deals')}
          value={String(kpi.totalDeals)}
          subtitle={t('db.active_portfolios')}
          icon={<Briefcase size={20} />}
          accentColor="var(--primary)"
        />
        <KPICard
          label={t('db.portfolio_amount')}
          value={formatAmount(kpi.portfolioAmount)}
          subtitle={formatAmountUZSWithRate(kpi.portfolioAmount, state.uzsRate)}
          icon={<DollarSign size={20} />}
          accentColor="var(--color-info)"
        />
        <KPICard
          label={t('db.paid')}
          value={formatAmount(kpi.paidAmount)}
          subtitle={`${t('db.remaining')} ${formatAmount(kpi.remainingAmount)}`}
          icon={<CheckCircle size={20} />}
          accentColor="var(--color-success)"
        />
        <KPICard
          label={t('db.collection')}
          value={formatPercent(kpi.collectionRate)}
          subtitle={`${kpi.overduePayments} ${t('db.overdues_count')}`}
          icon={<TrendingUp size={20} />}
          accentColor={kpi.collectionRate >= 80 ? 'var(--color-success)' : 'var(--color-warning)'}
        />
      </div>

      {/* Secondary KPI */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
          gap: '1rem',
          marginBottom: '2rem',
        }}
      >
        <KPICard
          label={t('db.overdues')}
          value={String(kpi.overduePayments)}
          subtitle={formatAmount(kpi.overdueAmount)}
          icon={<AlertTriangle size={20} />}
          accentColor="var(--color-danger)"
        />
        <KPICard
          label={t('db.upcoming_7')}
          value={String(kpi.upcomingPayments)}
          subtitle={t('db.require_payment')}
          icon={<Clock size={20} />}
          accentColor="var(--color-warning)"
        />
      </div>

      {/* Two columns */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem' }}>
        {/* Overdue */}
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
            <h2 style={{ fontSize: '1rem', fontWeight: 700 }}>
              <AlertTriangle size={16} style={{ display: 'inline', verticalAlign: 'middle', marginRight: '0.5rem', color: 'var(--color-danger)' }} />
              {t('db.overdue_payments')}
            </h2>
            <span style={{ fontSize: '0.75rem', color: 'var(--foreground-muted)' }}>
              {t('db.top_overdue')} {overduePayments.length}
            </span>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            {overduePayments.length === 0 ? (
              <div className="glass-card" style={{ padding: '2rem', textAlign: 'center', color: 'var(--foreground-muted)' }}>
                {t('db.no_overdue')}
              </div>
            ) : (
              overduePayments.map(p => (
                <PaymentCard key={p.id} payment={p} onClick={handlePaymentClick} compact />
              ))
            )}
          </div>
        </div>

        {/* Critical deals */}
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
            <h2 style={{ fontSize: '1rem', fontWeight: 700 }}>
              <Briefcase size={16} style={{ display: 'inline', verticalAlign: 'middle', marginRight: '0.5rem', color: 'var(--color-warning)' }} />
              {t('db.critical_deals')}
            </h2>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            {criticalDeals.length === 0 ? (
              <div className="glass-card" style={{ padding: '2rem', textAlign: 'center', color: 'var(--foreground-muted)' }}>
                {t('db.no_critical')}
              </div>
            ) : (
              criticalDeals.map(deal => (
                <div
                  key={deal.id}
                  className="glass-card-interactive"
                  style={{ padding: '1rem' }}
                  onClick={() => setSelectedDealId(deal.id)}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                    <span style={{ fontSize: '0.875rem', fontWeight: 600, fontFamily: 'var(--font-heading)' }}>
                      {deal.client}
                    </span>
                    <StatusBadge status={deal.status} />
                  </div>
                  <div style={{ fontSize: '0.8125rem', color: 'var(--foreground-muted)', marginBottom: '0.375rem' }}>
                    {deal.product}
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontSize: '0.75rem', color: 'var(--foreground-muted)' }}>
                      {t('deals.kpi_remaining')}: {formatAmount(calculateRemaining(deal, state.payments))}
                    </span>
                    <ArrowRight size={14} style={{ color: 'var(--primary)' }} />
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* Upcoming */}
      {upcomingPayments.length > 0 && (
        <div style={{ marginTop: '2rem' }}>
          <h2 style={{ fontSize: '1rem', fontWeight: 700, marginBottom: '1rem' }}>
            <Clock size={16} style={{ display: 'inline', verticalAlign: 'middle', marginRight: '0.5rem', color: 'var(--color-warning)' }} />
            {t('db.upcoming_payments_7')}
          </h2>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '0.75rem' }}>
            {upcomingPayments.map(p => (
              <PaymentCard key={p.id} payment={p} onClick={handlePaymentClick} compact />
            ))}
          </div>
        </div>
      )}

      {selectedDealId && <DealModal dealId={selectedDealId} onClose={() => setSelectedDealId(null)} />}
    </div>
  );
}
