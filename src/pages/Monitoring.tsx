import { useState, useMemo } from 'react';
import { useApp } from '@/lib/store';
import { useAuth } from '@/lib/auth';
import { useLanguage } from '@/lib/language';
import PaymentCard from '@/components/shared/PaymentCard';
import DealModal from '@/components/shared/DealModal';
import type { Payment } from '@/types';
import { Activity, AlertTriangle, Clock, CalendarCheck } from 'lucide-react';

export default function Monitoring({ hideHeader = false }: { hideHeader?: boolean }) {
  const { agent } = useAuth();
  const { t, language } = useLanguage();
  const { getOverduePayments, getTodayPayments, getUpcomingPayments } = useApp();
  const [selectedDealId, setSelectedDealId] = useState<string | null>(null);

  if (!agent) return null;

  const overduePayments = useMemo(() => getOverduePayments(agent.id), [getOverduePayments, agent.id]);
  const todayPayments = useMemo(() => getTodayPayments(agent.id), [getTodayPayments, agent.id]);
  const upcomingPayments = useMemo(() => getUpcomingPayments(agent.id), [getUpcomingPayments, agent.id]);

  const handlePaymentClick = (payment: Payment) => {
    setSelectedDealId(payment.dealId);
  };

  return (
    <div style={{ maxWidth: '1200px' }}>
      {!hideHeader && (
        <div style={{ marginBottom: '1.5rem' }}>
          <h1 style={{ fontSize: '1.5rem', fontWeight: 700, marginBottom: '0.25rem' }}>
            <Activity size={22} style={{ display: 'inline', verticalAlign: 'middle', marginRight: '0.5rem' }} />
            {t('monitoring.title')}
          </h1>
          <p style={{ fontSize: '0.875rem', color: 'var(--foreground-muted)' }}>
            {t('monitoring.subtitle')}
          </p>
        </div>
      )}

      {/* Summary badges */}
      <div style={{ display: 'flex', gap: '1rem', marginBottom: '2rem', flexWrap: 'wrap' }}>
        <SummaryBadge icon={<AlertTriangle size={16} />} label={t('db.overdues')} count={overduePayments.length} color="var(--color-danger)" bgColor="rgba(239, 68, 68, 0.1)" />
        <SummaryBadge icon={<CalendarCheck size={16} />} label={language === 'ru' ? 'Сегодня' : 'Bugun'} count={todayPayments.length} color="var(--color-warning)" bgColor="rgba(245, 158, 11, 0.1)" />
        <SummaryBadge icon={<Clock size={16} />} label={language === 'ru' ? 'Ближайшие 7 дн.' : 'Keyingi 7 kun'} count={upcomingPayments.length} color="var(--color-info)" bgColor="rgba(59, 130, 246, 0.1)" />
      </div>

      {/* Overdue */}
      <Section title={t('db.overdue_payments')} subtitle={language === 'ru' ? 'Требуют немедленного внимания' : 'Zudlik bilan e\'tibor talab etiladi'} icon={<AlertTriangle size={18} style={{ color: 'var(--color-danger)' }} />} count={overduePayments.length} accentColor="var(--color-danger)">
        {overduePayments.length === 0 ? (
          <EmptyState message={language === 'ru' ? 'Нет просроченных платежей 🎉' : 'Muddati o\'tgan to\'lovlar yo\'q 🎉'} />
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '0.75rem' }}>
            {overduePayments.map(p => <PaymentCard key={p.id} payment={p} onClick={handlePaymentClick} />)}
          </div>
        )}
      </Section>

      {/* Today */}
      <Section title={language === 'ru' ? 'Платежи на сегодня' : 'Bugungi to\'lovlar'} subtitle={language === 'ru' ? 'Ожидаемые платежи сегодня' : 'Bugun kutilayotgan to\'lovlar'} icon={<CalendarCheck size={18} style={{ color: 'var(--color-warning)' }} />} count={todayPayments.length} accentColor="var(--color-warning)">
        {todayPayments.length === 0 ? (
          <EmptyState message={language === 'ru' ? 'Нет платежей на сегодня' : 'Bugun uchun to\'lovlar yo\'q'} />
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '0.75rem' }}>
            {todayPayments.map(p => <PaymentCard key={p.id} payment={p} onClick={handlePaymentClick} />)}
          </div>
        )}
      </Section>

      {/* Upcoming */}
      <Section title={language === 'ru' ? 'Ближайшие платежи' : 'Yaqin oradagi to\'lovlar'} subtitle={language === 'ru' ? 'В течение 7 дней' : '7 kun ichida'} icon={<Clock size={18} style={{ color: 'var(--color-info)' }} />} count={upcomingPayments.length} accentColor="var(--color-info)">
        {upcomingPayments.length === 0 ? (
          <EmptyState message={language === 'ru' ? 'Нет ближайших платежей' : 'Yaqin oradagi to\'lovlar yo\'q'} />
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '0.75rem' }}>
            {upcomingPayments.map(p => <PaymentCard key={p.id} payment={p} onClick={handlePaymentClick} />)}
          </div>
        )}
      </Section>

      <DealModal dealId={selectedDealId} onClose={() => setSelectedDealId(null)} />
    </div>
  );
}

function Section({ title, subtitle, icon, count, accentColor, children }: { title: string; subtitle: string; icon: React.ReactNode; count: number; accentColor: string; children: React.ReactNode }) {
  return (
    <div style={{ marginBottom: '2rem' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.625rem' }}>
          {icon}
          <div>
            <h2 style={{ fontSize: '1rem', fontWeight: 700 }}>{title}</h2>
            <span style={{ fontSize: '0.75rem', color: 'var(--foreground-muted)' }}>{subtitle}</span>
          </div>
        </div>
        <span style={{ background: `${accentColor}20`, color: accentColor, padding: '0.25rem 0.75rem', borderRadius: '9999px', fontSize: '0.8125rem', fontWeight: 700, fontFamily: 'var(--font-heading)' }}>
          {count}
        </span>
      </div>
      {children}
    </div>
  );
}

function SummaryBadge({ icon, label, count, color, bgColor }: { icon: React.ReactNode; label: string; count: number; color: string; bgColor: string }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '0.625rem', padding: '0.625rem 1rem', background: bgColor, border: `1px solid ${color}30`, borderRadius: 'var(--radius)' }}>
      <span style={{ color }}>{icon}</span>
      <span style={{ fontSize: '0.8125rem', color: 'var(--foreground-muted)' }}>{label}</span>
      <span style={{ fontSize: '1.125rem', fontWeight: 700, fontFamily: 'var(--font-heading)', color }}>{count}</span>
    </div>
  );
}

function EmptyState({ message }: { message: string }) {
  return (
    <div className="glass-card" style={{ padding: '2rem', textAlign: 'center', color: 'var(--foreground-muted)', fontSize: '0.875rem' }}>
      {message}
    </div>
  );
}
