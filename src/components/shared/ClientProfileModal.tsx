import { useMemo, useState } from 'react';
import * as Dialog from '@radix-ui/react-dialog';
import { X, User, Phone, Package, CalendarClock, MessageCircle, Send, Check } from 'lucide-react';
import { useApp } from '@/lib/store';
import { useLanguage } from '@/lib/language';
import { formatAmount, formatDate, calculateClientTrustScore } from '@/lib/calculations';
import { generateReminderMessage, getWhatsAppLink, getTelegramLink } from '@/lib/messages';
import { Shield } from 'lucide-react';
import StatusBadge from './StatusBadge';
import ExtendPaymentModal from './ExtendPaymentModal';
import AcceptPaymentModal from './AcceptPaymentModal';
import type { Payment, Deal } from '@/types';

interface ClientProfileModalProps {
  clientName: string | null;
  clientPhone: string | null;
  onClose: () => void;
  onDealClick?: (dealId: string) => void;
}

export default function ClientProfileModal({ clientName, clientPhone, onClose, onDealClick }: ClientProfileModalProps) {
  const { state, updatePaymentInSupabase } = useApp();
  const { t, language } = useLanguage();
  const [extendingPayment, setExtendingPayment] = useState<Payment | null>(null);
  const [acceptingPayment, setAcceptingPayment] = useState<Payment | null>(null);

  const handleAcceptPayment = (payment: Payment) => {
    setAcceptingPayment(payment);
  };

  const { clientDeals, clientPayments, stats, trustScore } = useMemo(() => {
    if (!clientName || !clientPhone) return { clientDeals: [], clientPayments: [], stats: null, trustScore: null };

    const deals = state.deals.filter(d => d.client === clientName && d.phone === clientPhone);
    const dealIds = new Set(deals.map(d => d.id));
    
    const payments = state.payments
      .filter(p => dealIds.has(p.dealId))
      .sort((a, b) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime());

    const activeDeals = deals.filter(d => d.status === 'active').length;
    const completedDeals = deals.filter(d => d.status === 'completed').length;
    const totalAmount = deals.reduce((sum, d) => sum + d.totalAmount, 0);

    const trustScore = calculateClientTrustScore(deals, payments);

    return {
      clientDeals: deals,
      clientPayments: payments,
      trustScore,
      stats: {
        activeDeals,
        completedDeals,
        totalAmount,
      }
    };
  }, [clientName, clientPhone, state.deals, state.payments]);

  if (!clientName || !clientPhone) return null;

  return (
    <Dialog.Root open={!!clientName} onOpenChange={(open) => !open && onClose()}>
      <Dialog.Portal>
        <Dialog.Overlay className="dialog-overlay" />
        <Dialog.Content className="dialog-content" style={{ maxWidth: '700px', width: '90vw' }}>
          <div className="dialog-header">
            <Dialog.Title className="dialog-title">
              <User size={20} style={{ display: 'inline', marginRight: '0.5rem', color: 'var(--primary)' }} />
              {language === 'ru' ? 'Профиль клиента' : 'Mijoz profili'}
            </Dialog.Title>
            <Dialog.Close className="dialog-close">
              <X size={20} />
            </Dialog.Close>
          </div>

          <div style={{ padding: '1.5rem', maxHeight: 'calc(100vh - 120px)', overflowY: 'auto' }}>
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', marginBottom: '2rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '1rem' }}>
                <div>
                  <h2 style={{ fontSize: '1.5rem', fontWeight: 700, fontFamily: 'var(--font-heading)', marginBottom: '0.5rem' }}>
                    {clientName}
                  </h2>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--foreground-muted)' }}>
                      <Phone size={14} />
                      <span>{clientPhone}</span>
                    </div>
                    {trustScore && (
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
                      >
                        <Shield size={12} style={{ color: trustScore.color }} />
                        <span style={{ fontSize: '0.6875rem', fontWeight: 700, color: trustScore.color }}>
                          {language === 'ru' ? 'Рейтинг' : 'Reyting'} {trustScore.grade} ({trustScore.score})
                        </span>
                      </div>
                    )}
                  </div>
                </div>

                {stats && (
                  <div style={{ display: 'flex', gap: '1rem' }}>
                    <div className="glass-card" style={{ padding: '1rem', minWidth: '120px' }}>
                      <div style={{ fontSize: '0.75rem', color: 'var(--foreground-muted)', marginBottom: '0.25rem' }}>{language === 'ru' ? 'Активных сделок' : 'Faol shartnomalar'}</div>
                      <div style={{ fontSize: '1.25rem', fontWeight: 700 }}>{stats.activeDeals}</div>
                    </div>
                    <div className="glass-card" style={{ padding: '1rem', minWidth: '120px' }}>
                      <div style={{ fontSize: '0.75rem', color: 'var(--foreground-muted)', marginBottom: '0.25rem' }}>{language === 'ru' ? 'Общая сумма' : 'Umumiy summa'}</div>
                      <div style={{ fontSize: '1.25rem', fontWeight: 700, color: 'var(--primary)' }}>{formatAmount(stats.totalAmount)}</div>
                    </div>
                  </div>
                )}
              </div>
            </div>

            <h3 style={{ fontSize: '1.125rem', fontWeight: 600, marginBottom: '1rem', fontFamily: 'var(--font-heading)' }}>
              {language === 'ru' ? 'Сделки клиента' : 'Mijoz shartnomalari'}
            </h3>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(250px, 1fr))', gap: '0.75rem', marginBottom: '2rem' }}>
              {clientDeals.map(deal => (
                <div 
                  key={deal.id} 
                  className={onDealClick ? "glass-card-interactive" : "glass-card"} 
                  style={{ padding: '1rem', cursor: onDealClick ? 'pointer' : 'default' }}
                  onClick={() => onDealClick && onDealClick(deal.id)}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                    <span style={{ fontSize: '0.75rem', opacity: 0.6 }}>{deal.id.split('-')[1] || deal.id.substring(0,8)}</span>
                    <StatusBadge status={deal.status as any} />
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontWeight: 600, marginBottom: '0.5rem' }}>
                    <Package size={14} style={{ color: 'var(--primary)' }} />
                    {deal.product}
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.375rem 0.75rem', fontSize: '0.8125rem', marginTop: '0.5rem', color: 'var(--foreground-muted)' }}>
                    <div>
                      {language === 'ru' ? 'Цена (с нац.):' : 'Narx (ustama bilan):'}
                      <div style={{ fontWeight: 600, color: 'var(--foreground)' }}>{formatAmount((deal.downPayment || 0) + deal.totalAmount)}</div>
                    </div>
                    <div>
                      {language === 'ru' ? 'Аванс:' : 'Boshlang\'ich:'}
                      <div style={{ fontWeight: 600, color: 'var(--foreground)' }}>{formatAmount(deal.downPayment || 0)}</div>
                    </div>
                    <div>
                      {language === 'ru' ? 'Себестоимость:' : 'Tannarx:'}
                      <div style={{ fontWeight: 600, color: 'var(--foreground)' }}>{formatAmount(deal.costPrice || 0)}</div>
                    </div>
                    <div>
                      {language === 'ru' ? 'Выплачено:' : 'To\'langan:'}
                      <div style={{ fontWeight: 600, color: 'var(--color-success)' }}>
                        {formatAmount(
                          (deal.downPayment || 0) + 
                          clientPayments
                            .filter(p => p.dealId === deal.id && p.status === 'paid')
                            .reduce((sum, p) => sum + p.amount, 0)
                        )}
                      </div>
                    </div>
                  </div>
                  {deal.referral && (
                    <div style={{ marginTop: '0.5rem', paddingTop: '0.5rem', borderTop: '1px solid rgba(255,255,255,0.05)', fontSize: '0.75rem' }}>
                      <span style={{ color: 'var(--foreground-muted)' }}>{language === 'ru' ? 'Поручитель:' : 'Kafillik:'} </span>
                      <span style={{ fontWeight: 500 }}>{deal.referral.name}</span>
                    </div>
                  )}
                  {deal.comment && (
                    <div style={{ marginTop: '0.5rem', padding: '0.5rem', background: 'rgba(0,0,0,0.2)', borderRadius: '4px', fontSize: '0.75rem', color: 'var(--foreground-muted)', fontStyle: 'italic', wordBreak: 'break-word' }}>
                      "{deal.comment}"
                    </div>
                  )}
                </div>
              ))}
            </div>

            <h3 style={{ fontSize: '1.125rem', fontWeight: 600, marginBottom: '1rem', fontFamily: 'var(--font-heading)' }}>
              {language === 'ru' ? 'График платежей' : 'To\'lovlar grafigi'}
            </h3>
            
            <div className="hide-on-mobile" style={{ overflowX: 'auto', background: 'rgba(30, 58, 95, 0.2)', borderRadius: '12px', padding: '1px' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.875rem' }}>
                <thead>
                  <tr style={{ background: 'rgba(30, 58, 95, 0.4)', textAlign: 'left' }}>
                    <th style={{ padding: '1rem', fontWeight: 600, color: 'var(--foreground-muted)' }}>{language === 'ru' ? 'Сделка' : 'Shartnoma'}</th>
                    <th style={{ padding: '1rem', fontWeight: 600, color: 'var(--foreground-muted)' }}>{language === 'ru' ? 'Сумма' : 'Summa'}</th>
                    <th style={{ padding: '1rem', fontWeight: 600, color: 'var(--foreground-muted)' }}>{language === 'ru' ? 'Дата оплаты' : 'To\'lov sanasi'}</th>
                    <th style={{ padding: '1rem', fontWeight: 600, color: 'var(--foreground-muted)' }}>{language === 'ru' ? 'Статус' : 'Status'}</th>
                    <th style={{ padding: '1rem', fontWeight: 600, color: 'var(--foreground-muted)', textAlign: 'right' }}>{language === 'ru' ? 'Действия' : 'Amallar'}</th>
                  </tr>
                </thead>
                <tbody>
                  {clientPayments.map((payment, i) => {
                    const deal = clientDeals.find(d => d.id === payment.dealId);
                    const isBorder = i < clientPayments.length - 1;
                    const canPay = payment.status !== 'paid';
                    const canExtend = payment.status === 'pending' || payment.status === 'overdue' || payment.status === 'extended';
                    
                    return (
                      <tr key={payment.id} style={{ borderBottom: isBorder ? '1px solid rgba(255,255,255,0.05)' : 'none' }}>
                        <td style={{ padding: '1rem' }}>
                          <div style={{ fontWeight: 500 }}>{deal?.product}</div>
                          <div style={{ fontSize: '0.75rem', color: 'var(--foreground-muted)' }}>{language === 'ru' ? 'Месяц' : 'Oy'} {payment.monthNumber}</div>
                        </td>
                        <td style={{ padding: '1rem', fontWeight: 600 }}>
                          {formatAmount(payment.amount)}
                        </td>
                        <td style={{ padding: '1rem' }}>
                          {formatDate(payment.extendedDate || payment.dueDate)}
                          {payment.extendedDate && (
                            <div style={{ fontSize: '0.6875rem', color: 'var(--foreground-muted)' }}>
                              {language === 'ru' ? 'Было:' : 'Aslida:'} {formatDate(payment.dueDate)}
                            </div>
                          )}
                        </td>
                        <td style={{ padding: '1rem' }}>
                          <StatusBadge status={payment.status} />
                        </td>
                        <td style={{ padding: '1rem', textAlign: 'right' }}>
                          <div style={{ display: 'flex', gap: '0.375rem', justifyContent: 'flex-end' }}>
                            <a
                              href={getWhatsAppLink(clientPhone, generateReminderMessage(clientName, deal!, payment, language))}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="btn btn-secondary"
                              style={{ padding: '0.375rem 0.5rem', fontSize: '0.75rem', display: 'inline-flex', gap: '0.375rem', alignItems: 'center', textDecoration: 'none', color: '#10b981', borderColor: 'rgba(16, 185, 129, 0.3)' }}
                              title="WhatsApp"
                            >
                              <MessageCircle size={14} />
                            </a>
                            <button
                              onClick={() => {
                                const text = generateReminderMessage(clientName, deal!, payment, language);
                                navigator.clipboard.writeText(text).then(() => {
                                  window.open(getTelegramLink(clientPhone), '_blank');
                                });
                              }}
                              className="btn btn-secondary"
                              style={{ padding: '0.375rem 0.5rem', fontSize: '0.75rem', display: 'inline-flex', gap: '0.375rem', alignItems: 'center', color: '#3b82f6', borderColor: 'rgba(59, 130, 246, 0.3)' }}
                              title="Telegram"
                            >
                              <Send size={14} />
                            </button>
                            {canPay && (
                              <button
                                onClick={() => handleAcceptPayment(payment)}
                                className="btn btn-primary"
                                style={{ padding: '0.375rem 0.75rem', fontSize: '0.75rem', display: 'inline-flex', gap: '0.375rem', alignItems: 'center', background: 'var(--color-success)', borderColor: 'var(--color-success)', color: '#fff' }}
                              >
                                <Check size={12} />
                                {language === 'ru' ? 'Оплатить' : 'To\'lash'}
                              </button>
                            )}
                            {canExtend && (
                              <button
                                onClick={() => setExtendingPayment(payment)}
                                className="btn btn-secondary"
                                style={{ padding: '0.375rem 0.75rem', fontSize: '0.75rem', display: 'inline-flex', gap: '0.375rem', alignItems: 'center' }}
                              >
                                <CalendarClock size={12} />
                                {language === 'ru' ? 'Продлить' : 'Uzaytirish'}
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                  {clientPayments.length === 0 && (
                    <tr>
                      <td colSpan={5} style={{ padding: '2rem', textAlign: 'center', color: 'var(--foreground-muted)' }}>
                        {language === 'ru' ? 'Платежей не найдено' : 'To\'lovlar topilmadi'}
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            {/* Mobile Payments List */}
            <div className="hide-on-desktop" style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              {clientPayments.map(payment => {
                const deal = clientDeals.find(d => d.id === payment.dealId);
                const canPay = payment.status !== 'paid';
                const canExtend = payment.status === 'pending' || payment.status === 'overdue' || payment.status === 'extended';
                
                return (
                  <div key={payment.id} style={{ padding: '1rem', background: 'rgba(30, 58, 95, 0.2)', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.05)' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.75rem' }}>
                      <div>
                        <div style={{ fontWeight: 600, fontSize: '0.875rem' }}>{deal?.product}</div>
                        <div style={{ fontSize: '0.75rem', color: 'var(--foreground-muted)' }}>{language === 'ru' ? 'Месяц' : 'Oy'} {payment.monthNumber}</div>
                      </div>
                      <StatusBadge status={payment.status} />
                    </div>
                    
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1rem', fontSize: '0.8125rem' }}>
                      <div>
                        <div style={{ color: 'var(--foreground-muted)' }}>{language === 'ru' ? 'Сумма' : 'Summa'}</div>
                        <div style={{ fontWeight: 600 }}>{formatAmount(payment.amount)}</div>
                      </div>
                      <div style={{ textAlign: 'right' }}>
                        <div style={{ color: 'var(--foreground-muted)' }}>{language === 'ru' ? 'Дата оплаты' : 'To\'lov sanasi'}</div>
                        <div style={{ fontWeight: 500 }}>{formatDate(payment.extendedDate || payment.dueDate)}</div>
                      </div>
                    </div>
                    
                    <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.5rem', flexWrap: 'wrap' }}>
                      <a
                        href={getWhatsAppLink(clientPhone, generateReminderMessage(clientName, deal!, payment, language))}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="btn btn-secondary"
                        style={{ flex: 1, padding: '0.5rem', fontSize: '0.75rem', display: 'flex', justifyContent: 'center', color: '#10b981', borderColor: 'rgba(16, 185, 129, 0.3)', textDecoration: 'none' }}
                      >
                        <MessageCircle size={14} />
                        WhatsApp
                      </a>
                      <button
                        onClick={() => {
                          const text = generateReminderMessage(clientName, deal!, payment, language);
                          navigator.clipboard.writeText(text).then(() => {
                            window.open(getTelegramLink(clientPhone), '_blank');
                          });
                        }}
                        className="btn btn-secondary"
                        style={{ flex: 1, padding: '0.5rem', fontSize: '0.75rem', display: 'flex', justifyContent: 'center', color: '#3b82f6', borderColor: 'rgba(59, 130, 246, 0.3)' }}
                      >
                        <Send size={14} />
                        Telegram
                      </button>
                      {canPay && (
                        <button
                          onClick={() => handleAcceptPayment(payment)}
                          className="btn btn-primary"
                          style={{ width: '100%', padding: '0.5rem', fontSize: '0.75rem', display: 'flex', justifyContent: 'center', marginTop: '0.25rem', background: 'var(--color-success)', borderColor: 'var(--color-success)', color: '#fff' }}
                        >
                          <Check size={14} />
                          {language === 'ru' ? 'Оплатить' : 'To\'lash'}
                        </button>
                      )}
                      {canExtend && (
                        <button
                          onClick={() => setExtendingPayment(payment)}
                          className="btn btn-secondary"
                          style={{ width: '100%', padding: '0.5rem', fontSize: '0.75rem', display: 'flex', justifyContent: 'center', marginTop: '0.25rem' }}
                        >
                          <CalendarClock size={14} />
                          {language === 'ru' ? 'Продлить платёж' : 'To\'lovni uzaytirish'}
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
              {clientPayments.length === 0 && (
                <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--foreground-muted)' }}>
                  {language === 'ru' ? 'Платежей не найдено' : 'To\'lovlar topilmadi'}
                </div>
              )}
            </div>

          </div>
        </Dialog.Content>
      </Dialog.Portal>

      {extendingPayment && (
        <ExtendPaymentModal 
          payment={extendingPayment} 
          onClose={() => setExtendingPayment(null)} 
        />
      )}

      {acceptingPayment && (
        <AcceptPaymentModal 
          payment={acceptingPayment} 
          onClose={() => setAcceptingPayment(null)} 
        />
      )}
    </Dialog.Root>
  );
}
