import type { Payment } from '@/types';
import { useApp } from '@/lib/store';
import { useLanguage } from '@/lib/language';
import { formatAmount, formatAmountUZSWithRate, formatDate } from '@/lib/calculations';
import StatusBadge from './StatusBadge';
import { User, Calendar, AlertTriangle, CalendarClock } from 'lucide-react';

interface PaymentCardProps {
  payment: Payment;
  onClick: (payment: Payment) => void;
  onClientClick?: (clientName: string, clientPhone: string) => void;
  onExtendPayment?: (payment: Payment) => void;
  compact?: boolean;
}

export default function PaymentCard({ payment, onClick, onClientClick, onExtendPayment, compact }: PaymentCardProps) {
  const { state, getDealById } = useApp();
  const { language } = useLanguage();
  const deal = getDealById(payment.dealId);

  if (!deal) return null;

  const isOverdue = payment.status === 'overdue';
  const isExtended = payment.status === 'extended';
  const canExtend = payment.status === 'pending' || payment.status === 'overdue' || payment.status === 'extended';

  return (
    <div
      className={`glass-card-interactive ${isOverdue ? 'pulse-danger' : ''}`}
      onClick={() => onClick(payment)}
      style={{
        padding: compact ? '0.75rem 1rem' : '1rem 1.25rem',
        borderColor: isOverdue
          ? 'rgba(239, 68, 68, 0.4)'
          : isExtended
            ? 'rgba(59, 130, 246, 0.4)'
            : undefined,
        position: 'relative',
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.5rem' }}>
        <div 
          style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: onClientClick ? 'pointer' : 'inherit' }}
          onClick={(e) => {
            if (onClientClick) {
              e.stopPropagation();
              onClientClick(deal.client, deal.phone);
            }
          }}
          className={onClientClick ? 'hover-opacity' : ''}
        >
          <User size={14} style={{ color: onClientClick ? 'var(--primary)' : 'var(--foreground-muted)' }} />
          <span style={{ fontSize: '0.875rem', fontWeight: 600, fontFamily: 'var(--font-heading)', color: onClientClick ? 'var(--primary)' : 'inherit' }}>
            {deal.client}
          </span>
        </div>
        <StatusBadge status={payment.status} />
      </div>

      <div style={{ fontSize: '0.8125rem', color: 'var(--foreground-muted)', marginBottom: '0.25rem' }}>
        {deal.product}
      </div>
      
      {!compact && (
        <div style={{ fontSize: '0.75rem', color: 'var(--foreground-muted)', marginBottom: '0.75rem' }}>
          {language === 'ru' ? 'Общая сумма:' : 'Umumiy summa:'} <span style={{ color: 'var(--foreground)', fontWeight: 500 }}>{formatAmount(deal.totalAmount)}</span>
        </div>
      )}

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.375rem' }}>
          <Calendar size={12} style={{ color: 'var(--foreground-muted)' }} />
          <span style={{ fontSize: '0.75rem', color: 'var(--foreground-muted)' }}>
            {formatDate(payment.extendedDate || payment.dueDate)}
          </span>
          
          {canExtend && onExtendPayment && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                onExtendPayment(payment);
              }}
              style={{
                background: 'none',
                border: 'none',
                padding: '4px',
                cursor: 'pointer',
                color: 'var(--primary)',
                marginLeft: '4px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                borderRadius: '4px',
              }}
              className="hover-opacity"
              title={language === 'ru' ? 'Продлить платеж' : 'To\'lovni uzaytirish'}
            >
              <CalendarClock size={14} />
            </button>
          )}
        </div>

        <span
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'flex-end',
          }}
        >
          <span style={{
            fontSize: '0.9375rem',
            fontWeight: 700,
            fontFamily: 'var(--font-heading)',
            color: 'var(--foreground)',
          }}>
            {formatAmount(payment.amount)}
          </span>
          <span style={{ fontSize: '0.6875rem', color: 'var(--foreground-muted)' }}>
            {formatAmountUZSWithRate(payment.amount, state.uzsRate)}
          </span>
        </span>
      </div>

      {(isOverdue || isExtended) && payment.overdueDays && payment.overdueDays > 0 && (
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.375rem',
            marginTop: '0.5rem',
            padding: '0.25rem 0.5rem',
            background: 'rgba(239, 68, 68, 0.1)',
            borderRadius: '6px',
            fontSize: '0.75rem',
            color: '#f87171',
            fontWeight: 600,
          }}
        >
          <AlertTriangle size={12} />
          {language === 'ru' ? (
            <>{payment.overdueDays} {payment.overdueDays === 1 ? 'день' : payment.overdueDays < 5 ? 'дня' : 'дней'} просрочки</>
          ) : (
            <>{payment.overdueDays} kun kechikkan</>
          )}
        </div>
      )}

      {!compact && (
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginTop: '0.5rem',
            paddingTop: '0.5rem',
            borderTop: '1px solid rgba(30, 58, 95, 0.3)',
            fontSize: '0.75rem',
            color: 'var(--foreground-muted)',
          }}
        >
          <span style={{opacity: 0.6}}>{deal.id.split('-')[1] || deal.id.substring(0,8)}</span>
          <span>
            {language === 'ru' ? (
              <>Месяц {payment.monthNumber} из {deal.months}</>
            ) : (
              <>{payment.monthNumber}-oy (jami {deal.months} oydan)</>
            )}
          </span>
        </div>
      )}
    </div>
  );
}
