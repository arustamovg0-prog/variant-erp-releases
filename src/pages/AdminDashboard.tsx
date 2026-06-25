import { useState, useEffect } from 'react';
import KPICard from '@/components/shared/KPICard';
import AddAgentModal from '@/components/admin/AddAgentModal';
import FactoryResetModal from '@/components/admin/FactoryResetModal';
import { formatAmount } from '@/lib/calculations';
import { useApp } from '@/lib/store';
import { useLanguage } from '@/lib/language';
import { Briefcase, DollarSign, Users, AlertTriangle, UserPlus, Save, RefreshCw, Settings, Pencil, Trash2, Plus, X } from 'lucide-react';
import type { AgentStats } from '@/types';

export default function AdminDashboard() {
  const [stats, setStats] = useState({ totalDeals: 0, totalPortfolio: 0, totalPaid: 0, totalOverdue: 0 });
  const [agents, setAgents] = useState<AgentStats[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showFactoryReset, setShowFactoryReset] = useState(false);
  
  // Agent editing
  const [editingAgent, setEditingAgent] = useState<string | null>(null);
  const [editName, setEditName] = useState('');
  const [editEmail, setEditEmail] = useState('');
  const [editRole, setEditRole] = useState('agent');
  
  // Tabs
  const [activeTab, setActiveTab] = useState<'monitoring' | 'settings'>('monitoring');

  // Settings state
  const { state, saveUzsRate } = useApp();
  const { t, language } = useLanguage();
  const [rateInput, setRateInput] = useState(String(state.uzsRate));
  const [savedRate, setSavedRate] = useState(false);

  // Cashbox category settings
  const DEFAULT_CATEGORIES = [
    { key: 'capital', ru: 'Капитал (Ввод/вывод средств)', uz: 'Kapital operatsiyalari' },
    { key: 'salary', ru: 'Выдача зарплаты', uz: 'Oylik berish' },
    { key: 'tax', ru: 'Налоги / Оплаты', uz: 'Soliq / Boj' },
    { key: 'other', ru: 'Прочее', uz: 'Boshqa' },
  ];
  const [cashboxCategories, setCashboxCategories] = useState(DEFAULT_CATEGORIES);
  const [newCatKey, setNewCatKey] = useState('');
  const [newCatRu, setNewCatRu] = useState('');
  const [newCatUz, setNewCatUz] = useState('');
  const [catSaved, setCatSaved] = useState(false);

  const loadData = async () => {
    setIsLoading(true);
    if (window.api && window.api.getGlobalStats) {
      const statsRes = await window.api.getGlobalStats();
      if (statsRes.success) setStats(statsRes.data);
      
      const agentsRes = await window.api.getAllAgents();
      if (agentsRes.success) setAgents(agentsRes.data);
    }
    // Load cashbox categories from settings
    if (window.api && window.api.getSettings) {
      const settingsRes = await window.api.getSettings();
      if (settingsRes.success && settingsRes.data?.cashbox_categories) {
        try {
          const parsed = JSON.parse(settingsRes.data.cashbox_categories);
          if (Array.isArray(parsed) && parsed.length > 0) setCashboxCategories(parsed);
        } catch {}
      }
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

  // --- Agent edit/delete handlers ---
  const startEditAgent = (agent: AgentStats) => {
    setEditingAgent(agent.id);
    setEditName(agent.name);
    setEditEmail((agent as any).email || '');
    setEditRole(agent.role || 'agent');
  };

  const cancelEdit = () => {
    setEditingAgent(null);
    setEditName('');
    setEditEmail('');
    setEditRole('agent');
  };

  const saveAgent = async (agentId: string) => {
    const updates: any = { name: editName.trim() };
    if (editEmail.trim()) updates.email = editEmail.trim();
    updates.role = editRole;
    
    if (window.api && window.api.updateAgent) {
      const res = await window.api.updateAgent(agentId, updates);
      if (res.success) {
        cancelEdit();
        loadData();
      } else {
        alert((language === 'ru' ? 'Ошибка: ' : 'Xatolik: ') + res.error);
      }
    } else {
      alert(language === 'ru' ? 'Функция недоступна. Пожалуйста, перезапустите приложение.' : 'Funksiya mavjud emas. Iltimos, ilovani qayta ishga tushiring.');
    }
  };

  const handleDeleteAgent = async (agent: AgentStats) => {
    const msg = language === 'ru'
      ? `Удалить агента "${agent.name}"? Все его сделки будут переданы администратору.`
      : `"${agent.name}" agentni o'chirishni xohlaysizmi? Barcha shartnomalari administratorga o'tkaziladi.`;
    if (!window.confirm(msg)) return;

    if (window.api && window.api.deleteAgent) {
      const res = await window.api.deleteAgent(agent.id);
      if (res.success) {
        loadData();
      } else {
        alert((language === 'ru' ? 'Ошибка: ' : 'Xatolik: ') + res.error);
      }
    } else {
      alert(language === 'ru' ? 'Функция недоступна. Пожалуйста, перезапустите приложение.' : 'Funksiya mavjud emas. Iltimos, ilovani qayta ishga tushiring.');
    }
  };

  // --- Cashbox category handlers ---
  const addCategory = () => {
    const key = newCatKey.trim().toLowerCase().replace(/\s+/g, '_');
    if (!key || !newCatRu.trim()) return;
    if (cashboxCategories.some(c => c.key === key)) {
      alert(language === 'ru' ? 'Категория с таким ключом уже существует' : 'Bu kalit bilan toifa allaqachon mavjud');
      return;
    }
    setCashboxCategories(prev => [...prev, { key, ru: newCatRu.trim(), uz: newCatUz.trim() || newCatRu.trim() }]);
    setNewCatKey('');
    setNewCatRu('');
    setNewCatUz('');
  };

  const removeCategory = (key: string) => {
    // Don't allow removing system categories
    const system = ['down_payment', 'payment', 'cost_price'];
    if (system.includes(key)) {
      alert(language === 'ru' ? 'Системную категорию нельзя удалить' : 'Tizim toifasini o\'chirish mumkin emas');
      return;
    }
    setCashboxCategories(prev => prev.filter(c => c.key !== key));
  };

  const saveCategories = async () => {
    if (window.api && window.api.updateSetting) {
      await window.api.updateSetting('cashbox_categories', JSON.stringify(cashboxCategories));
      setCatSaved(true);
      setTimeout(() => setCatSaved(false), 2000);
    }
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
                      {/* Name — editable */}
                      <td style={{ padding: '1rem', fontWeight: 500 }}>
                        {editingAgent === agent.id ? (
                          <input className="input-field" value={editName} onChange={e => setEditName(e.target.value)} style={{ fontSize: '0.8125rem', padding: '0.25rem 0.5rem', width: '150px' }} />
                        ) : agent.name}
                      </td>
                      {/* Role — editable */}
                      <td style={{ padding: '1rem' }}>
                        {editingAgent === agent.id ? (
                          <select className="input-field" value={editRole} onChange={e => setEditRole(e.target.value)} style={{ fontSize: '0.75rem', padding: '0.2rem 0.3rem' }}>
                            <option value="agent">AGENT</option>
                            <option value="admin">ADMIN</option>
                          </select>
                        ) : (
                          <span style={{
                            padding: '0.25rem 0.5rem', borderRadius: '1rem', fontSize: '0.75rem',
                            background: agent.role === 'admin' ? 'rgba(59, 111, 160, 0.2)' : 'rgba(255, 255, 255, 0.1)',
                            color: agent.role === 'admin' ? 'var(--primary)' : 'var(--foreground-muted)'
                          }}>
                            {agent.role.toUpperCase()}
                          </span>
                        )}
                      </td>
                      <td style={{ padding: '1rem' }}>{agent.totalDeals}</td>
                      <td style={{ padding: '1rem', color: 'var(--color-success)' }}>{formatAmount(agent.totalPortfolio)}</td>
                      <td style={{ padding: '1rem', color: agent.overdueAmount > 0 ? 'var(--color-danger)' : 'var(--foreground-muted)' }}>
                        {formatAmount(agent.overdueAmount)}
                      </td>
                      {/* Actions */}
                      <td style={{ padding: '0.75rem' }}>
                        <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap' }}>
                          {editingAgent === agent.id ? (
                            <>
                              <button className="btn-primary" style={{ padding: '0.2rem 0.5rem', fontSize: '0.7rem' }} onClick={() => saveAgent(agent.id)}>
                                <Save size={12} /> {language === 'ru' ? 'Сохранить' : 'Saqlash'}
                              </button>
                              <button className="btn-secondary" style={{ padding: '0.2rem 0.5rem', fontSize: '0.7rem' }} onClick={cancelEdit}>
                                <X size={12} /> {language === 'ru' ? 'Отмена' : 'Bekor'}
                              </button>
                            </>
                          ) : (
                            <>
                              <button className="btn-secondary" style={{ padding: '0.2rem 0.45rem', fontSize: '0.7rem' }} title={language === 'ru' ? 'Редактировать' : 'Tahrirlash'} onClick={() => startEditAgent(agent)}>
                                <Pencil size={13} />
                              </button>
                              <button className="btn-secondary" style={{ padding: '0.2rem 0.45rem', fontSize: '0.7rem' }} onClick={async () => {
                                const newPass = window.prompt(language === 'ru' ? `Новый пароль для ${agent.name}:` : `${agent.name} uchun yangi parol:`);
                                if (newPass && newPass.trim()) {
                                  if (window.api?.updateAgentPassword) {
                                    const res = await window.api.updateAgentPassword(agent.id, newPass.trim());
                                    if (res.success) alert(language === 'ru' ? '✓ Пароль изменен' : '✓ Parol o\'zgartirildi');
                                    else alert(res.error);
                                  }
                                }
                              }}>
                                🔑
                              </button>
                              <button
                                style={{ padding: '0.2rem 0.45rem', fontSize: '0.7rem', background: 'rgba(239,68,68,0.1)', color: '#f87171', border: '1px solid rgba(239,68,68,0.2)', borderRadius: '6px', cursor: 'pointer' }}
                                title={language === 'ru' ? 'Удалить' : 'O\'chirish'}
                                onClick={() => handleDeleteAgent(agent)}
                              >
                                <Trash2 size={13} />
                              </button>
                            </>
                          )}
                        </div>
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
          
          {/* Cashbox Categories Settings */}
          <div className="glass-card" style={{ padding: '1.5rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem' }}>
              <Briefcase size={18} style={{ color: 'var(--primary)' }} />
              <h2 style={{ fontSize: '1rem', fontWeight: 700, fontFamily: 'var(--font-heading)' }}>
                {language === 'ru' ? 'Категории кассы' : 'Kassa toifalari'}
              </h2>
            </div>

            <p style={{ fontSize: '0.8125rem', color: 'var(--foreground-muted)', marginBottom: '1rem', lineHeight: 1.6 }}>
              {language === 'ru'
                ? 'Настройте категории приходов и расходов для ручных записей в кассе. Системные категории (Первоначальный взнос, Ежемесячный платёж, Себестоимость) не могут быть удалены.'
                : 'Kassadagi qo\'lda yozuvlar uchun kirim va chiqim toifalarini sozlang. Tizim toifalari (Boshlang\'ich to\'lov, Oylik to\'lov, Tannarx) o\'chirib bo\'lmaydi.'}
            </p>

            {/* Current categories */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', marginBottom: '1.25rem' }}>
              {cashboxCategories.map((cat, i) => (
                <div key={cat.key} style={{
                  display: 'flex', alignItems: 'center', gap: '0.75rem',
                  padding: '0.6rem 0.75rem', borderRadius: '8px',
                  background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)',
                }}>
                  <span style={{ fontSize: '0.75rem', color: 'var(--foreground-muted)', fontFamily: 'monospace', minWidth: '80px' }}>{cat.key}</span>
                  <span style={{ flex: 1, fontSize: '0.8125rem', fontWeight: 500 }}>{language === 'ru' ? cat.ru : cat.uz}</span>
                  {!['down_payment', 'payment', 'cost_price'].includes(cat.key) ? (
                    <button
                      onClick={() => removeCategory(cat.key)}
                      style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#f87171', padding: '0.15rem', lineHeight: 1 }}
                      title={language === 'ru' ? 'Удалить' : 'O\'chirish'}
                    >
                      <X size={15} />
                    </button>
                  ) : (
                    <span style={{ fontSize: '0.6rem', color: 'var(--foreground-muted)', padding: '0.15rem 0.4rem', background: 'rgba(255,255,255,0.05)', borderRadius: '4px' }}>
                      {language === 'ru' ? 'СИСТЕМНАЯ' : 'TIZIM'}
                    </span>
                  )}
                </div>
              ))}
            </div>

            {/* Add new category */}
            <div style={{ padding: '1rem', background: 'var(--muted)', borderRadius: '10px', marginBottom: '1rem' }}>
              <div style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--foreground-muted)', marginBottom: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                <Plus size={12} style={{ display: 'inline', verticalAlign: '-1px', marginRight: '0.3rem' }} />
                {language === 'ru' ? 'Добавить категорию' : 'Toifa qo\'shish'}
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr 2fr', gap: '0.5rem', marginBottom: '0.75rem' }}>
                <input
                  className="input-field"
                  placeholder={language === 'ru' ? 'Ключ (лат.)' : 'Kalit (lot.)'}
                  value={newCatKey}
                  onChange={e => setNewCatKey(e.target.value)}
                  style={{ fontSize: '0.8125rem', fontFamily: 'monospace' }}
                />
                <input
                  className="input-field"
                  placeholder={language === 'ru' ? 'Название (RU)' : 'Nomi (RU)'}
                  value={newCatRu}
                  onChange={e => setNewCatRu(e.target.value)}
                  style={{ fontSize: '0.8125rem' }}
                />
                <input
                  className="input-field"
                  placeholder={language === 'ru' ? 'Название (UZ)' : 'Nomi (UZ)'}
                  value={newCatUz}
                  onChange={e => setNewCatUz(e.target.value)}
                  style={{ fontSize: '0.8125rem' }}
                />
              </div>
              <button className="btn-secondary" onClick={addCategory} style={{ fontSize: '0.8125rem' }}>
                <Plus size={14} />
                {language === 'ru' ? 'Добавить' : 'Qo\'shish'}
              </button>
            </div>

            {/* Save */}
            <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
              <button className="btn-primary" onClick={saveCategories}>
                <Save size={14} />
                {language === 'ru' ? 'Сохранить категории' : 'Toifalarni saqlash'}
              </button>
              {catSaved && (
                <span style={{ fontSize: '0.8125rem', color: 'var(--color-success)', fontWeight: 600 }}>
                  {language === 'ru' ? '✓ Сохранено' : '✓ Saqlandi'}
                </span>
              )}
            </div>
          </div>
          <div className="glass-card" style={{ padding: '1.5rem', border: '1px solid rgba(239, 68, 68, 0.2)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem' }}>
              <AlertTriangle size={18} style={{ color: 'var(--color-danger)' }} />
              <h2 style={{ fontSize: '1rem', fontWeight: 700, fontFamily: 'var(--font-heading)', color: '#f87171' }}>
                {language === 'ru' ? 'Опасная зона' : 'Xavfli hudud'}
              </h2>
            </div>

            <p style={{ fontSize: '0.8125rem', color: 'var(--foreground-muted)', marginBottom: '1.25rem', lineHeight: 1.6 }}>
              {language === 'ru' 
                ? 'Полный сброс транзакционных данных платформы (Factory Reset). Удаляет все сделки, платежи и кассовые операции. Учетные записи агентов и настройки системы сохраняются.' 
                : 'Platformaning tranzaksiya ma\'lumotlarini to\'liq tozalash (Factory Reset). Barcha shartnomalar, to\'lovlar va kassa operatsiyalarini o\'chiradi. Agent hisoblar va tizim sozlamalari saqlanadi.'}
            </p>

            <button 
              onClick={() => setShowFactoryReset(true)}
              style={{
                padding: '0.7rem 1.5rem', borderRadius: '10px', fontSize: '0.8125rem',
                fontWeight: 700, border: '1px solid rgba(239,68,68,0.4)', cursor: 'pointer',
                background: 'rgba(239,68,68,0.1)', color: '#f87171',
                display: 'flex', alignItems: 'center', gap: '0.5rem',
                transition: 'all 0.2s ease',
              }}
              onMouseEnter={e => { (e.target as HTMLElement).style.background = 'rgba(239,68,68,0.2)'; }}
              onMouseLeave={e => { (e.target as HTMLElement).style.background = 'rgba(239,68,68,0.1)'; }}
            >
              <AlertTriangle size={16} />
              {language === 'ru' ? 'Factory Reset — Обнулить базу данных' : 'Factory Reset — Bazani tozalash'}
            </button>
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

      {showFactoryReset && (
        <FactoryResetModal
          onClose={() => setShowFactoryReset(false)}
          onSuccess={() => {
            setShowFactoryReset(false);
            loadData();
          }}
        />
      )}
    </div>
  );
}
