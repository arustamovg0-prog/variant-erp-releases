import { useState } from 'react';
import { useLanguage } from '@/lib/language';
import { X, UserPlus, User, Mail, Lock, Shield } from 'lucide-react';

interface AddAgentModalProps {
  onClose: () => void;
  onSuccess: () => void;
}

export default function AddAgentModal({ onClose, onSuccess }: AddAgentModalProps) {
  const { language } = useLanguage();
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    role: 'agent',
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      if (window.api && window.api.createAgent) {
        const res = await window.api.createAgent(formData);
        if (res.success) {
          onSuccess();
        } else {
          setError(res.error || (language === 'ru' ? 'Ошибка при создании агента' : 'Agent yaratishda xatolik'));
        }
      } else {
        setError(language === 'ru' ? 'Локальное API недоступно' : 'Lokal API mavjud emas');
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '400px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '1rem 1.25rem', borderBottom: '1px solid var(--border)' }}>
          <h2 style={{ fontSize: '1rem', fontWeight: 700, fontFamily: 'var(--font-heading)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <UserPlus size={18} style={{ color: 'var(--primary)' }} />
            {language === 'ru' ? 'Добавить агента' : 'Agent qo\'shish'}
          </h2>
          <button onClick={onClose} style={{ background: 'var(--muted)', border: '1px solid var(--border)', borderRadius: '8px', padding: '0.375rem', cursor: 'pointer', color: 'var(--foreground-muted)' }}>
            <X size={16} />
          </button>
        </div>

        <form onSubmit={handleSubmit} style={{ padding: '1.25rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          {error && (
            <div style={{ padding: '0.75rem', background: 'rgba(239, 68, 68, 0.1)', border: '1px solid rgba(239, 68, 68, 0.2)', borderRadius: '8px', color: '#f87171', fontSize: '0.8125rem' }}>
              {error}
            </div>
          )}

          <div>
            <label style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--foreground-muted)', display: 'block', marginBottom: '0.375rem' }}>
              {language === 'ru' ? 'Имя агента' : 'Agent ismi'}
            </label>
            <div style={{ position: 'relative' }}>
              <User size={16} style={{ position: 'absolute', left: '0.75rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--foreground-muted)' }} />
              <input
                required
                className="input-field"
                style={{ paddingLeft: '2.5rem' }}
                placeholder={language === 'ru' ? 'Иван Иванов' : 'Ivan Ivanov'}
                value={formData.name}
                onChange={e => setFormData({ ...formData, name: e.target.value })}
              />
            </div>
          </div>

          <div>
            <label style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--foreground-muted)', display: 'block', marginBottom: '0.375rem' }}>Email</label>
            <div style={{ position: 'relative' }}>
              <Mail size={16} style={{ position: 'absolute', left: '0.75rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--foreground-muted)' }} />
              <input
                required
                type="email"
                className="input-field"
                style={{ paddingLeft: '2.5rem' }}
                placeholder="ivan@trust.com"
                value={formData.email}
                onChange={e => setFormData({ ...formData, email: e.target.value })}
              />
            </div>
          </div>

          <div>
            <label style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--foreground-muted)', display: 'block', marginBottom: '0.375rem' }}>
              {language === 'ru' ? 'Пароль' : 'Parol'}
            </label>
            <div style={{ position: 'relative' }}>
              <Lock size={16} style={{ position: 'absolute', left: '0.75rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--foreground-muted)' }} />
              <input
                required
                type="password"
                className="input-field"
                style={{ paddingLeft: '2.5rem' }}
                placeholder={language === 'ru' ? 'Минимум 6 символов' : 'Kamida 6 ta belgi'}
                minLength={6}
                value={formData.password}
                onChange={e => setFormData({ ...formData, password: e.target.value })}
              />
            </div>
          </div>

          <div>
            <label style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--foreground-muted)', display: 'block', marginBottom: '0.375rem' }}>
              {language === 'ru' ? 'Роль доступа' : 'Ruxsat roli'}
            </label>
            <div style={{ position: 'relative' }}>
              <Shield size={16} style={{ position: 'absolute', left: '0.75rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--foreground-muted)' }} />
              <select
                className="input-field"
                style={{ paddingLeft: '2.5rem', appearance: 'none' }}
                value={formData.role}
                onChange={e => setFormData({ ...formData, role: e.target.value })}
              >
                <option value="agent">{language === 'ru' ? 'Agent (Менеджер по продажам)' : 'Agent (Sotuv menejeri)'}</option>
                <option value="admin">{language === 'ru' ? 'Admin (Администратор)' : 'Admin (Administrator)'}</option>
              </select>
            </div>
          </div>

          <button type="submit" className="btn-primary" disabled={loading} style={{ marginTop: '0.5rem' }}>
            {loading ? (language === 'ru' ? 'Создание...' : 'Yaratilmoqda...') : (language === 'ru' ? 'Создать агента' : 'Agent yaratish')}
          </button>
        </form>
      </div>
    </div>
  );
}
