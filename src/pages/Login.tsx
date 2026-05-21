import { useState } from 'react';
import { useAuth } from '@/lib/auth';
import { useLanguage } from '@/lib/language';
import { Shield, LogIn, Eye, EyeOff, AlertCircle, UserPlus } from 'lucide-react';

type Mode = 'login' | 'signup';

export default function Login() {
  const { login, signup } = useAuth();
  const { t } = useLanguage();
  const [mode, setMode] = useState<Mode>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    if (!email.trim() || !password.trim()) {
      setError(t('login.error_fill'));
      return;
    }

    if (mode === 'signup' && !name.trim()) {
      setError(t('login.error_name'));
      return;
    }

    setIsLoading(true);

    if (mode === 'login') {
      const result = await login(email, password);
      if (!result.success) {
        setError(result.error || 'Ошибка входа');
      }
    } else {
      const result = await signup(email, password, name, phone);
      if (result.success) {
        setSuccess(t('login.success_signup'));
        setMode('login');
      } else {
        setError(result.error || 'Ошибка регистрации');
      }
    }

    setIsLoading(false);
  };

  const switchMode = () => {
    setMode(m => m === 'login' ? 'signup' : 'login');
    setError('');
    setSuccess('');
  };

  return (
    <div
      style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'linear-gradient(135deg, #0a1128 0%, #0f1b3d 40%, #1e3a5f 100%)',
        padding: '1rem',
      }}
    >
      {/* Background pattern */}
      <div
        style={{
          position: 'fixed',
          inset: 0,
          backgroundImage: `radial-gradient(circle at 20% 50%, rgba(59, 111, 160, 0.08) 0%, transparent 50%),
                            radial-gradient(circle at 80% 20%, rgba(59, 111, 160, 0.06) 0%, transparent 50%),
                            radial-gradient(circle at 50% 80%, rgba(30, 58, 95, 0.1) 0%, transparent 50%)`,
          pointerEvents: 'none',
        }}
      />

      <div style={{ width: '100%', maxWidth: '420px', position: 'relative', zIndex: 1 }}>
        {/* Logo */}
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', marginBottom: '2rem' }}>
          <div
            style={{
              width: '56px', height: '56px', borderRadius: '14px',
              background: 'linear-gradient(135deg, var(--primary), var(--secondary))',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              marginBottom: '1rem', boxShadow: '0 8px 32px rgba(59, 111, 160, 0.3)',
            }}
          >
            <Shield size={28} color="#fff" />
          </div>
          <h1 style={{ fontSize: '1.5rem', fontWeight: 700, fontFamily: 'var(--font-heading)', color: 'var(--foreground)', marginBottom: '0.25rem' }}>
            Trust-Network
          </h1>
          <span style={{ fontSize: '0.75rem', fontWeight: 600, letterSpacing: '0.15em', textTransform: 'uppercase', color: 'var(--primary)' }}>
            ERP Platform
          </span>
        </div>

        {/* Login/Signup Card */}
        <div className="glass-card" style={{ padding: '2rem', boxShadow: '0 20px 60px rgba(0, 0, 0, 0.4)' }}>
          <h2 style={{ fontSize: '1.125rem', fontWeight: 700, fontFamily: 'var(--font-heading)', textAlign: 'center', marginBottom: '0.375rem' }}>
            {mode === 'login' ? t('login.title') : t('login.signup_title')}
          </h2>
          <p style={{ fontSize: '0.8125rem', color: 'var(--foreground-muted)', textAlign: 'center', marginBottom: '1.5rem' }}>
            {mode === 'login' ? t('login.subtitle') : t('login.signup_subtitle')}
          </p>

          <form onSubmit={handleSubmit}>
            {/* Name (signup only) */}
            {mode === 'signup' && (
              <div style={{ marginBottom: '1rem' }}>
                <label style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--foreground-muted)', display: 'block', marginBottom: '0.375rem' }}>
                  {t('login.name')} <span style={{ color: 'var(--color-danger)' }}>*</span>
                </label>
                <input className="input-field" type="text" value={name} onChange={e => { setName(e.target.value); setError(''); }} placeholder={t('login.name_placeholder')} style={{ fontSize: '0.9375rem', padding: '0.625rem 0.875rem' }} />
              </div>
            )}

            {/* Phone (signup only) */}
            {mode === 'signup' && (
              <div style={{ marginBottom: '1rem' }}>
                <label style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--foreground-muted)', display: 'block', marginBottom: '0.375rem' }}>
                  {t('login.phone')}
                </label>
                <input className="input-field" type="text" value={phone} onChange={e => setPhone(e.target.value)} placeholder="+998 90 123 4567" style={{ fontSize: '0.9375rem', padding: '0.625rem 0.875rem' }} />
              </div>
            )}

            {/* Email */}
            <div style={{ marginBottom: '1rem' }}>
              <label style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--foreground-muted)', display: 'block', marginBottom: '0.375rem' }}>
                {t('login.email')}
              </label>
              <input
                className="input-field" type="email" value={email}
                onChange={e => { setEmail(e.target.value); setError(''); }}
                placeholder="agent@trust-network.uz" autoComplete="email" autoFocus
                style={{ fontSize: '0.9375rem', padding: '0.625rem 0.875rem' }}
              />
            </div>

            {/* Password */}
            <div style={{ marginBottom: '1.25rem' }}>
              <label style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--foreground-muted)', display: 'block', marginBottom: '0.375rem' }}>
                {t('login.password')} {mode === 'signup' && <span style={{ fontSize: '0.6875rem', color: 'var(--foreground-muted)' }}>{t('login.password_min')}</span>}
              </label>
              <div style={{ position: 'relative' }}>
                <input
                  className="input-field" type={showPassword ? 'text' : 'password'} value={password}
                  onChange={e => { setPassword(e.target.value); setError(''); }}
                  placeholder="••••••••" autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
                  style={{ fontSize: '0.9375rem', padding: '0.625rem 0.875rem', paddingRight: '2.5rem' }}
                />
                <button type="button" onClick={() => setShowPassword(v => !v)}
                  style={{ position: 'absolute', right: '0.625rem', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', color: 'var(--foreground-muted)', cursor: 'pointer', padding: '0.25rem', display: 'flex' }}
                >
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            {/* Error */}
            {error && (
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.5rem 0.75rem', background: 'rgba(239, 68, 68, 0.1)', border: '1px solid rgba(239, 68, 68, 0.3)', borderRadius: 'var(--radius)', marginBottom: '1rem', fontSize: '0.8125rem', color: '#f87171' }}>
                <AlertCircle size={14} />
                {error}
              </div>
            )}

            {/* Success */}
            {success && (
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.5rem 0.75rem', background: 'rgba(16, 185, 129, 0.1)', border: '1px solid rgba(16, 185, 129, 0.3)', borderRadius: 'var(--radius)', marginBottom: '1rem', fontSize: '0.8125rem', color: '#34d399' }}>
                {success}
              </div>
            )}

            {/* Submit */}
            <button type="submit" className="btn-primary" disabled={isLoading}
              style={{ width: '100%', padding: '0.75rem', fontSize: '0.9375rem', justifyContent: 'center', opacity: isLoading ? 0.7 : 1 }}
            >
              {isLoading ? (
                <span style={{ width: '18px', height: '18px', border: '2px solid rgba(255,255,255,0.3)', borderTopColor: '#fff', borderRadius: '50%', display: 'inline-block', animation: 'spin 0.6s linear infinite' }} />
              ) : mode === 'login' ? (
                <><LogIn size={16} /> {t('login.login_btn')}</>
              ) : (
                <><UserPlus size={16} /> {t('login.signup_btn')}</>
              )}
            </button>
          </form>

          {/* Switch mode */}
          <div style={{ textAlign: 'center', marginTop: '1rem' }}>
            <button onClick={switchMode}
              style={{ background: 'none', border: 'none', color: 'var(--primary)', cursor: 'pointer', fontSize: '0.8125rem', textDecoration: 'underline', textUnderlineOffset: '3px' }}
            >
              {mode === 'login' ? t('login.no_account') : t('login.has_account')}
            </button>
          </div>
        </div>
      </div>

      <style>{`
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
}
