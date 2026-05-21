import { useState } from 'react';
import { useAuth } from '@/lib/auth';
import { useLanguage } from '@/lib/language';
import { useTheme } from '@/lib/theme';
import { User, LogOut, Download, Languages, Sun, Moon } from 'lucide-react';

export default function Settings() {
  const { agent, logout } = useAuth();
  const { language, setLanguage } = useLanguage();
  const { theme, setTheme } = useTheme();
  const [exporting, setExporting] = useState(false);

  if (!agent) return null;

  const handleExport = async () => {
    setExporting(true);
    try {
      if (window.api && window.api.exportDatabase) {
        const res = await window.api.exportDatabase(agent.name);
        if (res.success) {
          alert(language === 'ru' ? 'База данных успешно выгружена! Отправьте этот файл администратору.' : 'Ma\'lumotlar bazasi muvaffaqiyatli yuklab olindi! Ushbu faylni administratorga yuboring.');
        } else if (!res.canceled) {
          alert((language === 'ru' ? 'Ошибка при выгрузке базы: ' : 'Bazani yuklashda xatolik yuz berdi: ') + res.error);
        }
      }
    } catch (err: any) {
      alert(err.message);
    } finally {
      setExporting(false);
    }
  };

  return (
    <div style={{ maxWidth: '800px' }}>
      <div style={{ marginBottom: '1.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h1 style={{ fontSize: '1.5rem', fontWeight: 700, marginBottom: '0.25rem' }}>
            <User size={22} style={{ display: 'inline', verticalAlign: 'middle', marginRight: '0.5rem' }} />
            {language === 'ru' ? 'Профиль' : 'Profil'}
          </h1>
          <p style={{ fontSize: '0.875rem', color: 'var(--foreground-muted)' }}>
            {language === 'ru' ? 'Информация об аккаунте' : 'Hisob ma\'lumotlari'}
          </p>
        </div>
        <button 
          className="btn-primary" 
          onClick={handleExport} 
          disabled={exporting}
          style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', background: 'var(--color-success)' }}
        >
          <Download size={16} />
          {exporting ? (language === 'ru' ? 'Выгрузка...' : 'Yuklanmoqda...') : (language === 'ru' ? 'Выгрузить базу' : 'Bazani yuklash')}
        </button>
      </div>

      {/* Agent info */}
      <div className="glass-card" style={{ padding: '1.5rem', marginBottom: '1.5rem' }}>
        <h2 style={{ fontSize: '1rem', fontWeight: 700, fontFamily: 'var(--font-heading)', marginBottom: '1rem' }}>
          {language === 'ru' ? 'Учётные данные агента' : 'Agent hisob ma\'lumotlari'}
        </h2>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem' }}>
          <InfoRow label={language === 'ru' ? 'Имя' : 'Ism'} value={agent.name} />
          <InfoRow label={language === 'ru' ? 'Телефон' : 'Telefon'} value={agent.phone} />
          <InfoRow label={language === 'ru' ? 'Email (Логин)' : 'Email (Login)'} value={agent.login} />
          <InfoRow label={language === 'ru' ? 'Уровень доступа' : 'Ruxsat darajasi'} value={agent.role.toUpperCase()} />
        </div>
      </div>

      {/* Language Preferences */}
      <div className="glass-card" style={{ padding: '1.5rem', marginBottom: '1.5rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem' }}>
          <Languages size={18} style={{ color: 'var(--primary)' }} />
          <h2 style={{ fontSize: '1rem', fontWeight: 700, fontFamily: 'var(--font-heading)' }}>
            {language === 'ru' ? 'Язык интерфейса' : 'Interfeys tili'}
          </h2>
        </div>
        <div style={{ display: 'flex', gap: '1rem' }}>
          <button 
            className={`btn ${language === 'ru' ? 'btn-primary' : 'btn-secondary'}`}
            onClick={() => setLanguage('ru')}
            style={{ flex: 1, padding: '0.75rem' }}
          >
            Русский
          </button>
          <button 
            className={`btn ${language === 'uz' ? 'btn-primary' : 'btn-secondary'}`}
            onClick={() => setLanguage('uz')}
            style={{ flex: 1, padding: '0.75rem' }}
          >
            O'zbekcha
          </button>
        </div>
      </div>

      {/* Theme Preferences */}
      <div className="glass-card" style={{ padding: '1.5rem', marginBottom: '2rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem' }}>
          {theme === 'dark' ? <Moon size={18} style={{ color: 'var(--primary)' }} /> : <Sun size={18} style={{ color: 'var(--primary)' }} />}
          <h2 style={{ fontSize: '1rem', fontWeight: 700, fontFamily: 'var(--font-heading)' }}>
            {language === 'ru' ? 'Тема оформления' : 'Mavzu sozlamalari'}
          </h2>
        </div>
        <div style={{ display: 'flex', gap: '1rem' }}>
          <button 
            className={`btn ${theme === 'light' ? 'btn-primary' : 'btn-secondary'}`}
            onClick={() => setTheme('light')}
            style={{ flex: 1, padding: '0.75rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem' }}
          >
            <Sun size={16} />
            {language === 'ru' ? 'Светлая тема' : "Yorug' mavzu"}
          </button>
          <button 
            className={`btn ${theme === 'dark' ? 'btn-primary' : 'btn-secondary'}`}
            onClick={() => setTheme('dark')}
            style={{ flex: 1, padding: '0.75rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem' }}
          >
            <Moon size={16} />
            {language === 'ru' ? 'Тёмная тема' : "Qorong'u mavzu"}
          </button>
        </div>
      </div>

      {/* Logout */}
      <button
        className="btn-secondary"
        onClick={logout}
        style={{ color: '#f87171', borderColor: 'rgba(239, 68, 68, 0.3)' }}
      >
        <LogOut size={16} />
        {language === 'ru' ? 'Выйти из системы' : 'Tizimdan chiqish'}
      </button>
    </div>
  );
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <span style={{ fontSize: '0.6875rem', fontWeight: 600, color: 'var(--foreground-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{label}</span>
      <div style={{ fontSize: '0.875rem', fontWeight: 600, marginTop: '0.25rem' }}>{value}</div>
    </div>
  );
}
