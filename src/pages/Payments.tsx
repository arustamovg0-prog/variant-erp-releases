import { useState, useMemo } from 'react';
import { useApp } from '@/lib/store';
import { useAuth } from '@/lib/auth';
import { useLanguage } from '@/lib/language';
import ClientCard from '@/components/shared/ClientCard';
import ClientProfileModal from '@/components/shared/ClientProfileModal';
import DealModal from '@/components/shared/DealModal';
import ExtendPaymentModal from '@/components/shared/ExtendPaymentModal';
import Monitoring from './Monitoring';
import type { PaymentStatus, Deal, Payment } from '@/types';
import { Users, Filter } from 'lucide-react';

type FilterStatus = 'all' | PaymentStatus;

interface ClientData {
  name: string;
  phone: string;
  deals: Deal[];
  payments: Payment[];
  status: PaymentStatus;
}

export default function Payments() {
  const { agent } = useAuth();
  const { t, language } = useLanguage();
  const { getAgentDeals, getAgentPayments } = useApp();
  
  const [activeTab, setActiveTab] = useState<'payments' | 'monitoring'>('payments');
  const [selectedClient, setSelectedClient] = useState<{name: string, phone: string} | null>(null);
  const [selectedDealId, setSelectedDealId] = useState<string | null>(null);
  const [extendingPayment, setExtendingPayment] = useState<Payment | null>(null);
  const [filter, setFilter] = useState<FilterStatus>('all');
  const [filterYear, setFilterYear] = useState<string>('all');
  const [filterMonth, setFilterMonth] = useState<string>('all');

  const filterOptions: { value: FilterStatus; label: string }[] = [
    { value: 'all', label: language === 'ru' ? 'Все' : 'Barchasi' },
    { value: 'paid', label: t('payments.status_paid') },
    { value: 'pending', label: t('payments.status_pending') },
    { value: 'overdue', label: t('payments.status_overdue') },
    { value: 'extended', label: t('payments.status_extended') },
  ];

  if (!agent) return null;

  const agentDeals = getAgentDeals(agent.id);
  const agentPayments = getAgentPayments(agent.id);

  const availableYears = useMemo(() => {
    const years = new Set<string>();
    for (const p of agentPayments) {
       const date = new Date(p.extendedDate || p.dueDate);
       years.add(date.getFullYear().toString());
    }
    const currentYear = new Date().getFullYear();
    years.add(currentYear.toString());
    years.add((currentYear + 1).toString());
    return Array.from(years).sort();
  }, [agentPayments]);

  const monthsList = [
    { value: '1', label: language === 'ru' ? 'Январь' : 'Yanvar' },
    { value: '2', label: language === 'ru' ? 'Февраль' : 'Fevral' },
    { value: '3', label: language === 'ru' ? 'Март' : 'Mart' },
    { value: '4', label: language === 'ru' ? 'Апрель' : 'Aprel' },
    { value: '5', label: language === 'ru' ? 'Май' : 'May' },
    { value: '6', label: language === 'ru' ? 'Июнь' : 'Iyun' },
    { value: '7', label: language === 'ru' ? 'Июль' : 'Iyul' },
    { value: '8', label: language === 'ru' ? 'Август' : 'Avgust' },
    { value: '9', label: language === 'ru' ? 'Сентябрь' : 'Sentabr' },
    { value: '10', label: language === 'ru' ? 'Октябрь' : 'Oktabr' },
    { value: '11', label: language === 'ru' ? 'Ноябрь' : 'Noyabr' },
    { value: '12', label: language === 'ru' ? 'Декабрь' : 'Dekabr' },
  ];

  // Group by client and apply year/month filters
  const clientsDataFilteredByTime = useMemo(() => {
    const clientsMap = new Map<string, {
      name: string;
      phone: string;
      deals: Deal[];
      allPayments: Payment[];
      filteredPayments: Payment[];
      status: PaymentStatus;
    }>();

    for (const deal of agentDeals) {
      const key = `${deal.client}-${deal.phone}`;
      if (!clientsMap.has(key)) {
        clientsMap.set(key, { name: deal.client, phone: deal.phone, deals: [], allPayments: [], filteredPayments: [], status: 'paid' });
      }
      clientsMap.get(key)!.deals.push(deal);
    }

    for (const payment of agentPayments) {
      const deal = agentDeals.find(d => d.id === payment.dealId);
      if (deal) {
        const key = `${deal.client}-${deal.phone}`;
        const clientData = clientsMap.get(key);
        if (clientData) {
          clientData.allPayments.push(payment);
          
          const date = new Date(payment.extendedDate || payment.dueDate);
          const matchYear = filterYear === 'all' || date.getFullYear().toString() === filterYear;
          const matchMonth = filterMonth === 'all' || (date.getMonth() + 1).toString() === filterMonth;
          
          if (matchYear && matchMonth) {
            clientData.filteredPayments.push(payment);
          }
        }
      }
    }

    const result = Array.from(clientsMap.values()).filter(c => c.filteredPayments.length > 0);

    for (const data of result) {
      let status: PaymentStatus = 'paid';
      const unpaidPayments = data.filteredPayments.filter(p => p.status !== 'paid');
      
      if (unpaidPayments.some(p => p.status === 'overdue')) {
        status = 'overdue';
      } else if (unpaidPayments.some(p => p.status === 'extended')) {
        status = 'extended';
      } else if (unpaidPayments.some(p => p.status === 'pending')) {
        status = 'pending';
      }
      data.status = status;
    }
    return result;
  }, [agentDeals, agentPayments, filterYear, filterMonth]);

  const filteredClients = useMemo(() => {
    let clients = [...clientsDataFilteredByTime];
    if (filter !== 'all') {
      clients = clients.filter(c => c.status === filter);
    }
    
    // Sort: overdue first, then extended, then pending, then paid
    const statusOrder: Record<string, number> = { overdue: 0, extended: 1, pending: 2, paid: 3 };
    clients.sort((a, b) => {
      const orderDiff = (statusOrder[a.status] ?? 4) - (statusOrder[b.status] ?? 4);
      if (orderDiff !== 0) return orderDiff;
      return a.name.localeCompare(b.name);
    });
    
    return clients;
  }, [clientsDataFilteredByTime, filter]);

  const statusCounts = useMemo(() => {
    const counts: Record<string, number> = { all: clientsDataFilteredByTime.length };
    for (const c of clientsDataFilteredByTime) {
      counts[c.status] = (counts[c.status] || 0) + 1;
    }
    return counts;
  }, [clientsDataFilteredByTime]);

  if (activeTab === 'monitoring') {
    return (
      <div style={{ maxWidth: '1200px' }}>
        <div style={{ marginBottom: '1.5rem' }}>
          <h1 style={{ fontSize: '1.5rem', fontWeight: 700, marginBottom: '0.25rem' }}>
            <Users size={22} style={{ display: 'inline', verticalAlign: 'middle', marginRight: '0.5rem' }} />
            {t('payments.title')}
          </h1>
          <p style={{ fontSize: '0.875rem', color: 'var(--foreground-muted)' }}>
            {t('payments.subtitle')}
          </p>
        </div>

        {/* Tab Switcher */}
        <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1.5rem', borderBottom: '1px solid var(--border)', paddingBottom: '0.5rem' }}>
          <button
            className="tab-btn tab-btn-inactive"
            onClick={() => setActiveTab('payments')}
            style={{ padding: '0.5rem 1rem', fontSize: '0.875rem' }}
          >
            {language === 'ru' ? 'Списки платежей' : 'To\'lovlar ro\'yxati'}
          </button>
          <button
            className="tab-btn tab-btn-active"
            onClick={() => setActiveTab('monitoring')}
            style={{ padding: '0.5rem 1rem', fontSize: '0.875rem' }}
          >
            {language === 'ru' ? 'Мониторинг оплат' : 'To\'lovlar monitoringi'}
          </button>
        </div>

        <Monitoring hideHeader />
      </div>
    );
  }

  return (
    <div style={{ maxWidth: '1200px' }}>
      <div style={{ marginBottom: '1.5rem' }}>
        <h1 style={{ fontSize: '1.5rem', fontWeight: 700, marginBottom: '0.25rem' }}>
          <Users size={22} style={{ display: 'inline', verticalAlign: 'middle', marginRight: '0.5rem' }} />
          {t('payments.title')}
        </h1>
        <p style={{ fontSize: '0.875rem', color: 'var(--foreground-muted)' }}>
          {t('payments.subtitle')} • {filteredClients.length} {language === 'ru' ? 'профилей' : 'ta profil'}
        </p>
      </div>

      {/* Tab Switcher */}
      <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1.5rem', borderBottom: '1px solid var(--border)', paddingBottom: '0.5rem' }}>
        <button
          className="tab-btn tab-btn-active"
          onClick={() => setActiveTab('payments')}
          style={{ padding: '0.5rem 1rem', fontSize: '0.875rem' }}
        >
          {language === 'ru' ? 'Списки платежей' : 'To\'lovlar ro\'yxati'}
        </button>
        <button
          className="tab-btn tab-btn-inactive"
          onClick={() => setActiveTab('monitoring')}
          style={{ padding: '0.5rem 1rem', fontSize: '0.875rem' }}
        >
          {language === 'ru' ? 'Мониторинг оплат' : 'To\'lovlar monitoringi'}
        </button>
      </div>

      {/* Filters */}
      <div style={{ display: 'flex', gap: '0.75rem', marginBottom: '1.5rem', flexWrap: 'wrap', alignItems: 'center' }}>
        <Filter size={14} style={{ color: 'var(--foreground-muted)' }} />
        {filterOptions.map(opt => (
          <button
            key={opt.value}
            className={`tab-btn ${filter === opt.value ? 'tab-btn-active' : 'tab-btn-inactive'}`}
            onClick={() => setFilter(opt.value)}
            style={{ fontSize: '0.8125rem' }}
          >
            {opt.label}
            <span style={{ marginLeft: '0.375rem', fontSize: '0.6875rem', opacity: 0.7 }}>
              {statusCounts[opt.value] || 0}
            </span>
          </button>
        ))}

        <div style={{ width: '1px', height: '24px', background: 'var(--border)', margin: '0 0.5rem' }} />

        <select
          value={filterYear}
          onChange={(e) => setFilterYear(e.target.value)}
          className="input-field"
          style={{ width: '120px', padding: '0.375rem 0.75rem', minHeight: '32px' }}
        >
          <option value="all">{language === 'ru' ? 'Все года' : 'Barcha yillar'}</option>
          {availableYears.map(year => (
            <option key={year} value={year}>{year}</option>
          ))}
        </select>

        <select
          value={filterMonth}
          onChange={(e) => setFilterMonth(e.target.value)}
          className="input-field"
          style={{ width: '140px', padding: '0.375rem 0.75rem', minHeight: '32px' }}
        >
          <option value="all">{language === 'ru' ? 'Все месяцы' : 'Barcha oylar'}</option>
          {monthsList.map(m => (
            <option key={m.value} value={m.value}>{m.label}</option>
          ))}
        </select>
      </div>

      {/* Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))', gap: '1rem' }}>
        {filteredClients.map(client => (
          <ClientCard 
            key={`${client.name}-${client.phone}`}
            name={client.name}
            phone={client.phone}
            deals={client.deals}
            payments={client.filteredPayments}
            allPayments={client.allPayments}
            onClick={(name, phone) => setSelectedClient({ name, phone })}
          />
        ))}
      </div>

      {filteredClients.length === 0 && (
        <div className="glass-card" style={{ padding: '3rem', textAlign: 'center', color: 'var(--foreground-muted)' }}>
          {language === 'ru' ? 'Нет клиентов с выбранным статусом платежей' : 'Tanlangan to\'lov statusiga ega mijozlar yo\'q'}
        </div>
      )}
      
      {selectedClient && (
        <ClientProfileModal 
          clientName={selectedClient.name}
          clientPhone={selectedClient.phone}
          onClose={() => setSelectedClient(null)}
          onDealClick={(dealId) => setSelectedDealId(dealId)}
        />
      )}
      
      {extendingPayment && (
        <ExtendPaymentModal 
          payment={extendingPayment}
          onClose={() => setExtendingPayment(null)}
        />
      )}

      {selectedDealId && (
        <DealModal 
          dealId={selectedDealId}
          onClose={() => setSelectedDealId(null)}
        />
      )}
    </div>
  );
}
