import { useState, useEffect } from 'react';
import type { Deal, Payment } from '@/types';
import { useApp } from '@/lib/store';
import { useLanguage } from '@/lib/language';
import { formatAmount, formatAmountUZS, formatDate, calculateRemaining } from '@/lib/calculations';
import { generateReminderMessage, getWhatsAppLink, getTelegramLink } from '@/lib/messages';
import StatusBadge from './StatusBadge';
import ExtendPaymentModal from './ExtendPaymentModal';
import AcceptPaymentModal from './AcceptPaymentModal';
import {
  X,
  Phone,
  User,
  Package,
  Calendar,
  DollarSign,
  Clock,
  AlertTriangle,
  FileText,
  History,
  UserCheck,
  CalendarClock,
  MessageCircle,
  Send,
  Check,
} from 'lucide-react';

interface DealModalProps {
  dealId: string | null;
  onClose: () => void;
}

export default function DealModal({ dealId, onClose }: DealModalProps) {
  const [activeTab, setActiveTab] = useState<'details' | 'history'>('details');
  const [extendingPayment, setExtendingPayment] = useState<Payment | null>(null);
  const [acceptingPayment, setAcceptingPayment] = useState<Payment | null>(null);
  const { getDealById, getDealPayments, updatePaymentInSupabase } = useApp();
  const { t, language } = useLanguage();

  // Reset to details tab when opening a new deal
  useEffect(() => {
    if (dealId) {
      setActiveTab('details');
    }
  }, [dealId]);

  if (!dealId) return null;

  const deal = getDealById(dealId);
  if (!deal) return null;

  const payments = getDealPayments(dealId);
  const remaining = calculateRemaining(deal, payments);
  const currentPayment = payments.find(
    p => p.status === 'overdue' || p.status === 'extended' || p.status === 'pending'
  );

  return (
    <>
      <div className="modal-overlay" onClick={onClose}>
        <div className="modal-content" onClick={e => e.stopPropagation()}>
          {/* Header */}
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              padding: '1rem 1.25rem',
              borderBottom: '1px solid var(--border)',
            }}
          >
            <div>
              <h2
                style={{
                  fontSize: '1rem',
                  fontWeight: 700,
                  fontFamily: 'var(--font-heading)',
                  color: 'var(--foreground)',
                }}
              >
                {language === 'ru' ? 'Сделка' : 'Shartnoma'} {deal.id}
              </h2>
              <span style={{ fontSize: '0.75rem', color: 'var(--foreground-muted)' }}>
                {deal.product}
              </span>
            </div>
            <button
              onClick={onClose}
              style={{
                background: 'var(--muted)',
                border: '1px solid var(--border)',
                borderRadius: '8px',
                padding: '0.375rem',
                cursor: 'pointer',
                color: 'var(--foreground-muted)',
                display: 'flex',
                transition: 'all 0.15s ease',
              }}
            >
              <X size={16} />
            </button>
          </div>

          {/* Tabs */}
          <div
            style={{
              display: 'flex',
              gap: '0.5rem',
              padding: '0.75rem 1.25rem',
              borderBottom: '1px solid var(--border)',
            }}
          >
            <button
              className={`tab-btn ${activeTab === 'details' ? 'tab-btn-active' : 'tab-btn-inactive'}`}
              onClick={() => setActiveTab('details')}
            >
              <FileText size={14} style={{ display: 'inline', verticalAlign: 'middle', marginRight: '0.375rem' }} />
              {language === 'ru' ? 'Детали' : 'Tafsilotlar'}
            </button>
            <button
              className={`tab-btn ${activeTab === 'history' ? 'tab-btn-active' : 'tab-btn-inactive'}`}
              onClick={() => setActiveTab('history')}
            >
              <History size={14} style={{ display: 'inline', verticalAlign: 'middle', marginRight: '0.375rem' }} />
              {language === 'ru' ? 'История' : 'Tarix'}
            </button>
          </div>

          {/* Content */}
          <div
            style={{
              padding: '1.25rem',
              overflowY: 'auto',
              maxHeight: 'calc(85vh - 140px)',
            }}
          >
            {activeTab === 'details' ? (
              <DetailsTab deal={deal} remaining={remaining} currentPayment={currentPayment} onExtend={setExtendingPayment} />
            ) : (
              <HistoryTab 
                payments={payments} 
                deal={deal} 
                onExtend={setExtendingPayment} 
                onAcceptPayment={(payment) => setAcceptingPayment(payment)}
              />
            )}
          </div>
        </div>
      </div>
      {extendingPayment && <ExtendPaymentModal payment={extendingPayment} onClose={() => setExtendingPayment(null)} />}
      {acceptingPayment && <AcceptPaymentModal payment={acceptingPayment} onClose={() => setAcceptingPayment(null)} />}
    </>
  );
}

// ─── Details Tab ──────────────────────────────────────────

function DetailsTab({
  deal,
  remaining,
  currentPayment,
  onExtend,
}: {
  deal: Deal;
  remaining: number;
  currentPayment?: Payment;
  onExtend: (payment: Payment) => void;
}) {
  const { t, language } = useLanguage();
  const progress = deal.months > 0 ? (deal.paidMonths / deal.months) * 100 : 0;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
      {/* Client info */}
      <div className="glass-card" style={{ padding: '1rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <User size={16} style={{ color: 'var(--primary)' }} />
            <span style={{ fontSize: '0.9375rem', fontWeight: 600, fontFamily: 'var(--font-heading)' }}>
              {deal.client}
            </span>
          </div>
          <StatusBadge status={deal.status} />
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
          <Phone size={14} style={{ color: 'var(--foreground-muted)' }} />
          <span style={{ fontSize: '0.8125rem', color: 'var(--foreground-muted)' }}>{deal.phone}</span>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <Package size={14} style={{ color: 'var(--foreground-muted)' }} />
          <span style={{ fontSize: '0.8125rem', color: 'var(--foreground-muted)' }}>{deal.product}</span>
        </div>
      </div>

      {/* Financial details */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
        <InfoBlock icon={<DollarSign size={14} />} label={t('deals.field_monthly')} value={formatAmount(deal.monthlyAmount)} subValue={formatAmountUZS(deal.monthlyAmount)} />
        <InfoBlock icon={<DollarSign size={14} />} label={language === 'ru' ? 'Общая сумма' : 'Umumiy summa'} value={formatAmount(deal.totalAmount)} subValue={formatAmountUZS(deal.totalAmount)} />
        <InfoBlock icon={<Clock size={14} />} label={t('deals.col_term')} value={`${deal.months} ${language === 'ru' ? 'мес.' : 'oy'}`} />
        <InfoBlock icon={<Clock size={14} />} label={t('db.paid')} value={`${deal.paidMonths} ${language === 'ru' ? 'мес.' : 'oy'}`} />
      </div>

      {/* Progress */}
      <div className="glass-card" style={{ padding: '1rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
          <span style={{ fontSize: '0.75rem', color: 'var(--foreground-muted)', fontWeight: 600 }}>{language === 'ru' ? 'Прогресс' : 'Jarayon'}</span>
          <span style={{ fontSize: '0.75rem', color: 'var(--foreground)', fontWeight: 600 }}>
            {progress.toFixed(0)}%
          </span>
        </div>
        <div className="progress-bar">
          <div
            className="progress-fill"
            style={{
              width: `${progress}%`,
              background: progress >= 100
                ? 'var(--color-success)'
                : 'linear-gradient(90deg, var(--primary), var(--color-info))',
            }}
          />
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '0.5rem' }}>
          <span style={{ fontSize: '0.75rem', color: 'var(--foreground-muted)' }}>
            {t('deals.kpi_remaining')}: {formatAmount(remaining)} ({formatAmountUZS(remaining)})
          </span>
          <span style={{ fontSize: '0.75rem', color: 'var(--foreground-muted)' }}>
            {deal.paidMonths} / {deal.months}
          </span>
        </div>
      </div>

      {/* Current payment info */}
      {currentPayment && (
        <div className="glass-card" style={{ padding: '1rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
            <div style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--foreground-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              {language === 'ru' ? 'Текущий платёж' : 'Joriy to\'lov'}
            </div>
            {(currentPayment.status === 'pending' || currentPayment.status === 'overdue') && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onExtend(currentPayment);
                }}
                className="btn btn-secondary"
                style={{ padding: '0.25rem 0.5rem', fontSize: '0.6875rem', display: 'flex', gap: '0.25rem', alignItems: 'center' }}
              >
                <CalendarClock size={10} />
                {language === 'ru' ? 'Продлить' : 'Uzaytirish'}
              </button>
            )}
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem' }}>
            <div>
              <span style={{ fontSize: '0.6875rem', color: 'var(--foreground-muted)' }}>{language === 'ru' ? 'Статус' : 'Status'}</span>
              <div style={{ marginTop: '0.25rem' }}><StatusBadge status={currentPayment.status} /></div>
            </div>
            <div>
              <span style={{ fontSize: '0.6875rem', color: 'var(--foreground-muted)' }}>{language === 'ru' ? 'Дата платежа' : 'To\'lov sanasi'}</span>
              <div style={{ fontSize: '0.8125rem', fontWeight: 600, marginTop: '0.25rem' }}>
                {formatDate(currentPayment.dueDate)}
              </div>
            </div>
            {currentPayment.extendedDate && (
              <div>
                <span style={{ fontSize: '0.6875rem', color: 'var(--foreground-muted)' }}>{language === 'ru' ? 'Дата продления' : 'Uzaytirilgan sana'}</span>
                <div style={{ fontSize: '0.8125rem', fontWeight: 600, marginTop: '0.25rem', color: '#60a5fa' }}>
                  {formatDate(currentPayment.extendedDate)}
                </div>
              </div>
            )}
            {currentPayment.overdueDays && currentPayment.overdueDays > 0 && (
              <div>
                <span style={{ fontSize: '0.6875rem', color: 'var(--foreground-muted)' }}>{t('db.overdues')}</span>
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.25rem',
                    fontSize: '0.8125rem',
                    fontWeight: 700,
                    marginTop: '0.25rem',
                    color: '#f87171',
                  }}
                >
                  <AlertTriangle size={12} />
                  {currentPayment.overdueDays} {t('common.days')}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Referral */}
      {deal.referral && (
        <div className="glass-card" style={{ padding: '1rem' }}>
          <div style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--foreground-muted)', marginBottom: '0.5rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            {language === 'ru' ? 'Поручитель' : 'Kafillik'}
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <UserCheck size={14} style={{ color: 'var(--primary)' }} />
            <span style={{ fontSize: '0.8125rem', fontWeight: 600 }}>{deal.referral.name}</span>
            <span style={{ fontSize: '0.75rem', color: 'var(--foreground-muted)' }}>({deal.referral.relation})</span>
          </div>
          <div style={{ fontSize: '0.75rem', color: 'var(--foreground-muted)', marginTop: '0.25rem', paddingLeft: '1.375rem' }}>
            {deal.referral.phone}
          </div>
        </div>
      )}

      {/* Comment */}
      {deal.comment && (
        <div className="glass-card" style={{ padding: '1rem' }}>
          <div style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--foreground-muted)', marginBottom: '0.375rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            {t('deals.col_comment')}
          </div>
          <p style={{ fontSize: '0.8125rem', color: 'var(--foreground)', lineHeight: 1.5 }}>
            {deal.comment}
          </p>
        </div>
      )}

      {/* Call button */}
      <a
        href={`tel:${deal.phone.replace(/\s/g, '')}`}
        className="btn-success"
        style={{ textDecoration: 'none', width: '100%', padding: '0.75rem', justifyContent: 'center' }}
      >
        <Phone size={16} />
        {language === 'ru' ? 'Позвонить' : 'Qo\'ng\'iroq qilish'}
      </a>
    </div>
  );
}

// ─── History Tab ──────────────────────────────────────────

function HistoryTab({ 
  payments, 
  deal, 
  onExtend, 
  onAcceptPayment 
}: { 
  payments: Payment[], 
  deal: Deal, 
  onExtend: (payment: Payment) => void, 
  onAcceptPayment: (payment: Payment) => void 
}) {
  const { t, language } = useLanguage();
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
      {payments.map(payment => {
        const canPay = payment.status !== 'paid';
        const canExtend = payment.status === 'pending' || payment.status === 'overdue' || payment.status === 'extended';
        
        return (
          <div
            key={payment.id}
            className="glass-card"
            style={{
              padding: '0.75rem 1rem',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              borderColor:
                payment.status === 'overdue'
                  ? 'rgba(239, 68, 68, 0.3)'
                  : payment.status === 'extended'
                    ? 'rgba(59, 130, 246, 0.3)'
                    : undefined,
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
              {/* Month circle */}
              <div
                style={{
                  width: '32px',
                  height: '32px',
                  borderRadius: '50%',
                  background:
                    payment.status === 'paid'
                      ? 'rgba(16, 185, 129, 0.15)'
                      : payment.status === 'overdue'
                        ? 'rgba(239, 68, 68, 0.15)'
                        : payment.status === 'extended'
                          ? 'rgba(59, 130, 246, 0.15)'
                          : 'var(--muted)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '0.75rem',
                  fontWeight: 700,
                  fontFamily: 'var(--font-heading)',
                  color:
                    payment.status === 'paid'
                      ? '#34d399'
                      : payment.status === 'overdue'
                        ? '#f87171'
                        : payment.status === 'extended'
                          ? '#60a5fa'
                          : 'var(--foreground-muted)',
                  flexShrink: 0,
                }}
              >
                {payment.monthNumber}
              </div>

              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <span style={{ fontSize: '0.8125rem', fontWeight: 600 }}>{formatAmount(payment.amount)}</span>
                  <StatusBadge status={payment.status} />
                </div>
                <div style={{ fontSize: '0.75rem', color: 'var(--foreground-muted)', marginTop: '0.125rem' }}>
                  {payment.paidDate
                    ? `${language === 'ru' ? 'Оплачен' : 'To\'langan'} ${formatDate(payment.paidDate)}`
                    : `${language === 'ru' ? 'Срок' : 'Muddati'} ${formatDate(payment.dueDate)}`}
                  {payment.extendedDate && (
                    <span style={{ color: '#60a5fa' }}> → {language === 'ru' ? 'Продлён до' : 'Uzaytirilgan muddati'} {formatDate(payment.extendedDate)}</span>
                  )}
                </div>
              </div>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              {payment.overdueDays && payment.overdueDays > 0 && (
                <div
                  style={{
                    fontSize: '0.6875rem',
                    fontWeight: 700,
                    color: '#f87171',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.25rem',
                    flexShrink: 0,
                  }}
                >
                  <AlertTriangle size={11} />
                  {payment.overdueDays}{language === 'ru' ? 'д' : 'k'}
                </div>
              )}
              
              <a
                href={getWhatsAppLink(deal.phone, generateReminderMessage(deal.client, deal, payment, language))}
                target="_blank"
                rel="noopener noreferrer"
                className="btn btn-secondary"
                style={{ padding: '0.25rem', borderRadius: '4px', textDecoration: 'none', color: '#10b981', borderColor: 'rgba(16, 185, 129, 0.3)' }}
                title="WhatsApp"
              >
                <MessageCircle size={14} />
              </a>

              <button
                onClick={(e) => {
                  e.stopPropagation();
                  const text = generateReminderMessage(deal.client, deal, payment, language);
                  navigator.clipboard.writeText(text).then(() => {
                    window.open(getTelegramLink(deal.phone), '_blank');
                  });
                }}
                className="btn btn-secondary"
                style={{ padding: '0.25rem', borderRadius: '4px', color: '#3b82f6', borderColor: 'rgba(59, 130, 246, 0.3)' }}
                title="Telegram"
              >
                <Send size={14} />
              </button>

              {canPay && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onAcceptPayment(payment);
                  }}
                  className="btn btn-primary"
                  style={{ padding: '0.25rem', borderRadius: '4px', background: 'var(--color-success)', borderColor: 'var(--color-success)', color: '#fff' }}
                  title={language === 'ru' ? 'Оплатить' : 'To\'lash'}
                >
                  <Check size={14} />
                </button>
              )}
              {canExtend && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onExtend(payment);
                  }}
                  className="btn btn-secondary"
                  style={{ padding: '0.25rem', borderRadius: '4px' }}
                  title={language === 'ru' ? 'Продлить' : 'Uzaytirish'}
                >
                  <CalendarClock size={14} />
                </button>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ─── Helpers ──────────────────────────────────────────────

function InfoBlock({ icon, label, value, subValue }: { icon: React.ReactNode; label: string; value: string; subValue?: string }) {
  return (
    <div
      className="glass-card"
      style={{
        padding: '0.75rem',
        display: 'flex',
        flexDirection: 'column',
        gap: '0.25rem',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.375rem' }}>
        <span style={{ color: 'var(--foreground-muted)' }}>{icon}</span>
        <span style={{ fontSize: '0.6875rem', color: 'var(--foreground-muted)', fontWeight: 500 }}>{label}</span>
      </div>
      <span style={{ fontSize: '0.9375rem', fontWeight: 700, fontFamily: 'var(--font-heading)' }}>{value}</span>
      {subValue && <span style={{ fontSize: '0.6875rem', color: 'var(--foreground-muted)' }}>{subValue}</span>}
    </div>
  );
}
