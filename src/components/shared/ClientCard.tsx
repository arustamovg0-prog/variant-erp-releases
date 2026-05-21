import { User, Calendar, Phone, Package, Shield } from 'lucide-react';
import type { Deal, Payment, PaymentStatus } from '@/types';
import StatusBadge from './StatusBadge';
import { formatAmount, formatDate, calculateClientTrustScore } from '@/lib/calculations';

interface ClientCardProps {
  name: string;
  phone: string;
  deals: Deal[];
  payments: Payment[];
  allPayments?: Payment[];
  onClick: (name: string, phone: string) => void;
}

export default function ClientCard({ name, phone, deals, payments, allPayments, onClick }: ClientCardProps) {
  const activeDeals = deals.filter(d => d.status === 'active');
  const totalAmount = deals.reduce((sum, d) => sum + d.totalAmount, 0);
  const trustScore = calculateClientTrustScore(deals, allPayments || payments);

  // Calculate overall status for this client
  let status: PaymentStatus = 'paid';
  const now = new Date();
  
  const unpaidPayments = payments.filter(p => p.status !== 'paid');
  
  if (unpaidPayments.some(p => p.status === 'overdue')) {
    status = 'overdue';
  } else if (unpaidPayments.some(p => p.status === 'extended')) {
    status = 'extended';
  } else if (unpaidPayments.some(p => p.status === 'pending')) {
    status = 'pending';
  }

  // Find next upcoming payment
  let nextPayment: Payment | null = null;
  const pendingPayments = payments.filter(p => p.status === 'pending' || p.status === 'extended');
  if (pendingPayments.length > 0) {
    nextPayment = pendingPayments.reduce((earliest, p) => {
      const pDate = new Date(p.extendedDate || p.dueDate);
      const eDate = new Date(earliest.extendedDate || earliest.dueDate);
      return pDate < eDate ? p : earliest;
    }, pendingPayments[0]);
  }

  // Find earliest overdue payment
  const overduePayments = payments.filter(p => p.status === 'overdue');
  let firstOverdue: Payment | null = null;
  if (overduePayments.length > 0) {
    firstOverdue = overduePayments.reduce((earliest, p) => {
      const pDate = new Date(p.dueDate);
      const eDate = new Date(earliest.dueDate);
      return pDate < eDate ? p : earliest;
    }, overduePayments[0]);
  }

  const displayPayment = firstOverdue || nextPayment;
  const isOverdue = status === 'overdue';

  return (
    <div
      className={`glass-card-interactive ${isOverdue ? 'pulse-danger' : ''}`}
      onClick={() => onClick(name, phone)}
      style={{
        padding: '1.25rem',
        borderColor: isOverdue ? 'rgba(239, 68, 68, 0.4)' : undefined,
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1rem' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.25rem' }}>
            <User size={16} style={{ color: 'var(--primary)' }} />
            <span style={{ fontSize: '1rem', fontWeight: 600, fontFamily: 'var(--font-heading)' }}>
              {name}
            </span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--foreground-muted)' }}>
            <Phone size={12} />
            <span style={{ fontSize: '0.75rem' }}>{phone}</span>
          </div>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '0.5rem' }}>
          <StatusBadge status={status} />
          
          <div 
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.375rem',
              padding: '0.125rem 0.5rem',
              borderRadius: '9999px',
              border: `1px solid ${trustScore.color}`,
              background: `color-mix(in srgb, ${trustScore.color} 10%, transparent)`,
            }}
            title={`Индекс надежности: ${trustScore.label}`}
          >
            <Shield size={12} style={{ color: trustScore.color }} />
            <span style={{ fontSize: '0.6875rem', fontWeight: 700, color: trustScore.color }}>
              Рейтинг {trustScore.grade} ({trustScore.score})
            </span>
          </div>
        </div>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.75rem', fontSize: '0.8125rem' }}>
        <Package size={14} style={{ color: 'var(--foreground-muted)' }} />
        <span style={{ fontWeight: 500 }}>Сделки клиента ({deals.length})</span>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', marginBottom: '1rem' }}>
        {deals.map(deal => {
          // Total paid is down payment + all paid installments
          const paidInstallments = (allPayments || payments)
            .filter(p => p.dealId === deal.id && p.status === 'paid')
            .reduce((sum, p) => sum + p.amount, 0);
          const totalPaid = (deal.downPayment || 0) + paidInstallments;
          const totalWithMarkup = (deal.downPayment || 0) + deal.totalAmount;

          return (
            <div
              key={deal.id}
              style={{
                background: 'rgba(255, 255, 255, 0.02)',
                border: '1px solid rgba(255, 255, 255, 0.06)',
                padding: '0.625rem',
                borderRadius: '6px',
                fontSize: '0.75rem'
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.375rem', fontWeight: 600 }}>
                <span style={{ color: 'var(--foreground)' }}>{deal.product}</span>
                <span style={{ color: 'var(--foreground-muted)' }}>{deal.id}</span>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.25rem 0.5rem', color: 'var(--foreground-muted)' }}>
                <div>Цена: <strong style={{ color: 'var(--foreground)' }}>{formatAmount(totalWithMarkup)}</strong></div>
                <div>Аванс: <strong style={{ color: 'var(--foreground)' }}>{formatAmount(deal.downPayment || 0)}</strong></div>
                <div>Себестоимость: <strong style={{ color: 'var(--foreground)' }}>{formatAmount(deal.costPrice || 0)}</strong></div>
                <div>Выплачено: <strong style={{ color: 'var(--color-success)' }}>{formatAmount(totalPaid)}</strong></div>
              </div>
            </div>
          );
        })}
      </div>

      <div style={{
        background: 'rgba(30, 58, 95, 0.3)',
        padding: '0.75rem',
        borderRadius: '8px',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center'
      }}>
        <div>
          <div style={{ fontSize: '0.6875rem', color: 'var(--foreground-muted)', marginBottom: '0.25rem' }}>
            {status === 'overdue' ? 'Первая просрочка' : status === 'paid' ? 'Всё оплачено' : 'Следующий платёж'}
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.375rem', fontSize: '0.8125rem', fontWeight: 500 }}>
            {displayPayment ? (
              <>
                <Calendar size={12} style={{ color: isOverdue ? '#f87171' : 'var(--primary)' }} />
                <span style={{ color: isOverdue ? '#f87171' : 'inherit' }}>
                  {formatDate(displayPayment.extendedDate || displayPayment.dueDate)}
                </span>
              </>
            ) : (
              <span style={{ color: 'var(--color-success)' }}>Нет платежей</span>
            )}
          </div>
        </div>
        
        {displayPayment && (
          <div style={{ textAlign: 'right' }}>
            <div style={{ fontSize: '0.9375rem', fontWeight: 700 }}>
              {formatAmount(displayPayment.amount)}
            </div>
            {isOverdue && displayPayment.overdueDays && (
              <div style={{ fontSize: '0.6875rem', color: '#f87171', fontWeight: 600 }}>
                {displayPayment.overdueDays} дн. просрочки
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
