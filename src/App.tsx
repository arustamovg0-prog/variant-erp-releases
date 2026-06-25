import { useState } from 'react';
import { AuthProvider, useAuth } from '@/lib/auth';
import { AppProvider } from '@/lib/store';
import { LanguageProvider, useLanguage } from '@/lib/language';
import AppLayout from '@/components/layout/AppLayout';
import Login from '@/pages/Login';
import Dashboard from '@/pages/Dashboard';
import Clients from '@/pages/Clients';
import Deals from '@/pages/Deals';
import Payments from '@/pages/Payments';
import Cashbox from '@/pages/Cashbox';
import Reports from '@/pages/Reports';
import Settings from '@/pages/Settings';
import AdminDashboard from '@/pages/AdminDashboard';

import { ThemeProvider } from '@/lib/theme';
import ErrorBoundary from '@/components/shared/ErrorBoundary';
import { SyncProvider } from '@/lib/sync';

function AppContent() {
  const { isAuthenticated, isLoading } = useAuth();
  const { t } = useLanguage();
  const [activeSection, setActiveSection] = useState('dashboard');

  if (isLoading) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'linear-gradient(135deg, var(--background) 0%, var(--background-secondary) 40%, var(--border) 100%)' }}>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1rem' }}>
          <div style={{ width: '40px', height: '40px', border: '3px solid rgba(59, 111, 160, 0.3)', borderTopColor: 'var(--primary)', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
          <span style={{ fontSize: '0.875rem', color: 'var(--foreground-muted)' }}>{t('common.loading')}</span>
        </div>
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Login />;
  }

  const renderSection = () => {
    switch (activeSection) {
      case 'dashboard':
        return <Dashboard />;
      case 'clients':
        return <Clients />;
      case 'deals':
        return <Deals />;
      case 'payments':
        return <Payments />;
      case 'cashbox':
        return <Cashbox />;
      case 'reports':
        return <Reports />;
      case 'settings':
        return <Settings />;
      case 'admin':
        return <AdminDashboard />;
      default:
        return <Dashboard />;
    }
  };

  return (
    <AppLayout activeSection={activeSection} onNavigate={setActiveSection}>
      {renderSection()}
    </AppLayout>
  );
}

export default function App() {
  return (
    <ThemeProvider>
      <LanguageProvider>
        <AuthProvider>
          <AppProvider>
            <SyncProvider>
              <ErrorBoundary>
                <AppContent />
              </ErrorBoundary>
            </SyncProvider>
          </AppProvider>
        </AuthProvider>
      </LanguageProvider>
    </ThemeProvider>
  );
}

