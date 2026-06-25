import { useAuth } from '@/lib/auth';
import { useLanguage } from '@/lib/language';
import { useTheme } from '@/lib/theme';
import { useSync } from '@/lib/sync';
import { TrustLogo } from '@/components/shared/TrustLogo';
import {
  LayoutDashboard,
  CreditCard,
  Activity,
  FileBarChart,
  Handshake,
  Shield,
  Settings,
  LogOut,
  Users,
  Sun,
  Moon,
  Wallet,
  RefreshCw,
  Cloud,
  CloudOff,
  AlertTriangle,
} from 'lucide-react';


interface SidebarProps {
  activeSection: string;
  onNavigate: (section: string) => void;
}

const navItems = [
  { id: 'dashboard', labelKey: 'nav.dashboard', icon: LayoutDashboard },
  { id: 'clients', labelKey: 'nav.clients', icon: Users },
  { id: 'deals', labelKey: 'nav.deals', icon: Handshake },
  { id: 'payments', labelKey: 'nav.payments', icon: CreditCard },
  { id: 'cashbox', labelKey: 'nav.cashbox', icon: Wallet },
  { id: 'reports', labelKey: 'nav.reports', icon: FileBarChart },
  { id: 'admin', labelKey: 'nav.admin', icon: Shield },
];

export default function Sidebar({ activeSection, onNavigate }: SidebarProps) {
  const { agent, logout } = useAuth();
  const { t, language, setLanguage } = useLanguage();
  const { theme, toggleTheme } = useTheme();
  const { syncStatus, lastSynced, syncNow, isOnline } = useSync();

  return (
    <aside
      className="sidebar"
      style={{
        width: '260px',
        minHeight: '100vh',
        background: 'var(--background-secondary)',
        borderRight: '1px solid var(--border)',
        padding: '1.5rem 1rem',
        display: 'flex',
        flexDirection: 'column',
      }}
    >
      {/* Logo */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', padding: '0 0.5rem', marginBottom: '2rem' }}>
        <TrustLogo style={{ width: '36px', height: '36px' }} />
        <div className="logo-text">
          <h1 style={{ fontSize: '1rem', fontWeight: 700, fontFamily: 'var(--font-heading)', color: 'var(--foreground)', lineHeight: 1.2 }}>
            Trust-Network
          </h1>
          <span style={{ fontSize: '0.625rem', fontWeight: 600, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--primary)' }}>
            ERP Platform
          </span>
        </div>
      </div>

      {/* Navigation */}
      <nav style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem', flex: 1 }}>
        {navItems.map(item => {
          if (item.id === 'admin' && agent?.role !== 'admin') return null;
          
          const Icon = item.icon;
          const isActive = activeSection === item.id;
          return (
            <button
              key={item.id}
              className={`sidebar-link ${isActive ? 'active' : ''}`}
              onClick={() => onNavigate(item.id)}
              style={{ border: 'none', textAlign: 'left', background: isActive ? undefined : 'transparent' }}
            >
              <Icon size={18} />
              <span className="sidebar-text">{t(item.labelKey)}</span>
            </button>
          );
        })}

        {/* Settings - separated */}
        <div style={{ marginTop: '0.5rem', paddingTop: '0.5rem', borderTop: '1px solid var(--border)' }}>
          <button
            className={`sidebar-link ${activeSection === 'settings' ? 'active' : ''}`}
            onClick={() => onNavigate('settings')}
            style={{ border: 'none', textAlign: 'left', background: activeSection === 'settings' ? undefined : 'transparent' }}
          >
            <Settings size={18} />
            <span className="sidebar-text">{t('nav.settings')}</span>
          </button>
        </div>
      </nav>

      {/* Language & Theme Switcher */}
      <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', padding: '0 0.5rem', marginBottom: '0.75rem', marginTop: '1rem' }}>
        <div style={{ display: 'flex', gap: '0.25rem', flex: 1 }}>
          <button
            onClick={() => setLanguage('ru')}
            style={{
              flex: 1,
              padding: '0.375rem 0.5rem',
              fontSize: '0.75rem',
              fontWeight: 700,
              borderRadius: '6px',
              border: '1px solid var(--border)',
              background: language === 'ru' ? 'var(--primary)' : 'rgba(255,255,255,0.03)',
              color: language === 'ru' ? '#fff' : 'var(--foreground-muted)',
              cursor: 'pointer',
              transition: 'all 0.15s ease',
            }}
          >
            РУС
          </button>
          <button
            onClick={() => setLanguage('uz')}
            style={{
              flex: 1,
              padding: '0.375rem 0.5rem',
              fontSize: '0.75rem',
              fontWeight: 700,
              borderRadius: '6px',
              border: '1px solid var(--border)',
              background: language === 'uz' ? 'var(--primary)' : 'rgba(255,255,255,0.03)',
              color: language === 'uz' ? '#fff' : 'var(--foreground-muted)',
              cursor: 'pointer',
              transition: 'all 0.15s ease',
            }}
          >
            UZB
          </button>
        </div>

        <button
          onClick={toggleTheme}
          title={theme === 'dark' ? 'Light Theme' : 'Dark Theme'}
          style={{
            padding: '0.375rem 0.5rem',
            borderRadius: '6px',
            border: '1px solid var(--border)',
            background: 'rgba(255,255,255,0.03)',
            color: 'var(--foreground-muted)',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            transition: 'all 0.15s ease',
            height: '28px',
            width: '32px',
          }}
          onMouseEnter={e => {
            e.currentTarget.style.color = 'var(--foreground)';
            e.currentTarget.style.borderColor = 'var(--primary)';
          }}
          onMouseLeave={e => {
            e.currentTarget.style.color = 'var(--foreground-muted)';
            e.currentTarget.style.borderColor = 'var(--border)';
          }}
        >
          {theme === 'dark' ? <Sun size={15} /> : <Moon size={15} />}
        </button>
      </div>

      {/* Sync Status Card */}
      {agent && (
        <div
          style={{
            margin: '0.5rem 0.5rem 1rem 0.5rem',
            padding: '0.75rem',
            borderRadius: '12px',
            background: 'rgba(255, 255, 255, 0.02)',
            backdropFilter: 'blur(10px)',
            border: '1px solid var(--border)',
            display: 'flex',
            flexDirection: 'column',
            gap: '0.5rem',
            boxShadow: '0 4px 12px rgba(0, 0, 0, 0.05)',
          }}
        >
          <style>{`
            @keyframes spin-slow {
              to { transform: rotate(360deg); }
            }
          `}</style>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              {isOnline ? (
                syncStatus === 'syncing' ? (
                  <RefreshCw size={14} style={{ color: 'var(--primary)', animation: 'spin-slow 1.5s linear infinite' }} />
                ) : syncStatus === 'error' ? (
                  <AlertTriangle size={14} style={{ color: '#f87171' }} />
                ) : (
                  <Cloud size={14} style={{ color: '#10b981' }} />
                )
              ) : (
                <CloudOff size={14} style={{ color: 'var(--foreground-muted)' }} />
              )}
              <span style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--foreground)' }}>
                {isOnline ? (
                  syncStatus === 'syncing' ? (
                    language === 'ru' ? 'Синхронизация...' : 'Sinxronizatsiya...'
                  ) : syncStatus === 'error' ? (
                    language === 'ru' ? 'Ошибка сети' : 'Tarmoq xatosi'
                  ) : (
                    language === 'ru' ? 'В сети' : 'Onlayn'
                  )
                ) : (
                  language === 'ru' ? 'Вне сети' : 'Oflayn'
                )}
              </span>
            </div>
            
            {/* Status dot */}
            <div
              style={{
                width: '6px',
                height: '6px',
                borderRadius: '50%',
                background: !isOnline ? '#9ca3af' : syncStatus === 'syncing' ? '#f59e0b' : syncStatus === 'error' ? '#ef4444' : '#10b981',
                boxShadow: !isOnline ? 'none' : `0 0 8px ${syncStatus === 'syncing' ? '#f59e0b' : syncStatus === 'error' ? '#ef4444' : '#10b981'}`,
              }}
            />
          </div>
          
          {lastSynced && (
            <span style={{ fontSize: '0.625rem', color: 'var(--foreground-muted)', display: 'block', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {language === 'ru' ? `Синхр: ${lastSynced}` : `Sinx: ${lastSynced}`}
            </span>
          )}

          {isOnline && syncStatus !== 'syncing' && (
            <button
              onClick={syncNow}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '0.375rem',
                width: '100%',
                padding: '0.375rem',
                borderRadius: '6px',
                background: 'rgba(255,255,255,0.04)',
                border: '1px solid var(--border)',
                color: 'var(--foreground)',
                fontSize: '0.6875rem',
                fontWeight: 600,
                cursor: 'pointer',
                transition: 'all 0.15s ease',
              }}
              onMouseEnter={e => {
                e.currentTarget.style.background = 'rgba(255, 255, 255, 0.08)';
                e.currentTarget.style.borderColor = 'var(--primary)';
              }}
              onMouseLeave={e => {
                e.currentTarget.style.background = 'rgba(255, 255, 255, 0.04)';
                e.currentTarget.style.borderColor = 'var(--border)';
              }}
            >
              <RefreshCw size={10} />
              {language === 'ru' ? 'Синхронизировать' : 'Sinxronlashtirish'}
            </button>
          )}
        </div>
      )}

      {/* Agent footer */}
      {agent && (
        <div style={{ padding: '1rem 0.5rem', borderTop: '1px solid var(--border)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.625rem', marginBottom: '0.625rem' }}>
            <div style={{ width: '32px', height: '32px', borderRadius: '50%', background: 'linear-gradient(135deg, var(--primary), var(--navy-600, #2d5280))', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.7rem', fontWeight: 700, color: '#fff', flexShrink: 0 }}>
              {agent.name.split(' ').map(n => n[0]).join('').slice(0, 2)}
            </div>
            <div className="sidebar-text" style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: '0.8125rem', fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{agent.name}</div>
              <div style={{ fontSize: '0.6875rem', color: agent.role === 'admin' ? 'var(--primary)' : 'var(--foreground-muted)', fontWeight: agent.role === 'admin' ? 600 : 400 }}>
                {agent.role === 'admin' ? t('role.admin') : t('role.agent')}
              </div>
            </div>
          </div>
          <button
            onClick={logout}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
              fontSize: '0.75rem',
              color: 'var(--foreground-muted)',
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              padding: '0.25rem 0',
              transition: 'color 0.15s',
            }}
            onMouseEnter={e => (e.currentTarget.style.color = '#f87171')}
            onMouseLeave={e => (e.currentTarget.style.color = 'var(--foreground-muted)')}
          >
            <LogOut size={14} />
            <span className="sidebar-text">{t('nav.logout')}</span>
          </button>
        </div>
      )}
    </aside>
  );
}
