import type { ReactNode } from 'react';
import Sidebar from './Sidebar';
import { LayoutDashboard, Handshake, CreditCard, Users, Settings, Shield } from 'lucide-react';
import { useAuth } from '@/lib/auth';
import { useLanguage } from '@/lib/language';

interface AppLayoutProps {
  activeSection: string;
  onNavigate: (section: string) => void;
  children: ReactNode;
}

export default function AppLayout({ activeSection, onNavigate, children }: AppLayoutProps) {
  const { agent } = useAuth();
  const { t } = useLanguage();
  
  const bottomNavItems = [
    { id: 'dashboard', label: t('nav.dashboard'), icon: LayoutDashboard },
    { id: 'clients', label: t('nav.clients'), icon: Users },
    { id: 'deals', label: t('nav.deals'), icon: Handshake },
    { id: 'payments', label: t('nav.payments'), icon: CreditCard },
    ...(agent?.role === 'admin' ? [{ id: 'admin', label: t('nav.admin'), icon: Shield }] : []),
    { id: 'settings', label: t('nav.settings'), icon: Settings },
  ];

  return (
    <div className="app-container" style={{ display: 'flex', minHeight: '100vh', width: '100%' }}>
      <Sidebar activeSection={activeSection} onNavigate={onNavigate} />
      
      <main
        style={{
          flex: 1,
          padding: '1.5rem',
          overflowY: 'auto',
          maxHeight: '100vh',
          background: 'var(--background)',
          width: '100%',
        }}
      >
        {children}
      </main>

      {/* Bottom Navigation for Mobile */}
      <nav className="hide-on-desktop bottom-nav">
        {bottomNavItems.map(item => {
          const Icon = item.icon;
          const isActive = activeSection === item.id;
          return (
            <button
              key={item.id}
              className={`bottom-nav-item ${isActive ? 'active' : ''}`}
              onClick={() => onNavigate(item.id)}
            >
              <Icon size={20} />
              <span>{item.label}</span>
            </button>
          );
        })}
      </nav>
    </div>
  );
}
