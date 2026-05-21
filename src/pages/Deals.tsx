import { useState } from 'react';
import html2canvas from 'html2canvas';
import { jsPDF } from 'jspdf';
import { useApp } from '@/lib/store';
import { useAuth } from '@/lib/auth';
import { useLanguage } from '@/lib/language';
import {
  formatAmount,
  formatAmountUZS,
  formatDate,
  calculateRemaining,
  calculateTotalAmount,
  calculateMonthlyPayment,
  calculateMarkup,
  addMonths,
} from '@/lib/calculations';
import StatusBadge from '@/components/shared/StatusBadge';
import DealModal from '@/components/shared/DealModal';
import type { Deal, Payment } from '@/types';
import {
  Plus,
  Search,
  X,
  DollarSign,
  User,
  Phone,
  Package,
  UserCheck,
  MessageSquare,
  Printer,
} from 'lucide-react';

export default function Deals() {
  const { agent } = useAuth();
  const { t, language } = useLanguage();
  const { getAgentDeals, state } = useApp();
  const [selectedDealId, setSelectedDealId] = useState<string | null>(null);
  const [showNewDeal, setShowNewDeal] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  if (!agent) return null;

  const agentDeals = getAgentDeals(agent.id);

  const filteredDeals = agentDeals.filter(d =>
    d.client.toLowerCase().includes(searchQuery.toLowerCase()) ||
    d.product.toLowerCase().includes(searchQuery.toLowerCase()) ||
    d.id.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div style={{ maxWidth: '1200px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
        <div>
          <h1 style={{ fontSize: '1.5rem', fontWeight: 700, marginBottom: '0.25rem' }}>{t('deals.title')}</h1>
          <p style={{ fontSize: '0.875rem', color: 'var(--foreground-muted)' }}>
            {language === 'ru' ? 'Мои сделки и рассрочки' : 'Mening shartnomalarim va muddatli to\'lovlar'} • {agentDeals.length} {language === 'ru' ? 'сделок' : 'ta shartnoma'}
          </p>
        </div>
        <button className="btn-primary" onClick={() => setShowNewDeal(true)}>
          <Plus size={16} />
          {t('deals.add_deal')}
        </button>
      </div>

      {/* Search */}
      <div style={{ position: 'relative', marginBottom: '1.5rem' }}>
        <Search size={16} style={{ position: 'absolute', left: '0.75rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--foreground-muted)' }} />
        <input 
          className="input-field" 
          placeholder={language === 'ru' ? 'Поиск по клиенту, продукту или ID...' : 'Mijoz, mahsulot yoki ID bo\'yicha qidiruv...'} 
          value={searchQuery} 
          onChange={e => setSearchQuery(e.target.value)} 
          style={{ paddingLeft: '2.25rem' }} 
        />
      </div>

      {/* Table (Desktop) */}
      <div className="glass-card hide-on-mobile" style={{ overflow: 'hidden' }}>
        <table className="data-table">
          <thead>
            <tr>
              <th>ID</th>
              <th>{t('deals.col_client')}</th>
              <th>{t('deals.col_product')}</th>
              <th>{language === 'ru' ? 'Сумма (USD)' : 'Summa (USD)'}</th>
              <th>{language === 'ru' ? 'Сумма (UZS)' : 'Summa (UZS)'}</th>
              <th>{t('deals.col_term')}</th>
              <th>{language === 'ru' ? 'Прогресс' : 'Jarayon'}</th>
              <th>{t('deals.kpi_remaining')}</th>
              <th>{t('deals.col_status')}</th>
              <th>{language === 'ru' ? 'Поручитель' : 'Kafillik'}</th>
            </tr>
          </thead>
          <tbody>
            {filteredDeals.map(deal => {
              const remaining = calculateRemaining(deal, state.payments);
              const progress = deal.months > 0 ? (deal.paidMonths / deal.months) * 100 : 0;
              return (
                <tr key={deal.id} onClick={() => setSelectedDealId(deal.id)} style={{ cursor: 'pointer' }}>
                  <td style={{ fontWeight: 600, fontFamily: 'var(--font-heading)', color: 'var(--primary)' }}>{deal.id}</td>
                  <td>
                    <div style={{ fontWeight: 600 }}>{deal.client}</div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--foreground-muted)' }}>{deal.phone}</div>
                  </td>
                  <td style={{ color: 'var(--foreground-muted)', maxWidth: '200px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{deal.product}</td>
                  <td style={{ fontWeight: 600, fontFamily: 'var(--font-heading)' }}>{formatAmount(deal.totalAmount)}</td>
                  <td style={{ fontSize: '0.8125rem', color: 'var(--foreground-muted)' }}>{formatAmountUZS(deal.totalAmount)}</td>
                  <td>{deal.months} {language === 'ru' ? 'мес.' : 'oy'}</td>
                  <td>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', minWidth: '120px' }}>
                      <div className="progress-bar" style={{ width: '80px' }}>
                        <div className="progress-fill" style={{ width: `${progress}%`, background: progress >= 100 ? 'var(--color-success)' : 'var(--primary)' }} />
                      </div>
                      <span style={{ fontSize: '0.75rem', color: 'var(--foreground-muted)', whiteSpace: 'nowrap' }}>{deal.paidMonths}/{deal.months}</span>
                    </div>
                  </td>
                  <td style={{ fontWeight: 600 }}>{formatAmount(remaining)}</td>
                  <td><StatusBadge status={deal.status} /></td>
                  <td style={{ fontSize: '0.8125rem', color: 'var(--foreground-muted)' }}>{deal.referral ? deal.referral.name : '—'}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Cards (Mobile) */}
      <div className="hide-on-desktop" style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
        {filteredDeals.map(deal => {
          const remaining = calculateRemaining(deal, state.payments);
          const progress = deal.months > 0 ? (deal.paidMonths / deal.months) * 100 : 0;
          return (
            <div 
              key={deal.id} 
              className="glass-card-interactive" 
              style={{ padding: '1.25rem' }}
              onClick={() => setSelectedDealId(deal.id)}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.75rem' }}>
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.25rem' }}>
                    <User size={16} style={{ color: 'var(--primary)' }} />
                    <span style={{ fontSize: '1rem', fontWeight: 600, fontFamily: 'var(--font-heading)' }}>{deal.client}</span>
                  </div>
                  <div style={{ fontSize: '0.8125rem', color: 'var(--foreground-muted)' }}>
                    {deal.id} • {deal.product}
                  </div>
                </div>
                <StatusBadge status={deal.status} />
              </div>
              
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem', marginBottom: '0.75rem' }}>
                <div style={{ background: 'rgba(30,58,95,0.3)', padding: '0.75rem', borderRadius: '8px' }}>
                  <div style={{ fontSize: '0.6875rem', color: 'var(--foreground-muted)', marginBottom: '0.25rem' }}>{language === 'ru' ? 'Общая сумма' : 'Umumiy summa'}</div>
                  <div style={{ fontWeight: 600, fontSize: '0.875rem' }}>{formatAmount(deal.totalAmount)}</div>
                </div>
                <div style={{ background: 'rgba(30,58,95,0.3)', padding: '0.75rem', borderRadius: '8px' }}>
                  <div style={{ fontSize: '0.6875rem', color: 'var(--foreground-muted)', marginBottom: '0.25rem' }}>{t('deals.kpi_remaining')}</div>
                  <div style={{ fontWeight: 600, fontSize: '0.875rem', color: remaining > 0 ? 'var(--foreground)' : 'var(--color-success)' }}>
                    {formatAmount(remaining)}
                  </div>
                </div>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flex: 1, marginRight: '1rem' }}>
                  <div className="progress-bar" style={{ flex: 1 }}>
                    <div className="progress-fill" style={{ width: `${progress}%`, background: progress >= 100 ? 'var(--color-success)' : 'var(--primary)' }} />
                  </div>
                  <span style={{ fontSize: '0.75rem', color: 'var(--foreground-muted)' }}>{deal.paidMonths}/{deal.months}</span>
                </div>
                <div style={{ fontSize: '0.75rem', color: 'var(--foreground-muted)' }}>
                  {deal.months} {language === 'ru' ? 'мес.' : 'oy'}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {showNewDeal && agent && <NewDealForm agentId={agent.id} onClose={() => setShowNewDeal(false)} />}
      <DealModal dealId={selectedDealId} onClose={() => setSelectedDealId(null)} />
    </div>
  );
}

// ─── New Deal Form ──────────────────────────────────

function NewDealForm({ agentId, onClose }: { agentId: string; onClose: () => void }) {
  const { addDealToSupabase } = useApp();
  const { t, language } = useLanguage();
  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState('');
  const [createdDeal, setCreatedDeal] = useState<Deal | null>(null);

  const [client, setClient] = useState('');
  const [phone, setPhone] = useState('');
  const [product, setProduct] = useState('');
  const [price, setPrice] = useState('');
  const [costPrice, setCostPrice] = useState('');
  const [downPayment, setDownPayment] = useState('');
  const [months, setMonths] = useState('6');
  const [referralName, setReferralName] = useState('');
  const [referralPhone, setReferralPhone] = useState('');
  const [referralRelation, setReferralRelation] = useState('');
  const [comment, setComment] = useState('');

  const priceNum = Number(price) || 0;
  const costPriceNum = Number(costPrice) || 0;
  const downPaymentNum = Number(downPayment) || 0;
  const monthsNum = Number(months) || 1;

  const handleCostPriceChange = (val: string) => {
    setCostPrice(val);
    const numericCost = Number(val) || 0;
    const oldCost = Number(costPrice) || 0;
    const expectedOldPrice = oldCost * 1.5;
    const currentPrice = Number(price) || 0;
    
    if (!price || currentPrice === expectedOldPrice || currentPrice === 0) {
      if (numericCost > 0) {
        setPrice(String(numericCost * 1.5));
      } else {
        setPrice('');
      }
    }
  };

  // Financed principal is retail price minus down payment
  const financedAmount = Math.max(0, priceNum - downPaymentNum);

  const markup = calculateMarkup(financedAmount, monthsNum);
  const installmentTotal = calculateTotalAmount(financedAmount, monthsNum);
  const monthlyPayment = calculateMonthlyPayment(financedAmount, monthsNum);
  const grandTotalWithMarkup = downPaymentNum + installmentTotal;

  const handleSubmit = async () => {
    if (!client || !phone || !product || !price) return;
    setIsSaving(true);
    setSaveError('');

    if (monthsNum < 1 || monthsNum > 12) {
      setSaveError(language === 'ru' 
        ? 'Срок рассрочки должен быть от 1 до 12 месяцев' 
        : 'Muddatli to\'lov muddati 1 dan 12 oygacha bo\'lishi kerak');
      setIsSaving(false);
      return;
    }
    if (downPaymentNum >= priceNum) {
      setSaveError(language === 'ru'
        ? 'Первоначальный взнос не может быть больше или равен стоимости товара'
        : 'Boshlang\'ich to\'lov mahsulot narxidan ko\'p yoki unga teng bo\'la olmaydi');
      setIsSaving(false);
      return;
    }
    if (priceNum <= 0) {
      setSaveError(language === 'ru'
        ? 'Цена товара должна быть больше нуля'
        : 'Mahsulot narxi noldan katta bo\'lishi kerak');
      setIsSaving(false);
      return;
    }
    if (costPriceNum < 0) {
      setSaveError(language === 'ru'
        ? 'Себестоимость не может быть отрицательной'
        : 'Tannarx manfiy bo\'la olmaydi');
      setIsSaving(false);
      return;
    }

    const newId = `D-${Date.now().toString(36).toUpperCase()}`;
    const startDate = new Date().toISOString().split('T')[0];

    const deal: Deal = {
      id: newId,
      agentId,
      client,
      phone,
      product,
      totalAmount: installmentTotal,
      monthlyAmount: monthlyPayment,
      months: monthsNum,
      paidMonths: 0,
      startDate,
      status: 'active',
      comment: comment || undefined,
      referral: referralName ? { id: `R-${Date.now()}`, name: referralName, phone: referralPhone, relation: referralRelation || (language === 'ru' ? 'знакомый' : 'tanish') } : undefined,
      costPrice: costPriceNum || undefined,
      downPayment: downPaymentNum || undefined,
    };

    // Calculate using exact integer cents math
    const totalPrincipalCents = Math.round(Math.max(0, costPriceNum - downPaymentNum) * 100);
    const totalInstallmentCents = Math.round(installmentTotal * 100);
    const totalProfitCents = Math.max(0, totalInstallmentCents - totalPrincipalCents);

    const payments: Payment[] = [];
    let accumulatedPrincipalCents = 0;
    let accumulatedProfitCents = 0;

    for (let i = 1; i <= monthsNum; i++) {
      let pCents = 0;
      let prCents = 0;
      let amtCents = 0;

      if (i === monthsNum) {
        // Last month: allocate remainders
        amtCents = totalInstallmentCents - (Math.round(monthlyPayment * 100) * (monthsNum - 1));
        pCents = totalPrincipalCents - accumulatedPrincipalCents;
        prCents = amtCents - pCents;
      } else {
        // Normal month
        amtCents = Math.round(monthlyPayment * 100);
        if (totalInstallmentCents > 0) {
          pCents = Math.round((totalPrincipalCents / totalInstallmentCents) * amtCents);
        } else {
          pCents = 0;
        }
        prCents = amtCents - pCents;
        accumulatedPrincipalCents += pCents;
        accumulatedProfitCents += prCents;
      }

      payments.push({
        id: `P-${newId}-${String(i).padStart(2, '0')}`,
        dealId: newId,
        monthNumber: i,
        dueDate: addMonths(startDate, i),
        amount: amtCents / 100,
        principalAmount: pCents / 100,
        profitAmount: prCents / 100,
        status: 'pending',
      });
    }

    const result = await addDealToSupabase(deal, payments);
    setIsSaving(false);
    if (result.success) {
      setCreatedDeal(deal);
    } else {
      setSaveError(result.error || (language === 'ru' ? 'Ошибка при сохранении' : 'Saqlashda xatolik yuz berdi'));
    }
  };

  if (createdDeal) {
    const totalWithMarkup = (createdDeal.downPayment || 0) + createdDeal.totalAmount;

    const handlePrintAndDownload = async () => {
      // 1. Open standard print dialog
      window.print();

      // 2. Generate and download PDF
      const element = document.getElementById('print-contract-area');
      if (!element) return;

      try {
        const clone = element.cloneNode(true) as HTMLElement;
        clone.style.position = 'absolute';
        clone.style.left = '-9999px';
        clone.style.top = '-9999px';
        clone.style.width = '148mm';
        clone.style.height = '210mm';
        clone.style.padding = '15mm';
        clone.style.boxSizing = 'border-box';
        clone.style.background = 'white';
        clone.style.color = 'black';
        clone.style.border = '1px solid black';
        clone.style.borderRadius = '0';
        clone.style.boxShadow = 'none';

        // Ensure white background and black text on all cloned nodes for clean print
        const allChildren = clone.querySelectorAll('*');
        allChildren.forEach(child => {
          const htmlChild = child as HTMLElement;
          htmlChild.style.color = 'black';
          htmlChild.style.borderColor = 'black';
          htmlChild.style.backgroundColor = 'transparent';
        });

        document.body.appendChild(clone);

        const canvas = await html2canvas(clone, {
          scale: 2,
          useCORS: true,
          backgroundColor: '#ffffff'
        });

        const imgData = canvas.toDataURL('image/jpeg', 0.95);
        const pdf = new jsPDF({
          orientation: 'portrait',
          unit: 'mm',
          format: 'a5'
        });

        pdf.addImage(imgData, 'JPEG', 0, 0, 148, 210);
        
        const clientNameSafe = createdDeal.client ? createdDeal.client.replace(/[^a-zA-Z0-9а-яА-Я]/g, '_') : 'client';
        pdf.save(`dogovor_${createdDeal.id}_${clientNameSafe}.pdf`);
        
        document.body.removeChild(clone);
      } catch (err) {
        console.error('Error generating PDF:', err);
      }
    };

    return (
      <div className="modal-overlay" onClick={onClose}>
        <div className="modal-content" onClick={e => e.stopPropagation()} style={{ maxWidth: '560px' }}>
          <style>{`
            @media print {
              body * {
                visibility: hidden !important;
              }
              #print-contract-area, #print-contract-area * {
                visibility: visible !important;
              }
              #print-contract-area {
                position: fixed !important;
                left: 0 !important;
                top: 0 !important;
                width: 148mm !important;
                height: 210mm !important;
                padding: 15mm !important;
                margin: 0 !important;
                box-sizing: border-box !important;
                background: white !important;
                color: black !important;
                font-family: 'Times New Roman', Times, serif !important;
                font-size: 10pt !important;
                border: 1px solid black !important;
                box-shadow: none !important;
                border-radius: 0 !important;
              }
              #print-contract-area * {
                color: black !important;
                border-color: black !important;
                background: transparent !important;
              }
              #print-contract-area div {
                border-color: black !important;
              }
              #print-contract-area span {
                color: #444 !important;
              }
              #print-contract-area strong {
                color: black !important;
              }
            }
          `}</style>
          
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '1rem 1.25rem', borderBottom: '1px solid var(--border)' }}>
            <h2 style={{ fontSize: '1rem', fontWeight: 700, fontFamily: 'var(--font-heading)' }}>
              {language === 'ru' ? 'Договор создан' : 'Shartnoma yaratildi'}
            </h2>
            <button onClick={onClose} style={{ background: 'var(--muted)', border: '1px solid var(--border)', borderRadius: '8px', padding: '0.375rem', cursor: 'pointer', color: 'var(--foreground-muted)', display: 'flex' }}>
              <X size={16} />
            </button>
          </div>

          <div style={{ padding: '1.25rem', overflowY: 'auto', maxHeight: 'calc(85vh - 140px)' }}>
            <div id="print-contract-area" style={{
              width: '100%',
              padding: '2rem',
              background: 'var(--card)',
              border: '1px solid var(--border)',
              borderRadius: '12px',
              color: 'var(--foreground)',
              fontFamily: 'var(--font-sans)',
              boxSizing: 'border-box',
              marginBottom: '1.5rem',
              boxShadow: 'var(--shadow-lg)'
            }}>
              <div style={{ textAlign: 'center', marginBottom: '2rem', borderBottom: '2px solid var(--primary)', paddingBottom: '1rem' }}>
                <h3 style={{ fontSize: '1.3rem', fontWeight: 700, margin: 0, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--foreground)' }}>
                  {language === 'ru' ? 'ДОГОВОР РАССРОЧКИ' : 'MUDDATLI TO\'LOV SHARTNOMASI'}
                </h3>
                <div style={{ fontSize: '0.875rem', color: 'var(--foreground-muted)', marginTop: '0.375rem' }}>
                  {language === 'ru' ? `Номер договора: ${createdDeal.id}` : `Shartnoma raqami: ${createdDeal.id}`}
                </div>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', fontSize: '0.925rem' }}>
                
                {/* 1. Поручитель */}
                <div style={{ display: 'grid', gridTemplateColumns: '1.5fr 1fr', gap: '1rem', borderBottom: '1px solid var(--border)', paddingBottom: '0.75rem', marginBottom: '0.25rem' }}>
                  <div>
                    <span style={{ color: 'var(--foreground-muted)', display: 'block', fontSize: '0.75rem', fontWeight: 600, textTransform: 'uppercase' }}>1. И.Ф.О Поручителя</span>
                    <strong style={{ fontSize: '0.95rem' }}>{createdDeal.referral?.name || '—'}</strong>
                  </div>
                  <div>
                    <span style={{ color: 'var(--foreground-muted)', display: 'block', fontSize: '0.75rem', fontWeight: 600, textTransform: 'uppercase' }}>Номер тел</span>
                    <strong style={{ fontSize: '0.95rem' }}>{createdDeal.referral?.phone || '—'}</strong>
                  </div>
                </div>

                {/* 2. Клиент */}
                <div style={{ display: 'grid', gridTemplateColumns: '1.5fr 1fr', gap: '1rem', borderBottom: '1px solid var(--border)', paddingBottom: '0.75rem', marginBottom: '0.25rem' }}>
                  <div>
                    <span style={{ color: 'var(--foreground-muted)', display: 'block', fontSize: '0.75rem', fontWeight: 600, textTransform: 'uppercase' }}>2. И.Ф.О Клиента</span>
                    <strong style={{ fontSize: '0.95rem' }}>{createdDeal.client}</strong>
                  </div>
                  <div>
                    <span style={{ color: 'var(--foreground-muted)', display: 'block', fontSize: '0.75rem', fontWeight: 600, textTransform: 'uppercase' }}>Номер тел Клиента</span>
                    <strong style={{ fontSize: '0.95rem' }}>{createdDeal.phone}</strong>
                  </div>
                </div>

                {/* 3. Товар */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr', borderBottom: '1px solid var(--border)', paddingBottom: '0.75rem', marginBottom: '0.25rem' }}>
                  <div>
                    <span style={{ color: 'var(--foreground-muted)', display: 'block', fontSize: '0.75rem', fontWeight: 600, textTransform: 'uppercase' }}>3. Наименование товара</span>
                    <strong style={{ fontSize: '0.95rem' }}>{createdDeal.product}</strong>
                  </div>
                </div>

                {/* 4 & 5. Себестоимость & Первый взнос */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', borderBottom: '1px solid var(--border)', paddingBottom: '0.75rem', marginBottom: '0.25rem' }}>
                  <div>
                    <span style={{ color: 'var(--foreground-muted)', display: 'block', fontSize: '0.75rem', fontWeight: 600, textTransform: 'uppercase' }}>4. Себестоимость товара</span>
                    <strong style={{ fontSize: '0.95rem' }}>{createdDeal.costPrice ? `${createdDeal.costPrice}$` : '—'}</strong>
                  </div>
                  <div>
                    <span style={{ color: 'var(--foreground-muted)', display: 'block', fontSize: '0.75rem', fontWeight: 600, textTransform: 'uppercase' }}>5. Первоначальный взнос</span>
                    <strong style={{ fontSize: '0.95rem' }}>{createdDeal.downPayment ? `${createdDeal.downPayment}$` : '—'}</strong>
                  </div>
                </div>

                {/* 6 & 7. Срок & Остаток долга */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', borderBottom: '1px solid var(--border)', paddingBottom: '0.75rem', marginBottom: '0.25rem' }}>
                  <div>
                    <span style={{ color: 'var(--foreground-muted)', display: 'block', fontSize: '0.75rem', fontWeight: 600, textTransform: 'uppercase' }}>6. Срок рассрочки</span>
                    <strong style={{ fontSize: '0.95rem' }}>{createdDeal.months} {language === 'ru' ? 'месяцев' : 'oy'}</strong>
                  </div>
                  <div>
                    <span style={{ color: 'var(--foreground-muted)', display: 'block', fontSize: '0.75rem', fontWeight: 600, textTransform: 'uppercase' }}>7. Остаток долга (с наценкой)</span>
                    <strong style={{ fontSize: '0.95rem', color: 'var(--primary)' }}>{createdDeal.totalAmount}$</strong>
                  </div>
                </div>

                {/* 8. Итого общая сумма */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr', borderBottom: '2px solid var(--primary)', paddingBottom: '0.75rem', marginBottom: '1rem' }}>
                  <div>
                    <span style={{ color: 'var(--foreground-muted)', display: 'block', fontSize: '0.75rem', fontWeight: 600, textTransform: 'uppercase' }}>8. Итого общая сумма (с наценкой)</span>
                    <strong style={{ fontSize: '1.1rem', color: '#10b981' }}>{totalWithMarkup}$</strong>
                  </div>
                </div>

              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '3rem', marginTop: '3.5rem' }}>
                <div>
                  <div style={{ marginBottom: '1.75rem', fontSize: '0.8125rem', fontWeight: 600, textTransform: 'uppercase', color: 'var(--foreground-muted)' }}>Подпись клиента</div>
                  <div style={{ borderBottom: '1.5px solid var(--border)', width: '100%' }}></div>
                </div>
                <div>
                  <div style={{ marginBottom: '1.75rem', fontSize: '0.8125rem', fontWeight: 600, textTransform: 'uppercase', color: 'var(--foreground-muted)' }}>Подпись Агента</div>
                  <div style={{ borderBottom: '1.5px solid var(--border)', width: '100%' }}></div>
                </div>
              </div>
            </div>

            <div style={{ display: 'flex', gap: '0.75rem', marginTop: '1rem' }}>
              <button className="btn-primary" onClick={handlePrintAndDownload} style={{ flex: 1, padding: '0.75rem' }}>
                <Printer size={16} />
                {language === 'ru' ? 'Распечатать Договор' : 'Shartnomani chop etish'}
              </button>
              <button className="btn-secondary" onClick={onClose} style={{ flex: 1, padding: '0.75rem' }}>
                {language === 'ru' ? 'Закрыть' : 'Yopish'}
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={e => e.stopPropagation()} style={{ maxWidth: '560px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '1rem 1.25rem', borderBottom: '1px solid var(--border)' }}>
          <h2 style={{ fontSize: '1rem', fontWeight: 700, fontFamily: 'var(--font-heading)' }}>{t('deals.modal_title')}</h2>
          <button onClick={onClose} style={{ background: 'var(--muted)', border: '1px solid var(--border)', borderRadius: '8px', padding: '0.375rem', cursor: 'pointer', color: 'var(--foreground-muted)', display: 'flex' }}>
            <X size={16} />
          </button>
        </div>

        <div style={{ padding: '1.25rem', overflowY: 'auto', maxHeight: 'calc(85vh - 140px)' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <SectionLabel icon={<User size={14} />} label={t('deals.step_info')} />
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
              <InputField label={t('clients.field_name')} value={client} onChange={setClient} placeholder="Алимов Бахтиёр" required />
              <InputField label={t('clients.field_phone')} value={phone} onChange={setPhone} placeholder="+998 90 111 2233" required />
            </div>

            <SectionLabel icon={<Package size={14} />} label={t('deals.col_product')} />
            <InputField label={t('deals.field_product')} value={product} onChange={setProduct} placeholder="iPhone 15 Pro Max" required />

            <SectionLabel icon={<DollarSign size={14} />} label={language === 'ru' ? 'Финансы' : 'Moliya'} />
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
              <InputField label={language === 'ru' ? 'Цена (USD)' : 'Narx (USD)'} value={price} onChange={setPrice} placeholder="1200" type="number" required />
              <InputField label={language === 'ru' ? 'Себестоимость (USD)' : 'Tannarx (USD)'} value={costPrice} onChange={handleCostPriceChange} placeholder="800" type="number" />
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
              <InputField label={language === 'ru' ? 'Первоначальный взнос (USD)' : 'Boshlang\'ich to\'lov (USD)'} value={downPayment} onChange={setDownPayment} placeholder="200" type="number" />
              <div>
                <label style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--foreground-muted)', marginBottom: '0.375rem', display: 'block' }}>{t('deals.field_months')}</label>
                <select className="input-field" value={months} onChange={e => setMonths(e.target.value)} style={{ appearance: 'none' }}>
                  {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12].map(m => <option key={m} value={m}>{m} {language === 'ru' ? 'мес.' : 'oy'}</option>)}
                </select>
              </div>
            </div>

            {priceNum > 0 && (
              <div className="glass-card" style={{ padding: '1rem' }}>
                <div style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--foreground-muted)', marginBottom: '0.625rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{language === 'ru' ? 'Расчёт рассрочки' : 'Muddatli to\'lov hisobi'}</div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem' }}>
                  <CalcRow label={language === 'ru' ? 'Себестоимость' : 'Tannarx'} value={formatAmount(costPriceNum)} />
                  <CalcRow label={language === 'ru' ? 'Первоначальный взнос' : 'Boshlang\'ich to\'lov'} value={formatAmount(downPaymentNum)} />
                  
                  <CalcRow label={language === 'ru' ? 'Остаток основного долга' : 'Asosiy qarz qoldig\'i'} value={formatAmount(financedAmount)} highlight />
                  <CalcRow label={language === 'ru' ? 'Остаток осн. долга в UZS' : 'Asosiy qarz qoldig\'i UZSda'} value={formatAmountUZS(financedAmount)} />
                  
                  <CalcRow label={language === 'ru' ? 'Наценка' : 'Ustama'} value={formatAmount(markup)} />
                  <CalcRow label={language === 'ru' ? 'Переплата' : 'Ortiqcha to\'lov'} value={financedAmount > 0 ? `${((markup / financedAmount) * 100).toFixed(1)}%` : '0.0%'} />
                  
                  <CalcRow label={language === 'ru' ? 'Остаток платежа (с наценкой)' : 'To\'lov qoldig\'i (ustama bilan)'} value={formatAmount(installmentTotal)} highlight />
                  <CalcRow label={language === 'ru' ? 'Остаток в UZS' : 'Qoldiq UZSda'} value={formatAmountUZS(installmentTotal)} />
                  
                  <CalcRow label={language === 'ru' ? 'Общая сумма товара (с наценкой)' : 'Mahsulot jami summasi (ustama bilan)'} value={formatAmount(grandTotalWithMarkup)} highlight />
                  <CalcRow label={language === 'ru' ? 'Общая сумма в UZS' : 'Jami summa UZSda'} value={formatAmountUZS(grandTotalWithMarkup)} />
                  
                  <CalcRow label={t('deals.field_monthly')} value={formatAmount(monthlyPayment)} highlight />
                  <CalcRow label={language === 'ru' ? 'В UZS/мес' : 'UZS/oyiga'} value={formatAmountUZS(monthlyPayment)} />
                </div>
              </div>
            )}

            <SectionLabel icon={<UserCheck size={14} />} label={t('deals.step_referral')} />
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
              <InputField label={t('deals.field_ref_name')} value={referralName} onChange={setReferralName} placeholder="Рахимов Фаррух" />
              <InputField label={t('deals.field_ref_phone')} value={referralPhone} onChange={setReferralPhone} placeholder="+998 90 555 1234" />
            </div>
            <InputField label={t('deals.field_ref_relation')} value={referralRelation} onChange={setReferralRelation} placeholder={language === 'ru' ? 'друг, коллега, родственник' : 'do\'st, hamkasb, qarindosh'} />

            <SectionLabel icon={<MessageSquare size={14} />} label={t('deals.col_comment')} />
            <textarea className="input-field" value={comment} onChange={e => setComment(e.target.value)} placeholder={language === 'ru' ? 'Примечания к сделке...' : 'Shartnomaga izohlar...'} rows={3} style={{ resize: 'vertical' }} />

            {saveError && (
              <div style={{ padding: '0.5rem 0.75rem', background: 'rgba(239, 68, 68, 0.1)', border: '1px solid rgba(239, 68, 68, 0.3)', borderRadius: 'var(--radius)', fontSize: '0.8125rem', color: '#f87171' }}>
                {saveError}
              </div>
            )}

            <div style={{ position: 'sticky', bottom: '-1.25rem', padding: '1rem 0', background: 'var(--card)', zIndex: 10, marginTop: '1rem', borderTop: '1px solid var(--border)' }}>
              <button className="btn-primary" onClick={handleSubmit} disabled={!client || !phone || !product || !price || isSaving} style={{ width: '100%', padding: '0.75rem', opacity: !client || !phone || !product || !price || isSaving ? 0.5 : 1 }}>
                <Plus size={16} />
                {isSaving ? (language === 'ru' ? 'Сохранение...' : 'Saqlanmoqda...') : t('deals.create_btn')}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function InputField({ label, value, onChange, placeholder, type = 'text', required }: { label: string; value: string; onChange: (v: string) => void; placeholder?: string; type?: string; required?: boolean }) {
  return (
    <div>
      <label style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--foreground-muted)', marginBottom: '0.375rem', display: 'block' }}>
        {label} {required && <span style={{ color: 'var(--color-danger)' }}>*</span>}
      </label>
      <input className="input-field" type={type} value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder} />
    </div>
  );
}

function SectionLabel({ icon, label }: { icon: React.ReactNode; label: string }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.8125rem', fontWeight: 700, fontFamily: 'var(--font-heading)', color: 'var(--foreground)', paddingTop: '0.25rem' }}>
      <span style={{ color: 'var(--primary)' }}>{icon}</span>
      {label}
    </div>
  );
}

function CalcRow({ label, value, highlight }: { label: string; value: string; highlight?: boolean }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
      <span style={{ fontSize: '0.75rem', color: 'var(--foreground-muted)' }}>{label}</span>
      <span style={{ fontSize: highlight ? '0.875rem' : '0.8125rem', fontWeight: highlight ? 700 : 500, fontFamily: 'var(--font-heading)', color: highlight ? 'var(--foreground)' : 'var(--foreground-muted)' }}>{value}</span>
    </div>
  );
}
