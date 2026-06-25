import { useState, useEffect, useRef } from 'react';
import { AlertTriangle, Shield, Trash2, X, Loader2, CheckCircle } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useLanguage } from '@/lib/language';

interface FactoryResetModalProps {
  onClose: () => void;
  onSuccess: () => void;
}

const CONFIRMATION_WORD_RU = 'ОБНУЛИТЬ';
const CONFIRMATION_WORD_EN = 'RESET';

type ResetPhase = 'idle' | 'deleting' | 'success' | 'error';

interface DeletionStep {
  labelRu: string;
  labelUz: string;
  done: boolean;
}

export default function FactoryResetModal({ onClose, onSuccess }: FactoryResetModalProps) {
  const { language } = useLanguage();
  const [confirmText, setConfirmText] = useState('');
  const [phase, setPhase] = useState<ResetPhase>('idle');
  const [errorMsg, setErrorMsg] = useState('');
  const [steps, setSteps] = useState<DeletionStep[]>([
    { labelRu: 'CashboxTransaction — Транзакции кассы', labelUz: 'CashboxTransaction — Kassa tranzaksiyalari', done: false },
    { labelRu: 'Payment — Графики платежей', labelUz: 'Payment — To\'lov jadvallari', done: false },
    { labelRu: 'Deal — Сделки', labelUz: 'Deal — Shartnomalar', done: false },
    { labelRu: 'Supabase (облако) — Синхронизация', labelUz: 'Supabase (bulut) — Sinxronizatsiya', done: false },
  ]);
  const inputRef = useRef<HTMLInputElement>(null);

  const confirmWord = language === 'ru' ? CONFIRMATION_WORD_RU : CONFIRMATION_WORD_EN;
  const isConfirmed = confirmText.trim().toUpperCase() === confirmWord;

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  const markStep = (index: number) => {
    setSteps(prev => prev.map((s, i) => i === index ? { ...s, done: true } : s));
  };

  /** Wipe Supabase cloud tables directly */
  const wipeSupabase = async () => {
    try {
      await supabase.from('CashboxTransaction').delete().neq('id', '');
      await supabase.from('Payment').delete().neq('id', '');
      await supabase.from('Deal').delete().neq('id', '');
    } catch (e) {
      console.warn('[FactoryReset] Supabase wipe warning:', e);
    }
  };

  const handleFactoryReset = async () => {
    if (!isConfirmed || phase === 'deleting') return;

    setPhase('deleting');
    setErrorMsg('');

    try {
      // --- Step 1-3: Clear local SQLite (Electron) ---
      if (window.api && window.api.factoryReset) {
        const res = await window.api.factoryReset();
        if (!res.success) throw new Error(res.error || 'Unknown error');
        markStep(0); markStep(1); markStep(2);
      } else if (window.api && window.api.executeSupportCommand) {
        // Electron dev-mode: raw SQL
        const r1 = await window.api.executeSupportCommand({ type: 'sql', payload: 'DELETE FROM CashboxTransaction' });
        if (!r1.success) throw new Error(r1.error);
        markStep(0);

        const r2 = await window.api.executeSupportCommand({ type: 'sql', payload: 'DELETE FROM Payment' });
        if (!r2.success) throw new Error(r2.error);
        markStep(1);

        const r3 = await window.api.executeSupportCommand({ type: 'sql', payload: 'DELETE FROM Deal' });
        if (!r3.success) throw new Error(r3.error);
        markStep(2);
      }

      // --- Step 4: ALWAYS wipe Supabase directly (the real fix) ---
      await wipeSupabase();
      markStep(3);

      setPhase('success');

      setTimeout(() => {
        onSuccess();
        window.location.reload();
      }, 1800);

    } catch (err: any) {
      setPhase('error');
      setErrorMsg(err.message || 'Unexpected error');
    }
  };

  // Prevent background scrolling
  useEffect(() => {
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = ''; };
  }, []);

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 9999,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(8px)',
    }} onClick={(e) => { if (e.target === e.currentTarget && phase === 'idle') onClose(); }}>
      <div style={{
        width: '100%', maxWidth: '520px',
        background: 'var(--card-bg, #1a1a2e)',
        border: '1px solid rgba(239, 68, 68, 0.35)',
        borderRadius: '16px',
        boxShadow: '0 25px 80px rgba(239, 68, 68, 0.15), 0 0 0 1px rgba(239,68,68,0.1)',
        overflow: 'hidden',
        animation: 'slideUp 0.3s cubic-bezier(0.16, 1, 0.3, 1)',
      }}>
        {/* Header — red danger gradient */}
        <div style={{
          padding: '1.25rem 1.5rem',
          background: 'linear-gradient(135deg, rgba(220,38,38,0.15), rgba(239,68,68,0.08))',
          borderBottom: '1px solid rgba(239,68,68,0.2)',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <div style={{
              width: 40, height: 40, borderRadius: '12px',
              background: 'rgba(239,68,68,0.15)', border: '1px solid rgba(239,68,68,0.3)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              <AlertTriangle size={20} style={{ color: '#f87171' }} />
            </div>
            <div>
              <h2 style={{ fontSize: '1.1rem', fontWeight: 700, color: '#fca5a5', fontFamily: 'var(--font-heading)', margin: 0 }}>
                {language === 'ru' ? 'Factory Reset' : 'Factory Reset'}
              </h2>
              <p style={{ fontSize: '0.7rem', color: 'rgba(252,165,165,0.6)', margin: 0, textTransform: 'uppercase', letterSpacing: '0.1em', fontWeight: 600 }}>
                {language === 'ru' ? 'DANGER ZONE • Опасная зона' : 'DANGER ZONE • Xavfli hudud'}
              </p>
            </div>
          </div>
          {phase === 'idle' && (
            <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--foreground-muted)', padding: '0.25rem' }}>
              <X size={20} />
            </button>
          )}
        </div>

        {/* Body */}
        <div style={{ padding: '1.5rem' }}>
          {/* What will be deleted */}
          <div style={{
            padding: '1rem', borderRadius: '12px', marginBottom: '1.25rem',
            background: 'rgba(239,68,68,0.06)', border: '1px solid rgba(239,68,68,0.12)',
          }}>
            <div style={{ fontSize: '0.75rem', fontWeight: 700, color: '#f87171', marginBottom: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              <Trash2 size={13} style={{ display: 'inline', marginRight: '0.4rem', verticalAlign: '-2px' }} />
              {language === 'ru' ? 'Будет удалено:' : 'O\'chiriladi:'}
            </div>
            {steps.map((step, i) => (
              <div key={i} style={{
                display: 'flex', alignItems: 'center', gap: '0.5rem',
                padding: '0.4rem 0', fontSize: '0.8125rem',
                color: step.done ? 'var(--color-success)' : 'var(--foreground)',
                opacity: step.done ? 0.7 : 1,
                transition: 'all 0.3s ease',
              }}>
                {step.done ? (
                  <CheckCircle size={15} style={{ color: 'var(--color-success)', flexShrink: 0 }} />
                ) : (
                  <div style={{ width: 15, height: 15, borderRadius: '50%', border: '1.5px solid rgba(239,68,68,0.4)', flexShrink: 0 }} />
                )}
                <span style={{ textDecoration: step.done ? 'line-through' : 'none' }}>
                  {language === 'ru' ? step.labelRu : step.labelUz}
                </span>
              </div>
            ))}
          </div>

          {/* What will be preserved */}
          <div style={{
            padding: '1rem', borderRadius: '12px', marginBottom: '1.25rem',
            background: 'rgba(34,197,94,0.06)', border: '1px solid rgba(34,197,94,0.15)',
          }}>
            <div style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--color-success)', marginBottom: '0.5rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              <Shield size={13} style={{ display: 'inline', marginRight: '0.4rem', verticalAlign: '-2px' }} />
              {language === 'ru' ? 'Будет сохранено:' : 'Saqlanadi:'}
            </div>
            <div style={{ fontSize: '0.8125rem', color: 'var(--foreground-muted)', lineHeight: 1.6 }}>
              {language === 'ru'
                ? '• Учетные записи агентов (Agent)\n• Настройки системы (Setting)\n• Курс валют'
                : '• Agent hisoblar (Agent)\n• Tizim sozlamalari (Setting)\n• Valyuta kursi'
              }
            </div>
          </div>

          {/* Confirmation input */}
          {phase === 'idle' && (
            <div style={{ marginBottom: '1.25rem' }}>
              <label style={{
                display: 'block', fontSize: '0.8125rem', fontWeight: 600,
                color: 'var(--foreground)', marginBottom: '0.5rem',
              }}>
                {language === 'ru'
                  ? <>Для подтверждения введите <strong style={{ color: '#f87171', fontFamily: 'monospace', fontSize: '0.9rem' }}>{confirmWord}</strong>:</>
                  : <>Tasdiqlash uchun <strong style={{ color: '#f87171', fontFamily: 'monospace', fontSize: '0.9rem' }}>{confirmWord}</strong> so'zini kiriting:</>
                }
              </label>
              <input
                ref={inputRef}
                className="input-field"
                type="text"
                value={confirmText}
                onChange={e => setConfirmText(e.target.value)}
                placeholder={confirmWord}
                autoComplete="off"
                spellCheck={false}
                style={{
                  width: '100%', fontSize: '1rem', fontFamily: 'monospace', fontWeight: 700,
                  letterSpacing: '0.15em', textAlign: 'center',
                  borderColor: isConfirmed ? 'rgba(239,68,68,0.6)' : undefined,
                  boxShadow: isConfirmed ? '0 0 0 3px rgba(239,68,68,0.15)' : undefined,
                  transition: 'all 0.2s ease',
                }}
                onKeyDown={e => { if (e.key === 'Enter' && isConfirmed) handleFactoryReset(); }}
              />
            </div>
          )}

          {/* Progress / Error / Success */}
          {phase === 'deleting' && (
            <div style={{ textAlign: 'center', padding: '1rem 0' }}>
              <Loader2 size={32} style={{ color: '#f87171', animation: 'spin 1s linear infinite', marginBottom: '0.75rem' }} />
              <p style={{ fontSize: '0.875rem', color: 'var(--foreground)', fontWeight: 600 }}>
                {language === 'ru' ? 'Удаление данных...' : 'Ma\'lumotlar o\'chirilmoqda...'}
              </p>
            </div>
          )}

          {phase === 'success' && (
            <div style={{ textAlign: 'center', padding: '1rem 0' }}>
              <CheckCircle size={40} style={{ color: 'var(--color-success)', marginBottom: '0.75rem' }} />
              <p style={{ fontSize: '1rem', color: 'var(--color-success)', fontWeight: 700 }}>
                {language === 'ru' ? 'Данные успешно удалены!' : 'Ma\'lumotlar muvaffaqiyatli o\'chirildi!'}
              </p>
              <p style={{ fontSize: '0.8125rem', color: 'var(--foreground-muted)', marginTop: '0.5rem' }}>
                {language === 'ru' ? 'Страница перезагрузится автоматически...' : 'Sahifa avtomatik qayta yuklanadi...'}
              </p>
            </div>
          )}

          {phase === 'error' && (
            <div style={{
              padding: '1rem', borderRadius: '10px', marginBottom: '1rem',
              background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)',
            }}>
              <p style={{ fontSize: '0.8125rem', color: '#fca5a5', fontWeight: 600, marginBottom: '0.25rem' }}>
                {language === 'ru' ? 'Ошибка при удалении:' : 'O\'chirishda xatolik:'}
              </p>
              <code style={{ fontSize: '0.75rem', color: '#f87171', wordBreak: 'break-all' }}>{errorMsg}</code>
            </div>
          )}
        </div>

        {/* Footer actions */}
        <div style={{
          padding: '1rem 1.5rem',
          borderTop: '1px solid rgba(255,255,255,0.06)',
          display: 'flex', gap: '0.75rem', justifyContent: 'flex-end',
        }}>
          {(phase === 'idle' || phase === 'error') && (
            <>
              <button className="btn-secondary" onClick={onClose} style={{ fontSize: '0.8125rem' }}>
                {language === 'ru' ? 'Отмена' : 'Bekor qilish'}
              </button>
              <button
                onClick={handleFactoryReset}
                disabled={!isConfirmed}
                style={{
                  padding: '0.6rem 1.5rem', borderRadius: '10px', fontSize: '0.8125rem',
                  fontWeight: 700, border: 'none', cursor: isConfirmed ? 'pointer' : 'not-allowed',
                  background: isConfirmed
                    ? 'linear-gradient(135deg, #dc2626, #b91c1c)'
                    : 'rgba(239,68,68,0.15)',
                  color: isConfirmed ? '#fff' : 'rgba(239,68,68,0.4)',
                  boxShadow: isConfirmed ? '0 4px 20px rgba(220,38,38,0.4)' : 'none',
                  transition: 'all 0.3s ease',
                  display: 'flex', alignItems: 'center', gap: '0.5rem',
                }}
              >
                <Trash2 size={15} />
                {language === 'ru' ? 'Удалить всё' : 'Hammasini o\'chirish'}
              </button>
            </>
          )}
        </div>
      </div>

      {/* CSS Animations */}
      <style>{`
        @keyframes slideUp {
          from { opacity: 0; transform: translateY(20px) scale(0.97); }
          to   { opacity: 1; transform: translateY(0) scale(1); }
        }
        @keyframes spin {
          from { transform: rotate(0deg); }
          to   { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
}
