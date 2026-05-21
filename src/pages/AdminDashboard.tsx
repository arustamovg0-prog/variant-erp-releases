import { useState, useEffect } from 'react';
import KPICard from '@/components/shared/KPICard';
import AddAgentModal from '@/components/admin/AddAgentModal';
import { formatAmount } from '@/lib/calculations';
import { useApp } from '@/lib/store';
import { useLanguage } from '@/lib/language';
import { Briefcase, DollarSign, Users, AlertTriangle, UserPlus, Save, RefreshCw, Settings } from 'lucide-react';
import type { AgentStats } from '@/types';

export default function AdminDashboard() {
  const [stats, setStats] = useState({ totalDeals: 0, totalPortfolio: 0, totalPaid: 0, totalOverdue: 0 });
  const [agents, setAgents] = useState<AgentStats[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  
  // Tabs
  const [activeTab, setActiveTab] = useState<'monitoring' | 'settings'>('monitoring');

  // Settings state
  const { state, saveUzsRate } = useApp();
  const { t, language } = useLanguage();
  const [rateInput, setRateInput] = useState(String(state.uzsRate));
  const [savedRate, setSavedRate] = useState(false);

  const loadData = async () => {
    setIsLoading(true);
    if (window.api && window.api.getGlobalStats) {
      const statsRes = await window.api.getGlobalStats();
      if (statsRes.success) setStats(statsRes.data);
      
      const agentsRes = await window.api.getAllAgents();
      if (agentsRes.success) setAgents(agentsRes.data);
    }
    setIsLoading(false);
  };

  useEffect(() => {
    loadData();
  }, []);

  // Update local input if global state changes
  useEffect(() => {
    setRateInput(String(state.uzsRate));
  }, [state.uzsRate]);

  const handleSaveRate = async () => {
    const rate = Number(rateInput);
    if (rate > 0) {
      await saveUzsRate(rate);
      setSavedRate(true);
      setTimeout(() => setSavedRate(false), 2000);
    }
  };

  const handleResetRate = async () => {
    setRateInput('12800');
    await saveUzsRate(12800);
    setSavedRate(true);
    setTimeout(() => setSavedRate(false), 2000);
  };

  if (isLoading) {
    return <div style={{ color: 'var(--foreground-muted)' }}>{language === 'ru' ? 'Загрузка панели администратора...' : 'Administrator paneli yuklanmoqda...'}</div>;
  }

  return (
    <div style={{ maxWidth: '1200px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
        <div>
          <h1 style={{ fontSize: '1.5rem', fontWeight: 700, marginBottom: '0.25rem' }}>
            {language === 'ru' ? 'Панель Администратора' : 'Administrator paneli'}
          </h1>
          <p style={{ fontSize: '0.875rem', color: 'var(--foreground-muted)' }}>
            {language === 'ru' ? 'Управление агентами и настройками платформы' : 'Agentlarni va platforma sozlamalarini boshqarish'}
          </p>
        </div>
        {activeTab === 'monitoring' && (
          <div style={{ display: 'flex', gap: '1rem' }}>
            <button 
              className="btn-secondary" 
              onClick={async () => {
                if (window.api && window.api.importDatabase) {
                  const res = await window.api.importDatabase();
                  if (res.success) {
                    alert(language === 'ru' ? 'База агента успешно загружена и объединена с вашей!' : 'Agent bazasi muvaffaqiyatli yuklandi va sizniki bilan birlashtirildi!');
                    loadData(); // reload stats
                  } else if (!res.canceled) {
                    alert((language === 'ru' ? 'Ошибка при загрузке базы: ' : 'Bazani yuklashda xatolik yuz berdi: ') + res.error);
                  }
                }
              }} 
              style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}
            >
              <Users size={18} />
              {language === 'ru' ? 'Загрузить базу агента' : 'Agent bazasini yuklash'}
            </button>
            <button className="btn-primary" onClick={() => setShowAddModal(true)} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <UserPlus size={18} />
              {language === 'ru' ? 'Добавить агента' : 'Agent qo\'shish'}
            </button>
          </div>
        )}
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: '1rem', borderBottom: '1px solid var(--border)', marginBottom: '2rem' }}>
        <button
          className={`tab-btn ${activeTab === 'monitoring' ? 'tab-btn-active' : 'tab-btn-inactive'}`}
          onClick={() => setActiveTab('monitoring')}
        >
          <Users size={16} style={{ display: 'inline', marginRight: '0.5rem', verticalAlign: 'middle' }} />
          {language === 'ru' ? 'Мониторинг Агентов' : 'Agentlar monitoringi'}
        </button>
        <button
          className={`tab-btn ${activeTab === 'settings' ? 'tab-btn-active' : 'tab-btn-inactive'}`}
          onClick={() => setActiveTab('settings')}
        >
          <Settings size={16} style={{ display: 'inline', marginRight: '0.5rem', verticalAlign: 'middle' }} />
          {language === 'ru' ? 'Настройки Платформы' : 'Platforma sozlamalari'}
        </button>
      </div>

      {activeTab === 'monitoring' && (
        <>
          {/* Global KPI Grid */}
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
              gap: '1rem',
              marginBottom: '2rem',
            }}
          >
            <KPICard label={language === 'ru' ? 'Всего агентов' : 'Jami agentlar'} value={String(agents.length)} subtitle={language === 'ru' ? 'в системе' : 'tizimda'} icon={<Users size={20} />} accentColor="var(--primary)" />
            <KPICard label={language === 'ru' ? 'Общее число сделок' : 'Jami shartnomalar soni'} value={String(stats.totalDeals)} subtitle={language === 'ru' ? 'по всем агентам' : 'barcha agentlar bo\'yicha'} icon={<Briefcase size={20} />} accentColor="var(--color-info)" />
            <KPICard label={language === 'ru' ? 'Общий портфель' : 'Jami portfel'} value={formatAmount(stats.totalPortfolio)} subtitle={language === 'ru' ? 'сумма всех продаж' : 'barcha savdolar summasi'} icon={<DollarSign size={20} />} accentColor="var(--color-success)" />
            <KPICard label={language === 'ru' ? 'Общие просрочки' : 'Jami muddati o\'tganlar'} value={formatAmount(stats.totalOverdue)} subtitle={language === 'ru' ? 'сумма долгов' : 'qarzlar summasi'} icon={<AlertTriangle size={20} />} accentColor="var(--color-danger)" />
          </div>

          {/* Agents Table */}
          <div className="glass-card" style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.1)', color: 'var(--foreground-muted)' }}>
                  <th style={{ padding: '1rem', fontWeight: 600 }}>{language === 'ru' ? 'Имя агента' : 'Agent ismi'}</th>
                  <th style={{ padding: '1rem', fontWeight: 600 }}>{language === 'ru' ? 'Роль' : 'Rol'}</th>
                  <th style={{ padding: '1rem', fontWeight: 600 }}>{language === 'ru' ? 'Сделок' : 'Shartnomalar'}</th>
                  <th style={{ padding: '1rem', fontWeight: 600 }}>{language === 'ru' ? 'Портфель' : 'Portfel'}</th>
                  <th style={{ padding: '1rem', fontWeight: 600 }}>{language === 'ru' ? 'Просрочки (сумма)' : 'Kechikishlar (summa)'}</th>
                  <th style={{ padding: '1rem', fontWeight: 600 }}>{language === 'ru' ? 'Действия' : 'Amallar'}</th>
                </tr>
              </thead>
              <tbody>
                {agents.length === 0 ? (
                  <tr>
                    <td colSpan={6} style={{ padding: '2rem', textAlign: 'center', color: 'var(--foreground-muted)' }}>
                      {language === 'ru' ? 'Нет агентов в базе' : 'Bazada agentlar yo\'q'}
                    </td>
                  </tr>
                ) : (
                  agents.map((agent) => (
                    <tr key={agent.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                      <td style={{ padding: '1rem', fontWeight: 500 }}>{agent.name}</td>
                      <td style={{ padding: '1rem' }}>
                        <span style={{
                          padding: '0.25rem 0.5rem',
                          borderRadius: '1rem',
                          fontSize: '0.75rem',
                          background: agent.role === 'admin' ? 'rgba(59, 111, 160, 0.2)' : 'rgba(255, 255, 255, 0.1)',
                          color: agent.role === 'admin' ? 'var(--primary)' : 'var(--foreground-muted)'
                        }}>
                          {agent.role.toUpperCase()}
                        </span>
                      </td>
                      <td style={{ padding: '1rem' }}>{agent.totalDeals}</td>
                      <td style={{ padding: '1rem', color: 'var(--color-success)' }}>{formatAmount(agent.totalPortfolio)}</td>
                      <td style={{ padding: '1rem', color: agent.overdueAmount > 0 ? 'var(--color-danger)' : 'var(--foreground-muted)' }}>
                        {formatAmount(agent.overdueAmount)}
                      </td>
                      <td style={{ padding: '1rem' }}>
                        <button
                          className="btn-secondary"
                          style={{ padding: '0.25rem 0.5rem', fontSize: '0.75rem' }}
                          onClick={async () => {
                            const promptText = language === 'ru' ? `Введите новый пароль для агента ${agent.name}:` : `Agent ${agent.name} uchun yangi parol kiriting:`;
                            const newPass = window.prompt(promptText);
                            if (newPass && newPass.trim() !== '') {
                              if (window.api && window.api.updateAgentPassword) {
                                const res = await window.api.updateAgentPassword(agent.id, newPass.trim());
                                if (res.success) {
                                  alert(language === 'ru' ? `Пароль для ${agent.name} успешно изменен!` : `${agent.name} uchun parol muvaffaqiyatli o'zgartirildi!`);
                                } else {
                                  alert((language === 'ru' ? 'Ошибка: ' : 'Xatolik: ') + res.error);
                                }
                              }
                            }
                          }}
                        >
                          {language === 'ru' ? 'Сброс пароля' : 'Parolni tiklash'}
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </>
      )}

      {activeTab === 'settings' && (
        <div style={{ display: 'grid', gap: '1.5rem', gridTemplateColumns: '1fr' }}>
          
          {/* UZS Exchange Rate Setting */}
          <div className="glass-card" style={{ padding: '1.5rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem' }}>
              <DollarSign size={18} style={{ color: 'var(--primary)' }} />
              <h2 style={{ fontSize: '1rem', fontWeight: 700, fontFamily: 'var(--font-heading)' }}>{language === 'ru' ? 'Курс валют' : 'Valyuta kursi'}</h2>
            </div>

            <p style={{ fontSize: '0.8125rem', color: 'var(--foreground-muted)', marginBottom: '1rem', lineHeight: 1.6 }}>
              {language === 'ru' ? 'Установите текущий курс UZS за 1 USD. Этот курс глобально используется для отображения сумм в сўмах и в экспорте отчётов у всех агентов.' : '1 USD uchun joriy UZS kursini o\'rnating. Ushbu kurs tizimda so\'mdagi summalarni ko\'rsatish va barcha agentlarning hisobotlarini eksport qilishda global miqyosda qo\'llaniladi.'}
            </p>

            <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'flex-end', flexWrap: 'wrap' }}>
              <div>
                <label style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--foreground-muted)', display: 'block', marginBottom: '0.375rem' }}>
                  1 USD =
                </label>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <input
                    className="input-field"
                    type="number"
                    value={rateInput}
                    onChange={e => setRateInput(e.target.value)}
                    style={{ width: '140px', fontSize: '1rem', fontWeight: 600, fontFamily: 'var(--font-heading)' }}
                    min="1"
                    step="100"
                  />
                  <span style={{ fontSize: '0.875rem', color: 'var(--foreground-muted)', fontWeight: 500 }}>{language === 'ru' ? 'сум' : 'so\'m'}</span>
                </div>
              </div>

              <button className="btn-primary" onClick={handleSaveRate}>
                <Save size={14} />
                {language === 'ru' ? 'Сохранить' : 'Saqlash'}
              </button>

              <button className="btn-secondary" onClick={handleResetRate}>
                <RefreshCw size={14} />
                {language === 'ru' ? 'Сбросить' : 'Tiklash'}
              </button>

              {savedRate && (
                <span style={{ fontSize: '0.8125rem', color: 'var(--color-success)', fontWeight: 600, animation: 'fadeIn 0.2s ease' }}>
                  {language === 'ru' ? '✓ Сохранено' : '✓ Saqlandi'}
                </span>
              )}
            </div>

            <div style={{ marginTop: '1rem', padding: '0.75rem', background: 'var(--muted)', borderRadius: 'var(--radius)' }}>
              <div style={{ fontSize: '0.6875rem', fontWeight: 600, color: 'var(--foreground-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.5rem' }}>
                {language === 'ru' ? 'Предпросмотр' : 'Ko\'rib chiqish'}
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '0.5rem' }}>
                {[100, 500, 1000].map(usd => (
                  <div key={usd} style={{ display: 'flex', flexDirection: 'column' }}>
                    <span style={{ fontSize: '0.875rem', fontWeight: 700, fontFamily: 'var(--font-heading)' }}>${usd}</span>
                    <span style={{ fontSize: '0.75rem', color: 'var(--foreground-muted)' }}>
                      {new Intl.NumberFormat('ru-RU').format(usd * (Number(rateInput) || 0))} {language === 'ru' ? 'сум' : 'so\'m'}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
          
        </div>
      )}

      {showAddModal && (
        <AddAgentModal 
          onClose={() => setShowAddModal(false)} 
          onSuccess={() => {
            setShowAddModal(false);
            loadData(); // refresh agents list
          }} 
        />
      )}
    </div>
  );
}
