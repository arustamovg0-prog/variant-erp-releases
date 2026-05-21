import { useState, useEffect } from 'react';
import * as Dialog from '@radix-ui/react-dialog';
import { X, DollarSign } from 'lucide-react';
import type { Payment } from '@/types';
import { useApp } from '@/lib/store';
import { useLanguage } from '@/lib/language';
import { formatAmount } from '@/lib/calculations';

interface AcceptPaymentModalProps {
  payment: Payment | null;
  onClose: () => void;
}

export default function AcceptPaymentModal({ payment, onClose }: AcceptPaymentModalProps) {
  const { updatePaymentInSupabase, getDealPayments } = useApp();
  const { language } = useLanguage();
  const [amount, setAmount] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (payment) {
      setAmount(String(payment.amount));
      setError('');
    }
  }, [payment]);

  if (!payment) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const parsedAmount = parseFloat(amount);
    if (isNaN(parsedAmount) || parsedAmount <= 0) {
      setError(language === 'ru' ? 'Введите корректную сумму' : 'To\'g\'ri summani kiriting');
      return;
    }

    const payments = getDealPayments(payment.dealId);
    const remainingDebt = payments.filter(p => p.status !== 'paid').reduce((sum, p) => sum + p.amount, 0);
    const remainingDebtCents = Math.round(remainingDebt * 100);
    const parsedAmountCents = Math.round(parsedAmount * 100);

    if (parsedAmountCents > remainingDebtCents) {
      setError(
        language === 'ru'
          ? `Сумма не может превышать остаток долга (${formatAmount(remainingDebt)})`
          : `Summa qoldiq qarzdan oshmasligi kerak (${formatAmount(remainingDebt)})`
      );
      return;
    }

    setIsSubmitting(true);
    setError('');

    try {
      const today = new Date().toISOString().split('T')[0];
      await updatePaymentInSupabase(payment.id, {
        status: 'paid',
        paidDate: today,
        amount: parsedAmount,
      });
      onClose();
    } catch (err: any) {
      setError(err.message || (language === 'ru' ? 'Ошибка при проведении оплаты' : 'To\'lovni amalga oshirishda xatolik yuz berdi'));
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog.Root open={!!payment} onOpenChange={(open) => !open && onClose()}>
      <Dialog.Portal>
        <Dialog.Overlay className="dialog-overlay" />
        <Dialog.Content className="dialog-content" style={{ maxWidth: '400px' }}>
          <div className="dialog-header">
            <Dialog.Title className="dialog-title">
              <DollarSign size={20} style={{ display: 'inline', marginRight: '0.5rem', color: 'var(--primary)' }} />
              {language === 'ru' ? 'Принять оплату' : 'To\'lovni qabul qilish'}
            </Dialog.Title>
            <Dialog.Close className="dialog-close">
              <X size={20} />
            </Dialog.Close>
          </div>

          <div style={{ padding: '1.5rem' }}>
            <div style={{ marginBottom: '1.5rem', background: 'rgba(30, 58, 95, 0.3)', padding: '1rem', borderRadius: '8px' }}>
              <div style={{ fontSize: '0.8125rem', color: 'var(--foreground-muted)', marginBottom: '0.25rem' }}>
                {language === 'ru' ? 'Плановый ежемесячный платеж' : 'Rejali oylik to\'lov'}
              </div>
              <div style={{ fontSize: '1.25rem', fontWeight: 700, fontFamily: 'var(--font-heading)' }}>
                {formatAmount(payment.amount)}
              </div>
            </div>

            <form onSubmit={handleSubmit}>
              <div style={{ marginBottom: '1.5rem', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                <label style={{ fontSize: '0.875rem', fontWeight: 500, color: 'var(--foreground)' }}>
                  {language === 'ru' ? 'Полученная сумма ($)' : 'Olingan summa ($)'}
                </label>
                <input
                  type="number"
                  step="any"
                  className="input-field"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  required
                  style={{
                    padding: '0.75rem',
                    fontSize: '1.125rem',
                    fontWeight: 600,
                  }}
                  autoFocus
                />
              </div>

              {error && (
                <div style={{ color: '#ef4444', fontSize: '0.875rem', marginBottom: '1rem' }}>
                  {error}
                </div>
              )}

              <div style={{ display: 'flex', gap: '0.75rem', marginTop: '1.5rem' }}>
                <button
                  type="button"
                  className="btn btn-secondary"
                  style={{ flex: 1 }}
                  onClick={onClose}
                  disabled={isSubmitting}
                >
                  {language === 'ru' ? 'Отмена' : 'Bekor qilish'}
                </button>
                <button
                  type="submit"
                  className="btn btn-primary"
                  style={{ flex: 1 }}
                  disabled={isSubmitting || !amount}
                >
                  {isSubmitting ? (language === 'ru' ? 'Проведение...' : 'Amalga oshirilmoqda...') : (language === 'ru' ? 'Оплатить' : 'To\'lash')}
                </button>
              </div>
            </form>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
