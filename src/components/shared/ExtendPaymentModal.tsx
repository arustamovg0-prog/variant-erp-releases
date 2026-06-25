import { useState } from 'react';
import * as Dialog from '@radix-ui/react-dialog';
import { X, CalendarClock } from 'lucide-react';
import type { Payment } from '@/types';
import { useApp } from '@/lib/store';
import { useLanguage } from '@/lib/language';
import { formatDate, formatAmount } from '@/lib/calculations';

interface ExtendPaymentModalProps {
  payment: Payment | null;
  onClose: () => void;
}

export default function ExtendPaymentModal({ payment, onClose }: ExtendPaymentModalProps) {
  const { updatePaymentInSupabase } = useApp();
  const { language } = useLanguage();
  const [newDate, setNewDate] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');

  if (!payment) return null;

  const currentDueDate = payment.extendedDate || payment.dueDate;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newDate) {
      setError(language === 'ru' ? 'Выберите новую дату' : 'Yangi sanani tanlang');
      return;
    }

    const selectedDate = new Date(newDate);
    const currentDate = new Date(currentDueDate);

    if (selectedDate <= currentDate) {
      setError(language === 'ru' ? 'Новая дата должна быть позже текущей даты платежа' : 'Yangi sana joriy to\'lov sanasidan keyin bo\'lishi kerak');
      return;
    }

    setIsSubmitting(true);
    setError('');

    try {
      await updatePaymentInSupabase(payment.id, {
        extendedDate: newDate,
        status: 'extended',
      });
      onClose();
    } catch (err: any) {
      setError(err.message || (language === 'ru' ? 'Ошибка при продлении платежа' : 'To\'lovni uzaytirishda xatolik yuz berdi'));
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
              <CalendarClock size={20} style={{ display: 'inline', marginRight: '0.5rem', color: 'var(--primary)' }} />
              {language === 'ru' ? 'Продлить платеж' : 'To\'lovni uzaytirish'}
            </Dialog.Title>
            <Dialog.Close className="dialog-close">
              <X size={20} />
            </Dialog.Close>
          </div>

          <div style={{ padding: '1.5rem' }}>
            <div style={{ marginBottom: '1.5rem', background: 'rgba(30, 58, 95, 0.3)', padding: '1rem', borderRadius: '8px' }}>
              <div style={{ fontSize: '0.8125rem', color: 'var(--foreground-muted)', marginBottom: '0.25rem' }}>{language === 'ru' ? 'Сумма платежа' : 'To\'lov summasi'}</div>
              <div style={{ fontSize: '1.25rem', fontWeight: 700, fontFamily: 'var(--font-heading)' }}>
                {formatAmount(payment.amount)}
              </div>
              
              <div style={{ marginTop: '0.75rem', fontSize: '0.8125rem', color: 'var(--foreground-muted)' }}>{language === 'ru' ? 'Текущая дата оплаты' : 'Joriy to\'lov sanasi'}</div>
              <div style={{ fontSize: '0.9375rem', fontWeight: 500 }}>
                {formatDate(currentDueDate)}
              </div>
            </div>

            <form onSubmit={handleSubmit}>
              <div style={{ marginBottom: '1.5rem', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                <label style={{ fontSize: '0.875rem', fontWeight: 500, color: 'var(--foreground)' }}>{language === 'ru' ? 'Новая дата оплаты' : 'Yangi to\'lov sanasi'}</label>
                <input
                  type="date"
                  className="input-field"
                  value={newDate}
                  onChange={(e) => setNewDate(e.target.value)}
                  onClick={(e) => {
                    try {
                      if ('showPicker' in e.currentTarget) {
                        (e.currentTarget as HTMLInputElement).showPicker();
                      }
                    } catch (err) {
                      // showPicker might throw if not triggered by user interaction, but onClick is.
                    }
                  }}
                  min={currentDueDate}
                  required
                  style={{
                    colorScheme: 'dark', /* Helps native date picker blend with dark theme */
                    padding: '0.75rem',
                    fontSize: '1rem',
                    cursor: 'pointer'
                  }}
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
                  disabled={isSubmitting || !newDate}
                >
                  {isSubmitting ? (language === 'ru' ? 'Сохранение...' : 'Saqlanmoqda...') : (language === 'ru' ? 'Продлить' : 'Uzaytirish')}
                </button>
              </div>
            </form>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
