import { useState, useEffect, useRef } from 'react';
import { useAuth } from '@/lib/auth';
import { useLanguage } from '@/lib/language';
import { useTheme } from '@/lib/theme';
import { useSync } from '@/lib/sync';
import { supabase } from '@/lib/supabase';
import { 
  User, LogOut, Download, Languages, Sun, Moon, 
  ShieldAlert, RefreshCw, Square, Terminal, CheckCircle2, AlertCircle 
} from 'lucide-react';

export default function Settings() {
  const { agent, logout } = useAuth();
  const { language, setLanguage } = useLanguage();
  const { theme, setTheme } = useTheme();
  const { isOnline } = useSync();
  const [exporting, setExporting] = useState(false);

  // Support Mode State
  const [isSupportActive, setIsSupportActive] = useState(false);
  const [passcode, setPasscode] = useState('');
  const [timeLeft, setTimeLeft] = useState(900); // 15 mins in seconds
  const [currentSessionId, setCurrentSessionId] = useState<string | null>(null);
  const [connecting, setConnecting] = useState(false);
  const [supportLogs, setSupportLogs] = useState<Array<{
    time: string;
    type: 'sql' | 'cmd';
    payload: string;
    status: 'pending' | 'success' | 'error';
    result?: string;
  }>>([]);

  const logConsoleRef = useRef<HTMLDivElement>(null);

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

  // Support Session Toggle Handlers
  const handleStartSupport = async () => {
    if (!isOnline) {
      alert(language === 'ru' 
        ? 'Для включения поддержки необходимо подключение к сети.' 
        : 'Qo\'llab-quvvatlash rejimini yoqish uchun tarmoqqa ulanish zarur.');
      return;
    }

    setConnecting(true);
    try {
      // 1. Generate unique session details
      const code = Math.floor(100000 + Math.random() * 900000).toString();
      const sessionId = crypto.randomUUID();
      const expires = new Date(Date.now() + 15 * 60 * 1000).toISOString();

      // 2. Insert into Supabase brokering table
      const { error } = await supabase
        .from('SupportSession')
        .insert({
          id: sessionId,
          passcode: code,
          adminId: agent.id,
          status: 'waiting',
          requestPayload: null,
          responsePayload: null,
          expiresAt: expires
        });

      if (error) throw error;

      setCurrentSessionId(sessionId);
      setPasscode(code);
      setTimeLeft(900);
      setSupportLogs([]);
      setIsSupportActive(true);
    } catch (err: any) {
      alert((language === 'ru' ? 'Ошибка при запуске сессии: ' : 'Sessiyani boshlashda xatolik: ') + err.message);
    } finally {
      setConnecting(false);
    }
  };

  const handleStopSupport = async (sessionToClose = currentSessionId) => {
    setIsSupportActive(false);
    setCurrentSessionId(null);
    setPasscode('');
    
    if (sessionToClose) {
      try {
        await supabase
          .from('SupportSession')
          .update({ status: 'closed' })
          .eq('id', sessionToClose);
      } catch (err) {
        console.error('Failed to close support session on Supabase', err);
      }
    }
  };

  // 15-minute Countdown Timer
  useEffect(() => {
    if (!isSupportActive || timeLeft <= 0) {
      if (timeLeft <= 0 && isSupportActive) {
        handleStopSupport();
      }
      return;
    }

    const timer = setInterval(() => {
      setTimeLeft(prev => prev - 1);
    }, 1000);

    return () => clearInterval(timer);
  }, [isSupportActive, timeLeft]);

  // Real-time Supabase Brokering Subscription
  useEffect(() => {
    if (!currentSessionId) return;

    const channel = supabase
      .channel(`support-${currentSessionId}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'SupportSession',
          filter: `id=eq.${currentSessionId}`,
        },
        async (payload) => {
          const updatedSession = payload.new as any;

          // If developer disconnected/terminated session
          if (updatedSession.status === 'closed') {
            handleStopSupport(currentSessionId);
            alert(language === 'ru' 
              ? 'Сессия поддержки была завершена разработчиком.' 
              : 'Qo\'llab-quvvatlash sessiyasi dasturchi tomonidan yakunlandi.');
            return;
          }

          // If there is an incoming command request
          if (updatedSession.requestPayload) {
            try {
              const req = JSON.parse(updatedSession.requestPayload);
              const { type, payload: cmdPayload } = req;

              // Log the incoming command locally
              const newLog = {
                time: new Date().toLocaleTimeString(),
                type: type as 'sql' | 'cmd',
                payload: cmdPayload,
                status: 'pending' as const
              };
              setSupportLogs(prev => [...prev, newLog]);

              // Run query/command locally via Electron bridge
              let result;
              if (window.api && window.api.executeSupportCommand) {
                result = await window.api.executeSupportCommand({ type, payload: cmdPayload });
              } else {
                result = { success: false, error: 'Local database execution API unavailable.' };
              }

              // Update logs state with results
              setSupportLogs(prev => prev.map(l => 
                l.payload === cmdPayload 
                  ? { 
                      ...l, 
                      status: result.success ? 'success' as const : 'error' as const, 
                      result: result.success 
                        ? JSON.stringify(result.data, null, 2) 
                        : result.error 
                    } 
                  : l
              ));

              // Respond to Supabase broker and reset request payload
              const { error: responseErr } = await supabase
                .from('SupportSession')
                .update({
                  responsePayload: JSON.stringify(result),
                  requestPayload: null
                })
                .eq('id', currentSessionId);

              if (responseErr) {
                console.error('Failed to write support response payload back to Supabase:', responseErr);
              }
            } catch (err: any) {
              console.error('Error executing remote support request:', err);
            }
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [currentSessionId, language]);

  // Scroll terminal logs to bottom automatically
  useEffect(() => {
    if (logConsoleRef.current) {
      logConsoleRef.current.scrollTop = logConsoleRef.current.scrollHeight;
    }
  }, [supportLogs]);

  // Format seconds to MM:SS
  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
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
      <div className="glass-card" style={{ padding: '1.5rem', marginBottom: '1.5rem' }}>
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

      {/* Technical Support Controls (Admins Only) */}
      {agent.role === 'admin' && (
        <div className="glass-card" style={{ padding: '1.5rem', marginBottom: '2rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <ShieldAlert size={20} style={{ color: isSupportActive ? 'var(--color-warning)' : 'var(--primary)' }} />
              <h2 style={{ fontSize: '1rem', fontWeight: 700, fontFamily: 'var(--font-heading)' }}>
                {language === 'ru' ? 'Техническая поддержка и обновления' : 'Texnik yordam va yangilanishlar'}
              </h2>
            </div>
            <span style={{ 
              fontSize: '0.75rem', 
              padding: '0.25rem 0.5rem', 
              borderRadius: '4px',
              fontWeight: 600,
              background: isOnline ? 'rgba(16, 185, 129, 0.15)' : 'rgba(239, 68, 68, 0.15)',
              color: isOnline ? 'var(--color-success)' : 'var(--color-danger)'
            }}>
              {isOnline ? 'Online' : 'Offline'}
            </span>
          </div>

          <p style={{ fontSize: '0.8125rem', color: 'var(--foreground-muted)', marginBottom: '1.25rem', lineHeight: '1.4' }}>
            {language === 'ru' 
              ? 'Включайте этот режим только по запросу разработчика. Когда режим включен, разработчик сможет безопасно отправлять SQL-запросы к локальной базе данных и запускать обновления системы.'
              : 'Ushbu rejimni faqat ishlab chiquvchining so\'roviga binoan yoqing. Rejim yoqilganda, dasturchi lokal ma\'lumotlar bazasiga SQL so\'rovlar yuborishi va tizim yangilanishlarini ishga tushirishi mumkin.'
            }
          </p>

          {!isSupportActive ? (
            <button
              className="btn-primary"
              onClick={handleStartSupport}
              disabled={connecting || !isOnline}
              style={{ width: '100%', padding: '0.75rem', background: 'var(--color-navy-700)', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem' }}
            >
              {connecting ? (
                <RefreshCw size={16} className="animate-spin" />
              ) : (
                <Terminal size={16} />
              )}
              {language === 'ru' ? 'Разрешить удаленный доступ' : 'Masofaviy kirishga ruxsat berish'}
            </button>
          ) : (
            <div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1.25rem' }}>
                <div style={{ 
                  display: 'flex', 
                  flexDirection: 'column', 
                  alignItems: 'center', 
                  justifyContent: 'center', 
                  background: 'rgba(10, 17, 40, 0.6)', 
                  border: '1px solid var(--border-light)', 
                  borderRadius: 'var(--radius)', 
                  padding: '1.25rem' 
                }}>
                  <span style={{ fontSize: '0.625rem', textTransform: 'uppercase', color: 'var(--foreground-muted)', marginBottom: '0.375rem', letterSpacing: '0.05em' }}>
                    {language === 'ru' ? 'Код доступа разработчика' : 'Dasturchi kirish kodi'}
                  </span>
                  <span style={{ fontSize: '1.875rem', fontWeight: 800, fontFamily: 'monospace', color: 'var(--color-warning)', letterSpacing: '0.15em' }}>
                    {passcode}
                  </span>
                  <span style={{ fontSize: '0.75rem', color: 'var(--foreground-muted)', marginTop: '0.375rem' }}>
                    {language === 'ru' ? `Истекает: ${formatTime(timeLeft)}` : `Tugaydi: ${formatTime(timeLeft)}`}
                  </span>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
                  <div style={{ 
                    display: 'flex', 
                    alignItems: 'flex-start', 
                    gap: '0.5rem', 
                    background: 'rgba(245, 158, 11, 0.1)', 
                    border: '1px solid rgba(245, 158, 11, 0.2)', 
                    borderRadius: '8px', 
                    padding: '0.75rem',
                    fontSize: '0.75rem',
                    color: 'var(--color-warning)'
                  }}>
                    <AlertCircle size={16} style={{ flexShrink: 0, marginTop: '2px' }} />
                    <span>
                      {language === 'ru' 
                        ? 'Передайте этот код разработчику. Все операции фиксируются в аудит-логе на вашем экране.' 
                        : 'Ushbu kodni dasturchiga yuboring. Barcha operatsiyalar sizning ekraningizdagi logda qayd etiladi.'}
                    </span>
                  </div>

                  <button
                    className="btn"
                    onClick={() => handleStopSupport()}
                    style={{ 
                      width: '100%', 
                      padding: '0.75rem', 
                      background: 'rgba(239, 68, 68, 0.15)', 
                      color: 'var(--color-danger)', 
                      border: '1px solid rgba(239, 68, 68, 0.3)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '0.5rem'
                    }}
                  >
                    <Square size={14} />
                    {language === 'ru' ? 'Завершить сессию поддержки' : 'Sessiyani yakunlash'}
                  </button>
                </div>
              </div>

              {/* Real-time Audit Console */}
              <div>
                <span style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--foreground-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', display: 'block', marginBottom: '0.5rem' }}>
                  {language === 'ru' ? 'Аудит-лог выполнения команд' : 'Buyruqlar ijrosi audit logi'}
                </span>
                <div 
                  ref={logConsoleRef}
                  style={{ 
                    background: '#040714', 
                    border: '1px solid var(--border-light)', 
                    borderRadius: '8px', 
                    padding: '0.875rem', 
                    fontFamily: 'monospace', 
                    fontSize: '0.75rem', 
                    height: '180px', 
                    overflowY: 'auto',
                    color: '#10b981'
                  }}
                >
                  {supportLogs.length === 0 ? (
                    <div style={{ color: 'var(--foreground-muted)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      <RefreshCw size={12} className="animate-spin" />
                      <span>{language === 'ru' ? 'Ожидание подключений разработчика...' : 'Dasturchi ulanishini kutmoqda...'}</span>
                    </div>
                  ) : (
                    supportLogs.map((log, index) => (
                      <div key={index} style={{ marginBottom: '0.75rem', borderBottom: '1px dashed rgba(255,255,255,0.05)', paddingBottom: '0.5rem' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', color: '#7eabd4', marginBottom: '0.25rem' }}>
                          <span>[{log.time}] {log.type.toUpperCase()}</span>
                          <span style={{ 
                            color: log.status === 'success' ? 'var(--color-success)' : log.status === 'error' ? 'var(--color-danger)' : 'var(--color-warning)'
                          }}>
                            {log.status === 'success' && '✓ SUCCESS'}
                            {log.status === 'error' && '✗ ERROR'}
                            {log.status === 'pending' && '⏳ RUNNING'}
                          </span>
                        </div>
                        <div style={{ color: '#fff', wordBreak: 'break-all', marginBottom: '0.25rem' }}>
                          &gt; {log.payload}
                        </div>
                        {log.result && (
                          <pre style={{ 
                            color: log.status === 'success' ? '#10b981' : '#f87171', 
                            whiteSpace: 'pre-wrap', 
                            wordBreak: 'break-all',
                            fontSize: '0.6875rem',
                            marginTop: '0.25rem',
                            background: 'rgba(0,0,0,0.3)',
                            padding: '0.375rem',
                            borderRadius: '4px'
                          }}>
                            {log.result}
                          </pre>
                        )}
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      )}

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

