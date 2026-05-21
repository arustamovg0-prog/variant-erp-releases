import { useState, useMemo } from 'react';
import { useApp } from '@/lib/store';
import { useAuth } from '@/lib/auth';
import { useLanguage } from '@/lib/language';
import { calculateClientTrustScore, formatAmount, calculateOverdueDays } from '@/lib/calculations';
import ClientProfileModal from '@/components/shared/ClientProfileModal';
import DealModal from '@/components/shared/DealModal';
import { Users, Search, Shield, User, Phone, Briefcase, FileText, Activity } from 'lucide-react';
import type { Deal, Payment } from '@/types';

export default function Clients() {
  const { agent } = useAuth();
  const { t, language } = useLanguage();
  const { getAgentDeals, getAgentPayments } = useApp();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedClient, setSelectedClient] = useState<{name: string, phone: string} | null>(null);
  const [selectedDealId, setSelectedDealId] = useState<string | null>(null);

  if (!agent) return null;

  const agentDeals = getAgentDeals(agent.id);
  const agentPayments = getAgentPayments(agent.id);

  const clientsList = useMemo(() => {
    const clientsMap = new Map<string, {
      name: string;
      phone: string;
      deals: Deal[];
      payments: Payment[];
      referrals: Set<string>;
    }>();

    for (const deal of agentDeals) {
      const key = `${deal.client}-${deal.phone}`;
      if (!clientsMap.has(key)) {
        clientsMap.set(key, { name: deal.client, phone: deal.phone, deals: [], payments: [], referrals: new Set() });
      }
      const data = clientsMap.get(key)!;
      data.deals.push(deal);
      if (deal.referral) data.referrals.add(deal.referral.name);
    }

    for (const payment of agentPayments) {
      const deal = agentDeals.find(d => d.id === payment.dealId);
      if (deal) {
        const key = `${deal.client}-${deal.phone}`;
        clientsMap.get(key)?.payments.push(payment);
      }
    }

    return Array.from(clientsMap.values()).map(c => {
      const trustScore = calculateClientTrustScore(c.deals, c.payments);
      const totalPortfolio = c.deals.reduce((sum, d) => sum + d.totalAmount, 0);
      
      let overdueDaysCount = 0;
      let totalOverdueAmount = 0;
      
      c.payments.forEach(p => {
        if (p.status === 'overdue') {
          overdueDaysCount += calculateOverdueDays(p.dueDate, p.extendedDate);
          totalOverdueAmount += p.amount;
        }
      });
      
      const referrals = Array.from(c.referrals).join(', ');

      return {
        ...c,
        trustScore,
        totalPortfolio,
        overdueDaysCount,
        totalOverdueAmount,
        referralsStr: referrals
      };
    }).sort((a, b) => b.trustScore.score - a.trustScore.score);
  }, [agentDeals, agentPayments]);

  const filteredClients = clientsList.filter(c => 
    c.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
    c.phone.includes(searchQuery)
  );

  return (
    <div style={{ maxWidth: '1200px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
        <div>
          <h1 style={{ fontSize: '1.5rem', fontWeight: 700, marginBottom: '0.25rem' }}>
            <Users size={22} style={{ display: 'inline', verticalAlign: 'middle', marginRight: '0.5rem' }} />
            {t('clients.title')}
          </h1>
          <p style={{ fontSize: '0.875rem', color: 'var(--foreground-muted)' }}>
            {t('clients.subtitle')} • {clientsList.length} {language === 'ru' ? 'профилей' : 'ta profil'}
          </p>
        </div>
      </div>

      <div style={{ position: 'relative', marginBottom: '1.5rem' }}>
        <Search size={16} style={{ position: 'absolute', left: '0.75rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--foreground-muted)' }} />
        <input 
          className="input-field" 
          placeholder={t('clients.search_placeholder')}
          value={searchQuery} 
          onChange={e => setSearchQuery(e.target.value)} 
          style={{ paddingLeft: '2.25rem' }} 
        />
      </div>

      <div className="glass-card hide-on-mobile" style={{ overflow: 'hidden' }}>
        <div style={{ overflowX: 'auto' }}>
          <table className="data-table">
            <thead>
              <tr>
                <th>{t('clients.col_name')}</th>
                <th>{language === 'ru' ? 'Рейтинг (Trust Score)' : 'Reyting (Trust Score)'}</th>
                <th>{t('nav.deals')}</th>
                <th>{t('clients.col_total')}</th>
                <th>{t('db.overdues')}</th>
                <th>{language === 'ru' ? 'Поручитель' : 'Kafillik'}</th>
              </tr>
            </thead>
            <tbody>
              {filteredClients.map((client, idx) => (
                <tr 
                  key={idx} 
                  onClick={() => setSelectedClient({ name: client.name, phone: client.phone })}
                  style={{ cursor: 'pointer', transition: 'background 0.15s' }}
                >
                  <td>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.25rem' }}>
                      <User size={14} style={{ color: 'var(--primary)' }} />
                      <span style={{ fontWeight: 600 }}>{client.name}</span>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--foreground-muted)', fontSize: '0.75rem' }}>
                      <Phone size={12} />
                      {client.phone}
                    </div>
                  </td>
                  <td>
                    <div 
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '0.375rem',
                        padding: '0.25rem 0.625rem',
                        borderRadius: '9999px',
                        border: `1px solid ${client.trustScore.color}`,
                        background: `color-mix(in srgb, ${client.trustScore.color} 10%, transparent)`,
                      }}
                    >
                      <Shield size={14} style={{ color: client.trustScore.color }} />
                      <span style={{ fontSize: '0.75rem', fontWeight: 700, color: client.trustScore.color }}>
                        {client.trustScore.grade} ({client.trustScore.score})
                      </span>
                    </div>
                  </td>
                  <td>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.375rem', fontSize: '0.8125rem' }}>
                      <Briefcase size={14} style={{ color: 'var(--foreground-muted)' }} />
                      {client.deals.length}
                    </div>
                  </td>
                  <td style={{ fontWeight: 600, fontFamily: 'var(--font-heading)' }}>
                    {formatAmount(client.totalPortfolio)}
                  </td>
                  <td>
                    {client.totalOverdueAmount > 0 ? (
                      <div>
                        <div style={{ color: '#f87171', fontWeight: 600, fontSize: '0.8125rem' }}>
                          {formatAmount(client.totalOverdueAmount)}
                        </div>
                        <div style={{ color: '#f87171', fontSize: '0.6875rem' }}>
                          {client.overdueDaysCount} {t('common.days')} {t('db.overdues_count')}
                        </div>
                      </div>
                    ) : (
                      <span style={{ color: 'var(--foreground-muted)', fontSize: '0.8125rem' }}>{t('common.no')}</span>
                    )}
                  </td>
                  <td style={{ fontSize: '0.8125rem', color: 'var(--foreground-muted)' }}>
                    {client.referralsStr || '—'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {filteredClients.length === 0 && (
          <div style={{ padding: '3rem', textAlign: 'center', color: 'var(--foreground-muted)' }}>
            {t('clients.no_clients')}
          </div>
        )}
      </div>

      {/* Mobile Cards View */}
      <div className="hide-on-desktop" style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
        {filteredClients.map((client, idx) => (
          <div 
            key={idx} 
            className="glass-card-interactive" 
            style={{ padding: '1.25rem' }}
            onClick={() => setSelectedClient({ name: client.name, phone: client.phone })}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1rem' }}>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.25rem' }}>
                  <User size={16} style={{ color: 'var(--primary)' }} />
                  <span style={{ fontSize: '1rem', fontWeight: 600, fontFamily: 'var(--font-heading)' }}>{client.name}</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--foreground-muted)', fontSize: '0.8125rem' }}>
                  <Phone size={14} />
                  {client.phone}
                </div>
              </div>
              <div 
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '0.375rem',
                  padding: '0.25rem 0.625rem',
                  borderRadius: '9999px',
                  border: `1px solid ${client.trustScore.color}`,
                  background: `color-mix(in srgb, ${client.trustScore.color} 10%, transparent)`,
                }}
              >
                <Shield size={14} style={{ color: client.trustScore.color }} />
                <span style={{ fontSize: '0.75rem', fontWeight: 700, color: client.trustScore.color }}>
                  {client.trustScore.grade}
                </span>
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem', marginBottom: '1rem', fontSize: '0.8125rem' }}>
              <div style={{ background: 'rgba(30,58,95,0.3)', padding: '0.75rem', borderRadius: '8px' }}>
                <div style={{ color: 'var(--foreground-muted)', marginBottom: '0.25rem' }}>{t('clients.col_total')}</div>
                <div style={{ fontWeight: 600, fontFamily: 'var(--font-heading)' }}>{formatAmount(client.totalPortfolio)}</div>
              </div>
              <div style={{ background: 'rgba(30,58,95,0.3)', padding: '0.75rem', borderRadius: '8px' }}>
                <div style={{ color: 'var(--foreground-muted)', marginBottom: '0.25rem' }}>{t('db.overdues')}</div>
                {client.totalOverdueAmount > 0 ? (
                  <div style={{ color: '#f87171', fontWeight: 600 }}>{formatAmount(client.totalOverdueAmount)}</div>
                ) : (
                  <div style={{ color: 'var(--color-success)', fontWeight: 600 }}>{t('common.no')}</div>
                )}
              </div>
            </div>
            
            {client.referralsStr && (
               <div style={{ fontSize: '0.8125rem', color: 'var(--foreground-muted)', display: 'flex', alignItems: 'center', gap: '0.375rem' }}>
                 <span>{language === 'ru' ? 'Поручитель:' : 'Kafillik:'}</span>
                 <span style={{ fontWeight: 500, color: 'var(--foreground)' }}>{client.referralsStr}</span>
               </div>
            )}
          </div>
        ))}
        {filteredClients.length === 0 && (
          <div style={{ padding: '3rem', textAlign: 'center', color: 'var(--foreground-muted)' }}>
            {t('clients.no_clients')}
          </div>
        )}
      </div>

      {selectedClient && (
        <ClientProfileModal 
          clientName={selectedClient.name}
          clientPhone={selectedClient.phone}
          onClose={() => setSelectedClient(null)}
          onDealClick={(dealId) => setSelectedDealId(dealId)}
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
