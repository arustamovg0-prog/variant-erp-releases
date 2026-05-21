import { useState, useEffect, useMemo } from 'react';
import { useApp } from '@/lib/store';
import { useAuth } from '@/lib/auth';
import { useLanguage } from '@/lib/language';
import { formatAmount, formatAmountUZSWithRate } from '@/lib/calculations';
import { 
  DollarSign, 
  ArrowUpRight, 
  ArrowDownLeft, 
  Plus, 
  Minus, 
  Activity, 
  Users, 
  Filter, 
  RefreshCw,
  Wallet,
  Settings,
  UserCheck
} from 'lucide-react';
import type { CashboxTransaction } from '@/types';

interface AgentInfo {
  id: string;
  name: string;
  role: string;
}

export default function Cashbox() {
  const { agent } = useAuth();
  const { t, language } = useLanguage();
  const { state, addCashboxTransaction, saveUzsRate } = useApp();

  const [agentsList, setAgentsList] = useState<AgentInfo[]>([]);
  const [filterAgent, setFilterAgent] = useState<string>('all');
  const [filterCategory, setFilterCategory] = useState<string>('all');
  const [filterType, setFilterType] = useState<string>('all');
  
  // Rate edit state
  const [rateInput, setRateInput] = useState<string>(String(state.uzsRate));
  const [isSavingRate, setIsSavingRate] = useState<boolean>(false);
  const [rateSaveSuccess, setRateSaveSuccess] = useState<boolean>(false);

  // Manual transaction form state
  const [txType, setTxType] = useState<'income' | 'expense'>('income');
  const [txAmount, setTxAmount] = useState<string>('');
  const [txCategory, setTxCategory] = useState<string>('other');
  const [txReason, setTxReason] = useState<string>('');
  const [txAgentId, setTxAgentId] = useState<string>(agent?.role === 'admin' ? 'admin' : agent?.id || '');
  const [isSubmittingTx, setIsSubmittingTx] = useState<boolean>(false);

  // Load agents if admin
  useEffect(() => {
    async function loadAgents() {
      if (agent?.role === 'admin' && window.api?.getAllAgents) {
        const res = await window.api.getAllAgents();
        if (res.success && res.data) {
          setAgentsList(res.data);
        }
      }
    }
    loadAgents();
  }, [agent]);

  // Keep rate input in sync with store
  useEffect(() => {
    setRateInput(String(state.uzsRate));
  }, [state.uzsRate]);

  const handleSaveRate = async () => {
    const rateVal = parseInt(rateInput, 10);
    if (isNaN(rateVal) || rateVal <= 0) {
      alert(language === 'ru' ? 'Введите корректный курс' : 'Kursor joriy qiymatini to\'g\'ri kiriting');
      return;
    }
    setIsSavingRate(true);
    try {
      await saveUzsRate(rateVal);
      setRateSaveSuccess(true);
      setTimeout(() => setRateSaveSuccess(false), 3000);
    } catch (e) {
      console.error(e);
    } finally {
      setIsSavingRate(false);
    }
  };

  const handleCreateTransaction = async (e: React.FormEvent) => {
    e.preventDefault();
    const amountVal = parseFloat(txAmount);
    if (isNaN(amountVal) || amountVal <= 0) {
      alert(language === 'ru' ? 'Введите корректную сумму' : 'Haqiqiy summani kiriting');
      return;
    }
    if (!txReason.trim()) {
      alert(language === 'ru' ? 'Введите описание транзакции' : 'Tranzaksiya tavsifini kiriting');
      return;
    }

    setIsSubmittingTx(true);
    // Map agent selection
    const targetAgentId = txAgentId === 'admin' ? null : txAgentId;

    const newTx = {
      agentId: targetAgentId,
      type: txType,
      amount: amountVal,
      category: txCategory as any,
      reason: txReason.trim(),
      dealId: null,
      date: new Date().toISOString().split('T')[0],
    };

    const res = await addCashboxTransaction(newTx);
    setIsSubmittingTx(false);
    if (res.success) {
      setTxAmount('');
      setTxReason('');
      alert(language === 'ru' ? 'Транзакция успешно записана!' : 'Tranzaksiya muvaffaqiyatli yozildi!');
    } else {
      alert((language === 'ru' ? 'Ошибка: ' : 'Xato: ') + res.error);
    }
  };

  // Agent balance handover
  const handleHandover = async (targetAgentId: string, currentBalance: number) => {
    const agentName = agentsList.find(a => a.id === targetAgentId)?.name || 'Агент';
    const confirmMsg = language === 'ru'
      ? `Вы действительно принимаете кассу у ${agentName} на сумму ${formatAmount(currentBalance)}? Баланс агента обнулится.`
      : `Haqiqatan ham ${agentName}dan ${formatAmount(currentBalance)} miqdorda kassa qabul qilasizmi? Agent balansi nolga tushadi.`;

    if (!window.confirm(confirmMsg)) return;

    // Create expense for agent to zero out agent balance
    const zeroAgentTx = {
      agentId: targetAgentId,
      type: 'expense' as const,
      amount: currentBalance,
      category: 'other' as const,
      reason: language === 'ru' 
        ? `Сдача собранной кассы администратору` 
        : `Yig'ilgan kassani administratorga topshirish`,
      dealId: null,
      date: new Date().toISOString().split('T')[0],
    };

    // Create income for admin pool (optional, but clean for tracking total company vault)
    const adminVaultTx = {
      agentId: null, // Admin general vault
      type: 'income' as const,
      amount: currentBalance,
      category: 'capital' as const,
      reason: language === 'ru'
        ? `Прием наличных от агента ${agentName}`
        : `Agent ${agentName}dan naqd pul qabul qilish`,
      dealId: null,
      date: new Date().toISOString().split('T')[0],
    };

    const res1 = await addCashboxTransaction(zeroAgentTx);
    if (res1.success) {
      await addCashboxTransaction(adminVaultTx);
      alert(language === 'ru' ? 'Касса успешно принята!' : 'Kassa muvaffaqiyatli topshirildi!');
    }
  };

  // Computations
  const transactions = state.cashboxTransactions || [];

  // Filtered transactions list
  const filteredTransactions = useMemo(() => {
    return transactions.filter(t => {
      // Agent filter
      if (filterAgent !== 'all') {
        if (filterAgent === 'admin' && t.agentId !== null) return false;
        if (filterAgent !== 'admin' && t.agentId !== filterAgent) return false;
      }
      // Category filter
      if (filterCategory !== 'all' && t.category !== filterCategory) return false;
      // Type filter
      if (filterType !== 'all' && t.type !== filterType) return false;
      return true;
    }).sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime() || b.id.localeCompare(a.id));
  }, [transactions, filterAgent, filterCategory, filterType]);

  // Balance computations
  const balances = useMemo(() => {
    let totalInflow = 0;
    let totalOutflow = 0;
    
    // Agent-specific cash list (for Admin review)
    const agentBalancesMap: Record<string, { income: number; expense: number; balance: number }> = {};
    
    // Initialize map
    agentsList.forEach(a => {
      agentBalancesMap[a.id] = { income: 0, expense: 0, balance: 0 };
    });

    transactions.forEach(t => {
      const amt = t.amount || 0;
      if (t.type === 'income') {
        totalInflow += amt;
        if (t.agentId && agentBalancesMap[t.agentId]) {
          agentBalancesMap[t.agentId].income += amt;
          agentBalancesMap[t.agentId].balance += amt;
        }
      } else {
        totalOutflow += amt;
        if (t.agentId && agentBalancesMap[t.agentId]) {
          agentBalancesMap[t.agentId].expense += amt;
          agentBalancesMap[t.agentId].balance -= amt;
        }
      }
    });

    const totalBalance = totalInflow - totalOutflow;

    // Current logged in agent/admin balance
    let myBalance = 0;
    if (agent?.role === 'admin') {
      // For admin, show net general vault balance (agentId === null)
      const myIncomes = transactions.filter(t => t.agentId === null && t.type === 'income').reduce((sum, t) => sum + t.amount, 0);
      const myExpenses = transactions.filter(t => t.agentId === null && t.type === 'expense').reduce((sum, t) => sum + t.amount, 0);
      myBalance = myIncomes - myExpenses;
    } else if (agent) {
      const myIncomes = transactions.filter(t => t.agentId === agent.id && t.type === 'income').reduce((sum, t) => sum + t.amount, 0);
      const myExpenses = transactions.filter(t => t.agentId === agent.id && t.type === 'expense').reduce((sum, t) => sum + t.amount, 0);
      myBalance = myIncomes - myExpenses;
    }

    return {
      totalInflow,
      totalOutflow,
      totalBalance,
      myBalance,
      agentBalances: Object.entries(agentBalancesMap).map(([id, val]) => ({
        id,
        name: agentsList.find(a => a.id === id)?.name || 'Агент',
        role: agentsList.find(a => a.id === id)?.role || 'agent',
        ...val
      }))
    };
  }, [transactions, agentsList, agent]);

  // Categories helper names
  const categoryNames: Record<string, string> = {
    capital: language === 'ru' ? 'Капитал / Ввод средств' : 'Kapital kiritish',
    down_payment: language === 'ru' ? 'Первоначальный взнос' : 'Boshlang\'ich to\'lov',
    payment: language === 'ru' ? 'Ежемесячный платёж' : 'Oylik to\'lov',
    cost_price: language === 'ru' ? 'Себестоимость товара' : 'Mahsulot tannarxi',
    salary: language === 'ru' ? 'Выдача зарплаты' : 'Oylik berish',
    tax: language === 'ru' ? 'Налоги / Сборы' : 'Soliq / Boj',
    other: language === 'ru' ? 'Прочее' : 'Boshqa',
  };

  const getAgentLabel = (agentId?: string | null) => {
    if (agentId === null || agentId === undefined) return language === 'ru' ? 'Офис / Сейф' : 'Ofis / Seyf';
    const found = agentsList.find(a => a.id === agentId);
    return found ? found.name : `Агент (id: ${agentId.slice(0, 4)})`;
  };

  return (
    <div style={{ maxWidth: '1200px' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
        <div>
          <h1 style={{ fontSize: '1.5rem', fontWeight: 700, marginBottom: '0.25rem' }}>
            <Wallet size={22} style={{ display: 'inline', verticalAlign: 'middle', marginRight: '0.5rem', color: 'var(--primary)' }} />
            {language === 'ru' ? 'Управление Кассой' : 'Kassani Boshqarish'}
          </h1>
          <p style={{ fontSize: '0.875rem', color: 'var(--foreground-muted)' }}>
            {language === 'ru' 
              ? 'Контроль наличных средств в обращении, расходов и сдачи кассы' 
              : 'Muomaladagi naqd pullar, xarajatlar va kassa topshirish nazorati'}
          </p>
        </div>
      </div>

      {/* KPI Cards & Exchange Rate Card */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '1rem', marginBottom: '1.5rem' }}>
        {/* Net Vault Balance */}
        <div className="glass-card" style={{ padding: '1.25rem', borderLeft: '4px solid var(--color-success)' }}>
          <div style={{ color: 'var(--foreground-muted)', fontSize: '0.75rem', fontWeight: 600, textTransform: 'uppercase', marginBottom: '0.5rem' }}>
            {agent?.role === 'admin' ? (language === 'ru' ? 'Наличность Офиса (Сейф)' : 'Ofis naqd puli (Seyf)') : (language === 'ru' ? 'Мой Баланс в руках' : 'Mening qo\'limdagi balans')}
          </div>
          <div style={{ fontSize: '1.75rem', fontWeight: 800, fontFamily: 'var(--font-heading)', color: 'var(--color-success)', marginBottom: '0.25rem' }}>
            {formatAmount(balances.myBalance)}
          </div>
          <div style={{ fontSize: '0.8125rem', color: 'var(--foreground-muted)' }}>
            {formatAmountUZSWithRate(balances.myBalance, state.uzsRate)}
          </div>
        </div>

        {/* Network Net cash - admin only */}
        {agent?.role === 'admin' && (
          <div className="glass-card" style={{ padding: '1.25rem', borderLeft: '4px solid var(--primary)' }}>
            <div style={{ color: 'var(--foreground-muted)', fontSize: '0.75rem', fontWeight: 600, textTransform: 'uppercase', marginBottom: '0.5rem' }}>
              {language === 'ru' ? 'Наличность в сети (Всего)' : 'Tarmoqdagi naqd pul (Jami)'}
            </div>
            <div style={{ fontSize: '1.75rem', fontWeight: 800, fontFamily: 'var(--font-heading)', color: 'var(--foreground)', marginBottom: '0.25rem' }}>
              {formatAmount(balances.totalBalance)}
            </div>
            <div style={{ fontSize: '0.8125rem', color: 'var(--foreground-muted)' }}>
              {formatAmountUZSWithRate(balances.totalBalance, state.uzsRate)}
            </div>
          </div>
        )}

        {/* Currency rate configuration Card */}
        <div className="glass-card" style={{ padding: '1.25rem', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
          <div style={{ color: 'var(--foreground-muted)', fontSize: '0.75rem', fontWeight: 600, textTransform: 'uppercase', marginBottom: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
            <Settings size={12} />
            {language === 'ru' ? 'Глобальный курс доллара' : 'Global dollar kursi'}
          </div>
          <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
            <div style={{ position: 'relative', flex: 1 }}>
              <input
                type="number"
                value={rateInput}
                onChange={e => setRateInput(e.target.value)}
                disabled={agent?.role !== 'admin'}
                className="input-field"
                style={{ paddingRight: '2rem', minHeight: '36px', fontSize: '0.9375rem', fontWeight: 700 }}
              />
              <span style={{ position: 'absolute', right: '0.75rem', top: '50%', transform: 'translateY(-50%)', fontSize: '0.75rem', color: 'var(--foreground-muted)', fontWeight: 600 }}>UZS</span>
            </div>
            {agent?.role === 'admin' && (
              <button
                onClick={handleSaveRate}
                disabled={isSavingRate}
                className="btn btn-primary"
                style={{ height: '36px', padding: '0 0.75rem', fontSize: '0.8125rem' }}
              >
                {isSavingRate ? <RefreshCw size={14} className="animate-spin" /> : (language === 'ru' ? 'Обновить' : 'Kursni yangilash')}
              </button>
            )}
          </div>
          {rateSaveSuccess && (
            <span style={{ color: 'var(--color-success)', fontSize: '0.6875rem', marginTop: '0.25rem', fontWeight: 600 }}>
              {language === 'ru' ? 'Курс успешно сохранен!' : 'Kurs muvaffaqiyatli saqlandi!'}
            </span>
          )}
        </div>
      </div>

      {/* Main Layout Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: agent?.role === 'admin' ? '1fr 350px' : '1fr', gap: '1.5rem', marginBottom: '1.5rem', alignItems: 'flex-start' }}>
        
        {/* Left column: Manual transaction form & Transaction List */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          
          {/* Create transaction form */}
          <div className="glass-card" style={{ padding: '1.25rem' }}>
            <h3 style={{ fontSize: '1rem', fontWeight: 700, marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <Plus size={16} style={{ color: 'var(--primary)' }} />
              {language === 'ru' ? 'Записать операцию вручную' : 'Amaliyotni qo\'lda yozish'}
            </h3>
            
            <form onSubmit={handleCreateTransaction} style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '0.875rem' }}>
              {/* Type Switcher */}
              <div>
                <label style={{ display: 'block', fontSize: '0.75rem', color: 'var(--foreground-muted)', marginBottom: '0.375rem', fontWeight: 500 }}>
                  {language === 'ru' ? 'Тип транзакции' : 'Tranzaksiya turi'}
                </label>
                <div style={{ display: 'flex', gap: '0.25rem', background: 'rgba(255,255,255,0.03)', border: '1px solid var(--border)', borderRadius: '8px', padding: '0.125rem' }}>
                  <button
                    type="button"
                    onClick={() => setTxType('income')}
                    style={{
                      flex: 1,
                      padding: '0.375rem',
                      fontSize: '0.75rem',
                      fontWeight: 600,
                      borderRadius: '6px',
                      border: 'none',
                      background: txType === 'income' ? 'rgba(16, 185, 129, 0.2)' : 'transparent',
                      color: txType === 'income' ? '#34d399' : 'var(--foreground-muted)',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '0.25rem',
                    }}
                  >
                    <ArrowUpRight size={12} />
                    {language === 'ru' ? 'Приход' : 'Kirim'}
                  </button>
                  <button
                    type="button"
                    onClick={() => setTxType('expense')}
                    style={{
                      flex: 1,
                      padding: '0.375rem',
                      fontSize: '0.75rem',
                      fontWeight: 600,
                      borderRadius: '6px',
                      border: 'none',
                      background: txType === 'expense' ? 'rgba(239, 68, 68, 0.2)' : 'transparent',
                      color: txType === 'expense' ? '#f87171' : 'var(--foreground-muted)',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '0.25rem',
                    }}
                  >
                    <ArrowDownLeft size={12} />
                    {language === 'ru' ? 'Расход' : 'Chiqim'}
                  </button>
                </div>
              </div>

              {/* Amount */}
              <div>
                <label style={{ display: 'block', fontSize: '0.75rem', color: 'var(--foreground-muted)', marginBottom: '0.375rem', fontWeight: 500 }}>
                  {language === 'ru' ? 'Сумма ($)' : 'Summa ($)'}
                </label>
                <input
                  type="number"
                  step="0.01"
                  required
                  value={txAmount}
                  onChange={e => setTxAmount(e.target.value)}
                  className="input-field"
                  placeholder="e.g. 100"
                  style={{ minHeight: '34px' }}
                />
              </div>

              {/* Category */}
              <div>
                <label style={{ display: 'block', fontSize: '0.75rem', color: 'var(--foreground-muted)', marginBottom: '0.375rem', fontWeight: 500 }}>
                  {language === 'ru' ? 'Категория' : 'Kategoriya'}
                </label>
                <select
                  value={txCategory}
                  onChange={e => setTxCategory(e.target.value)}
                  className="input-field"
                  style={{ minHeight: '34px', padding: '0.375rem 0.5rem' }}
                >
                  <option value="other">{language === 'ru' ? 'Прочее' : 'Boshqa'}</option>
                  <option value="capital">{language === 'ru' ? 'Капитал (Ввод/вывод средств)' : 'Kapital operatsiyalari'}</option>
                  <option value="salary">{language === 'ru' ? 'Выдача зарплаты' : 'Oylik berish'}</option>
                  <option value="tax">{language === 'ru' ? 'Налоги / Оплаты' : 'Soliq / Boj'}</option>
                </select>
              </div>

              {/* Assign to cashbox - admin only */}
              {agent?.role === 'admin' && (
                <div>
                  <label style={{ display: 'block', fontSize: '0.75rem', color: 'var(--foreground-muted)', marginBottom: '0.375rem', fontWeight: 500 }}>
                    {language === 'ru' ? 'Касса для записи' : 'Yozib olinadigan kassa'}
                  </label>
                  <select
                    value={txAgentId}
                    onChange={e => setTxAgentId(e.target.value)}
                    className="input-field"
                    style={{ minHeight: '34px', padding: '0.375rem 0.5rem' }}
                  >
                    <option value="admin">{language === 'ru' ? 'Сейф (Главная касса)' : 'Seyf (Bosh kassa)'}</option>
                    {agentsList.map(a => (
                      <option key={a.id} value={a.id}>{a.name} ({a.role})</option>
                    ))}
                  </select>
                </div>
              )}

              {/* Reason Description */}
              <div style={{ gridColumn: '1 / -1' }}>
                <label style={{ display: 'block', fontSize: '0.75rem', color: 'var(--foreground-muted)', marginBottom: '0.375rem', fontWeight: 500 }}>
                  {language === 'ru' ? 'Назначение платежа / Комментарий' : 'To\'lov maqsadi / Izoh'}
                </label>
                <input
                  type="text"
                  required
                  value={txReason}
                  onChange={e => setTxReason(e.target.value)}
                  className="input-field"
                  placeholder={language === 'ru' ? 'Например: Оплата аренды офиса, покупка канцтоваров' : 'Masalan: Ofis ijarasi, kantselyariya buyumlari'}
                  style={{ minHeight: '34px' }}
                />
              </div>

              <div style={{ gridColumn: '1 / -1', display: 'flex', justifyContent: 'flex-end', marginTop: '0.25rem' }}>
                <button
                  type="submit"
                  disabled={isSubmittingTx}
                  className="btn btn-primary"
                  style={{ display: 'flex', gap: '0.375rem', alignItems: 'center', minHeight: '34px', fontSize: '0.8125rem' }}
                >
                  <Plus size={14} />
                  {isSubmittingTx ? (language === 'ru' ? 'Запись...' : 'Yozilmoqda...') : (language === 'ru' ? 'Внести запись' : 'Kassaga kiritish')}
                </button>
              </div>
            </form>
          </div>

          {/* Transactions List */}
          <div className="glass-card" style={{ padding: '1.25rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem', flexWrap: 'wrap', gap: '0.75rem' }}>
              <h3 style={{ fontSize: '1rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <Activity size={16} style={{ color: 'var(--primary)' }} />
                {language === 'ru' ? 'История операций кассы' : 'Kassa tranzaksiyalari tarixi'}
              </h3>
              
              {/* List Filters */}
              <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', alignItems: 'center' }}>
                <Filter size={12} style={{ color: 'var(--foreground-muted)' }} />
                {agent?.role === 'admin' && (
                  <select
                    value={filterAgent}
                    onChange={e => setFilterAgent(e.target.value)}
                    className="input-field"
                    style={{ minHeight: '28px', padding: '0 0.375rem', fontSize: '0.75rem', width: '120px' }}
                  >
                    <option value="all">{language === 'ru' ? 'Все кассы' : 'Barcha kassalar'}</option>
                    <option value="admin">{language === 'ru' ? 'Сейф' : 'Seyf'}</option>
                    {agentsList.map(a => (
                      <option key={a.id} value={a.id}>{a.name}</option>
                    ))}
                  </select>
                )}
                
                <select
                  value={filterCategory}
                  onChange={e => setFilterCategory(e.target.value)}
                  className="input-field"
                  style={{ minHeight: '28px', padding: '0 0.375rem', fontSize: '0.75rem', width: '120px' }}
                >
                  <option value="all">{language === 'ru' ? 'Все категории' : 'Barcha toifalar'}</option>
                  <option value="capital">{language === 'ru' ? 'Капитал' : 'Kapital'}</option>
                  <option value="down_payment">{language === 'ru' ? 'Перв. взнос' : 'Boshlang\'ich to\'lov'}</option>
                  <option value="payment">{language === 'ru' ? 'Взнос по рассрочке' : 'Oylik to\'lov'}</option>
                  <option value="cost_price">{language === 'ru' ? 'Себестоимость' : 'Tannarx'}</option>
                  <option value="salary">{language === 'ru' ? 'Зарплата' : 'Oylik'}</option>
                  <option value="tax">{language === 'ru' ? 'Налоги' : 'Soliq'}</option>
                  <option value="other">{language === 'ru' ? 'Прочее' : 'Boshqa'}</option>
                </select>

                <select
                  value={filterType}
                  onChange={e => setFilterType(e.target.value)}
                  className="input-field"
                  style={{ minHeight: '28px', padding: '0 0.375rem', fontSize: '0.75rem', width: '100px' }}
                >
                  <option value="all">{language === 'ru' ? 'Все типы' : 'Barcha turlar'}</option>
                  <option value="income">{language === 'ru' ? 'Приход' : 'Kirim'}</option>
                  <option value="expense">{language === 'ru' ? 'Расход' : 'Chiqim'}</option>
                </select>
              </div>
            </div>

            {/* Desktop Table */}
            <div className="hide-on-mobile" style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.8125rem' }}>
                <thead>
                  <tr style={{ background: 'rgba(255,255,255,0.02)', textAlign: 'left', borderBottom: '1px solid var(--border)' }}>
                    <th style={{ padding: '0.75rem 0.5rem', fontWeight: 600, color: 'var(--foreground-muted)' }}>{language === 'ru' ? 'Дата' : 'Sana'}</th>
                    <th style={{ padding: '0.75rem 0.5rem', fontWeight: 600, color: 'var(--foreground-muted)' }}>{language === 'ru' ? 'Касса' : 'Kassa'}</th>
                    <th style={{ padding: '0.75rem 0.5rem', fontWeight: 600, color: 'var(--foreground-muted)' }}>{language === 'ru' ? 'Категория' : 'Toifa'}</th>
                    <th style={{ padding: '0.75rem 0.5rem', fontWeight: 600, color: 'var(--foreground-muted)' }}>{language === 'ru' ? 'Описание' : 'Tavsif'}</th>
                    <th style={{ padding: '0.75rem 0.5rem', fontWeight: 600, color: 'var(--foreground-muted)', textAlign: 'right' }}>{language === 'ru' ? 'Сумма' : 'Summa'}</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredTransactions.slice(0, 50).map(t => (
                    <tr key={t.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.03)', transition: 'background 0.15s' }}>
                      <td style={{ padding: '0.75rem 0.5rem', whiteSpace: 'nowrap', color: 'var(--foreground-muted)' }}>
                        {t.date}
                      </td>
                      <td style={{ padding: '0.75rem 0.5rem', fontWeight: 500 }}>
                        {getAgentLabel(t.agentId)}
                      </td>
                      <td style={{ padding: '0.75rem 0.5rem' }}>
                        <span style={{
                          fontSize: '0.6875rem',
                          padding: '0.125rem 0.375rem',
                          borderRadius: '4px',
                          background: t.category === 'cost_price' ? 'rgba(239, 68, 68, 0.1)' : t.category === 'payment' || t.category === 'down_payment' ? 'rgba(16, 185, 129, 0.1)' : 'rgba(255,255,255,0.05)',
                          color: t.category === 'cost_price' ? '#f87171' : t.category === 'payment' || t.category === 'down_payment' ? '#34d399' : 'var(--foreground-muted)',
                        }}>
                          {categoryNames[t.category] || t.category}
                        </span>
                      </td>
                      <td style={{ padding: '0.75rem 0.5rem', color: 'var(--foreground)' }}>
                        {t.reason}
                      </td>
                      <td style={{ padding: '0.75rem 0.5rem', textAlign: 'right', fontWeight: 700, fontFamily: 'var(--font-heading)', color: t.type === 'income' ? '#34d399' : '#f87171' }}>
                        {t.type === 'income' ? '+' : '-'}{formatAmount(t.amount)}
                        <div style={{ fontSize: '0.625rem', fontWeight: 400, color: 'var(--foreground-muted)' }}>
                          {formatAmountUZSWithRate(t.amount, state.uzsRate)}
                        </div>
                      </td>
                    </tr>
                  ))}
                  {filteredTransactions.length === 0 && (
                    <tr>
                      <td colSpan={5} style={{ padding: '2rem', textAlign: 'center', color: 'var(--foreground-muted)' }}>
                        {language === 'ru' ? 'Операций не найдено' : 'Operatsiyalar topilmadi'}
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            {/* Mobile View list */}
            <div className="hide-on-desktop" style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              {filteredTransactions.slice(0, 50).map(t => (
                <div key={t.id} style={{ padding: '0.75rem', background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.04)', borderRadius: '8px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.25rem' }}>
                    <span style={{ fontWeight: 600, fontSize: '0.75rem', color: 'var(--foreground-muted)' }}>{t.date} • {getAgentLabel(t.agentId)}</span>
                    <span style={{ fontWeight: 700, fontSize: '0.875rem', color: t.type === 'income' ? '#34d399' : '#f87171' }}>
                      {t.type === 'income' ? '+' : '-'}{formatAmount(t.amount)}
                    </span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontSize: '0.8125rem' }}>{t.reason}</span>
                    <span style={{ fontSize: '0.6875rem', color: 'var(--foreground-muted)' }}>
                      {categoryNames[t.category] || t.category}
                    </span>
                  </div>
                </div>
              ))}
              {filteredTransactions.length === 0 && (
                <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--foreground-muted)', fontSize: '0.8125rem' }}>
                  {language === 'ru' ? 'Операций не найдено' : 'Operatsiyalar topilmadi'}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Right column: Admin-only Agent Balances & Handover Actions */}
        {agent?.role === 'admin' && (
          <div className="glass-card" style={{ padding: '1.25rem' }}>
            <h3 style={{ fontSize: '1rem', fontWeight: 700, marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <Users size={16} style={{ color: 'var(--primary)' }} />
              {language === 'ru' ? 'Кассы агентов' : 'Agentlar kassalari'}
            </h3>
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              {balances.agentBalances.map(ab => {
                const isOverlimit = ab.balance > 500; // Warning threshold e.g. 500$ in cash in hand
                return (
                  <div
                    key={ab.id}
                    style={{
                      background: 'rgba(255, 255, 255, 0.02)',
                      border: '1px solid rgba(255, 255, 255, 0.06)',
                      padding: '0.75rem',
                      borderRadius: '8px',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '0.5rem',
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                      <div>
                        <div style={{ fontWeight: 600, fontSize: '0.875rem' }}>{ab.name}</div>
                        <div style={{ fontSize: '0.6875rem', color: 'var(--foreground-muted)' }}>
                          {ab.role === 'admin' ? (language === 'ru' ? 'Администратор' : 'Administrator') : (language === 'ru' ? 'Агент' : 'Agent')}
                        </div>
                      </div>
                      <div style={{ textAlign: 'right' }}>
                        <div style={{ fontWeight: 800, fontSize: '1rem', color: isOverlimit ? 'var(--color-warning)' : 'var(--foreground)' }}>
                          {formatAmount(ab.balance)}
                        </div>
                        <div style={{ fontSize: '0.6875rem', color: 'var(--foreground-muted)' }}>
                          {formatAmountUZSWithRate(ab.balance, state.uzsRate)}
                        </div>
                      </div>
                    </div>

                    {/* Handover action if balance > 0 */}
                    {ab.balance > 0 && (
                      <button
                        onClick={() => handleHandover(ab.id, ab.balance)}
                        className="btn btn-secondary"
                        style={{
                          width: '100%',
                          padding: '0.375rem',
                          fontSize: '0.75rem',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          gap: '0.375rem',
                          borderColor: isOverlimit ? 'rgba(245, 158, 11, 0.3)' : 'rgba(255, 255, 255, 0.1)',
                          color: isOverlimit ? 'var(--color-warning)' : 'var(--foreground)',
                          marginTop: '0.25rem'
                        }}
                      >
                        <UserCheck size={12} />
                        {language === 'ru' ? 'Принять кассу (Обнулить)' : 'Kassani qabul qilish'}
                      </button>
                    )}
                  </div>
                );
              })}
              {balances.agentBalances.length === 0 && (
                <div style={{ padding: '1rem', textAlign: 'center', color: 'var(--foreground-muted)', fontSize: '0.8125rem' }}>
                  {language === 'ru' ? 'Агенты не найдены' : 'Agentlar topilmadi'}
                </div>
              )}
            </div>
          </div>
        )}

      </div>
    </div>
  );
}
