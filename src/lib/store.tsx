import { createContext, useContext, useReducer, useEffect, useCallback, type ReactNode } from 'react';
import type { Deal, Payment, KPIStats, CashboxTransaction } from '@/types';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/lib/auth';
import { useLanguage } from '@/lib/language';
import { calculateKPI, calculateOverdueDays } from '@/lib/calculations';

// ─── State ────────────────────────────────────────────

interface AppState {
  deals: Deal[];
  payments: Payment[];
  cashboxTransactions: CashboxTransaction[];
  uzsRate: number;
  isLoading: boolean;
}

// ─── Actions ──────────────────────────────────────────

type AppAction =
  | { type: 'SET_DATA'; deals: Deal[]; payments: Payment[]; transactions: CashboxTransaction[] }
  | { type: 'SET_LOADING'; loading: boolean }
  | { type: 'ADD_DEAL'; deal: Deal; payments: Payment[] }
  | { type: 'ADD_PAYMENT'; payment: Payment }
  | { type: 'UPDATE_PAYMENT'; paymentId: string; updates: Partial<Payment> }
  | { type: 'UPDATE_DEAL'; dealId: string; updates: Partial<Deal> }
  | { type: 'SET_UZS_RATE'; rate: number }
  | { type: 'ADD_CASHBOX_TRANSACTION'; transaction: CashboxTransaction }
  | { type: 'SET_CASHBOX_TRANSACTIONS'; transactions: CashboxTransaction[] };

// ─── Context ──────────────────────────────────────────

interface AppContextValue {
  state: AppState;
  dispatch: React.Dispatch<AppAction>;
  refreshData: (silent?: boolean) => Promise<void>;
  getAgentDeals: (agentId: string) => Deal[];
  getAgentPayments: (agentId: string) => Payment[];
  getKPIStats: (agentId: string) => KPIStats;
  getDealPayments: (dealId: string) => Payment[];
  getDealById: (dealId: string) => Deal | undefined;
  getPaymentsByStatus: (agentId: string, status: Payment['status']) => Payment[];
  getTodayPayments: (agentId: string) => Payment[];
  getOverduePayments: (agentId: string) => Payment[];
  getUpcomingPayments: (agentId: string) => Payment[];
  getPaymentsInRange: (agentId: string, start: string, end: string) => Payment[];
  getDealsInRange: (agentId: string, start: string, end: string) => Deal[];
  addDealToSupabase: (deal: Deal, payments: Payment[]) => Promise<{ success: boolean; error?: string }>;
  updatePaymentInSupabase: (paymentId: string, updates: Partial<Payment>) => Promise<void>;
  saveUzsRate: (rate: number) => Promise<void>;
  addCashboxTransaction: (transaction: Omit<CashboxTransaction, 'id' | 'createdAt' | 'updatedAt'>) => Promise<{ success: boolean; error?: string }>;
}

const AppContext = createContext<AppContextValue | null>(null);

function appReducer(state: AppState, action: AppAction): AppState {
  switch (action.type) {
    case 'SET_DATA':
      return { ...state, deals: action.deals, payments: action.payments, cashboxTransactions: action.transactions || [], isLoading: false };
    case 'SET_LOADING':
      return { ...state, isLoading: action.loading };
    case 'ADD_DEAL':
      return { ...state, deals: [...state.deals, action.deal], payments: [...state.payments, ...action.payments] };
    case 'ADD_PAYMENT':
      return { ...state, payments: [...state.payments, action.payment] };
    case 'UPDATE_PAYMENT':
      return { ...state, payments: state.payments.map(p => p.id === action.paymentId ? { ...p, ...action.updates } : p) };
    case 'UPDATE_DEAL':
      return { ...state, deals: state.deals.map(d => d.id === action.dealId ? { ...d, ...action.updates } : d) };
    case 'SET_UZS_RATE':
      return { ...state, uzsRate: action.rate };
    case 'ADD_CASHBOX_TRANSACTION':
      return { ...state, cashboxTransactions: [action.transaction, ...state.cashboxTransactions] };
    case 'SET_CASHBOX_TRANSACTIONS':
      return { ...state, cashboxTransactions: action.transactions };
    default:
      return state;
  }
}

// ─── Helper: map Prisma row → Deal ─────────────────

function mapDeal(row: any): Deal {
  return {
    id: row.id,
    agentId: row.agentId,
    client: row.client,
    phone: row.phone,
    product: row.product,
    totalAmount: Number(row.totalAmount),
    monthlyAmount: Number(row.monthlyAmount),
    months: row.months,
    paidMonths: row.paidMonths,
    startDate: row.startDate,
    status: row.status,
    referral: row.referralName ? {
      id: `ref-${row.id}`,
      name: row.referralName,
      phone: row.referralPhone || '',
      relation: row.referralRelation || '',
    } : undefined,
    comment: row.comment || undefined,
    costPrice: row.costPrice !== null && row.costPrice !== undefined ? Number(row.costPrice) : undefined,
    downPayment: row.downPayment !== null && row.downPayment !== undefined ? Number(row.downPayment) : undefined,
  };
}

function mapPayment(row: any): Payment {
  return {
    id: row.id,
    dealId: row.dealId,
    monthNumber: row.monthNumber,
    dueDate: row.dueDate,
    paidDate: row.paidDate || undefined,
    extendedDate: row.extendedDate || undefined,
    amount: Number(row.amount),
    principalAmount: Number(row.principalAmount || 0),
    profitAmount: Number(row.profitAmount || 0),
    status: row.status,
    overdueDays: row.overdueDays || undefined,
  };
}

export function AppProvider({ children }: { children: ReactNode }) {
  const { agent, isAuthenticated } = useAuth();
  const { language } = useLanguage ? useLanguage() : { language: 'ru' };

  const [state, dispatch] = useReducer(appReducer, {
    deals: [],
    payments: [],
    cashboxTransactions: [],
    uzsRate: 12_800,
    isLoading: true,
  });

  // ── Load data from SQLite when authenticated ──

  const refreshData = useCallback(async (silent = false) => {
    if (!isAuthenticated) return;
    if (!silent) {
      dispatch({ type: 'SET_LOADING', loading: true });
    }

    try {
      let parsedDeals: Deal[] = [];
      let parsedPayments: Payment[] = [];
      let parsedTransactions: CashboxTransaction[] = [];
      let uzsRate = 12800; // default

      if (window.api) {
        if (window.api.getDeals) {
          const res = await window.api.getDeals(agent?.role === 'admin' ? null : agent?.id);
          if (res.success && res.data) {
            const rawDeals = res.data;
            parsedDeals = rawDeals.map(mapDeal);
            rawDeals.forEach((d: any) => {
              if (d.payments) {
                parsedPayments.push(...d.payments.map(mapPayment));
              }
            });
          }
        }

        if (window.api.getSettings) {
          const res = await window.api.getSettings();
          if (res.success && res.data && res.data.uzs_rate) {
            uzsRate = Number(res.data.uzs_rate);
          }
        }

        if (window.api.getCashboxTransactions) {
          const res = await window.api.getCashboxTransactions(agent?.role === 'admin' ? null : agent?.id);
          if (res.success && res.data) {
            parsedTransactions = res.data.map((t: any) => ({
              ...t,
              amount: Number(t.amount)
            }));
          }
        }
      }

      dispatch({ type: 'SET_DATA', deals: parsedDeals, payments: parsedPayments, transactions: parsedTransactions });
      dispatch({ type: 'SET_UZS_RATE', rate: uzsRate });
    } catch (err) {
      console.error('Error loading data:', err);
      if (!silent) {
        dispatch({ type: 'SET_LOADING', loading: false });
      }
    }
  }, [isAuthenticated, agent]);

  useEffect(() => {
    refreshData();
  }, [refreshData]);

  // ── SQLite CRUD helpers ──

  const addDealToSupabase = async (deal: Deal, payments: Payment[]) => {
    try {
      if (window.api && window.api.createDeal) {
        // Prepare deal for DB
        const dbDeal = {
          id: deal.id,
          agentId: deal.agentId,
          client: deal.client,
          phone: deal.phone,
          product: deal.product,
          totalAmount: deal.totalAmount,
          monthlyAmount: deal.monthlyAmount,
          months: deal.months,
          paidMonths: deal.paidMonths,
          startDate: deal.startDate,
          status: deal.status,
          referralName: deal.referral?.name || null,
          referralPhone: deal.referral?.phone || null,
          referralRelation: deal.referral?.relation || null,
          comment: deal.comment || null,
          costPrice: deal.costPrice || null,
          downPayment: deal.downPayment || null,
        };

        const dbPayments = payments.map(p => ({
          id: p.id,
          monthNumber: p.monthNumber,
          dueDate: p.dueDate,
          amount: p.amount,
          principalAmount: p.principalAmount,
          profitAmount: p.profitAmount,
          status: p.status,
        }));

        const dbCashboxTransactions = [];
        if (deal.downPayment && deal.downPayment > 0) {
          dbCashboxTransactions.push({
            agentId: deal.agentId,
            type: 'income',
            amount: deal.downPayment,
            category: 'down_payment',
            reason: language === 'ru'
              ? `Первоначальный взнос от: ${deal.client} (Договор: ${deal.id}) | Товар: ${deal.product}`
              : `Boshlang'ich to'lov, mijoz: ${deal.client} (Shartnoma: ${deal.id}) | Mahsulot: ${deal.product}`,
            date: deal.startDate,
          });
        }

        if (deal.costPrice && deal.costPrice > 0) {
          dbCashboxTransactions.push({
            agentId: deal.agentId,
            type: 'expense',
            amount: deal.costPrice,
            category: 'cost_price',
            reason: language === 'ru'
              ? `Вычет себестоимости за товар: ${deal.product} для клиента: ${deal.client} (Договор: ${deal.id})`
              : `Mahsulot tannarxi: ${deal.product}, mijoz: ${deal.client} (Shartnoma: ${deal.id})`,
            date: deal.startDate,
          });
        }

        const res = await window.api.createDeal(dbDeal, dbPayments, dbCashboxTransactions);
        if (!res.success) return { success: false, error: res.error };
      }

      await refreshData(true);
      return { success: true };
    } catch (err: any) {
      return { success: false, error: err.message };
    }
  };

  const updatePaymentInSupabase = async (paymentId: string, updates: Partial<Payment>) => {
    console.log('[DEBUG] updatePaymentInSupabase called for paymentId:', paymentId, 'with updates:', updates);
    try {
      if (updates.status === 'paid') {
        const payment = state.payments.find(p => p.id === paymentId);
        const deal = state.deals.find(d => d.id === payment?.dealId);
        const processingAgentId = agent?.role === 'admin' ? null : (agent?.id || deal?.agentId || null);
        const paymentDate = updates.paidDate || new Date().toISOString().split('T')[0];
        const paidAmount = updates.amount !== undefined ? updates.amount : (payment?.amount || 0);

        if (window.api && window.api.recordPayment) {
          const res = await window.api.recordPayment(paymentId, paidAmount, processingAgentId, paymentDate, language);
          if (!res.success) {
            throw new Error(res.error || 'Failed to record payment transaction');
          }
        }
      } else {
        if (window.api && window.api.updatePayment) {
          const res = await window.api.updatePayment(paymentId, updates);
          if (!res.success) {
            throw new Error(res.error || 'Failed to update payment');
          }
        }
        dispatch({ type: 'UPDATE_PAYMENT', paymentId, updates });
      }

      // Force refresh all state values silently from database source of truth
      await refreshData(true);
    } catch (err) {
      console.error('Error updating payment:', err);
      throw err;
    }
  };

  const saveUzsRate = async (rate: number) => {
    if (window.api && window.api.updateSetting) {
      await window.api.updateSetting('uzs_rate', rate);
    }
    dispatch({ type: 'SET_UZS_RATE', rate });
  };

  const addCashboxTransaction = async (transaction: Omit<CashboxTransaction, 'id' | 'createdAt' | 'updatedAt'>) => {
    try {
      if (window.api && window.api.createCashboxTransaction) {
        const res = await window.api.createCashboxTransaction(transaction);
        if (res.success && res.data) {
          const mapped = { ...res.data, amount: Number(res.data.amount) };
          dispatch({ type: 'ADD_CASHBOX_TRANSACTION', transaction: mapped });
          return { success: true };
        }
        return { success: false, error: res.error };
      }
      return { success: false, error: 'Database API not found' };
    } catch (err: any) {
      return { success: false, error: err.message };
    }
  };

  // ── Client-side computed helpers (same as before) ──

  const getAgentDeals = (agentId: string): Deal[] => {
    if (agent?.role === 'admin') {
      return state.deals;
    }
    return state.deals.filter(d => d.agentId === agentId);
  };

  const getAgentPayments = (agentId: string): Payment[] => {
    if (agent?.role === 'admin') {
      return state.payments;
    }
    const dealIds = new Set(getAgentDeals(agentId).map(d => d.id));
    return state.payments.filter(p => dealIds.has(p.dealId));
  };

  const getKPIStats = (agentId: string): KPIStats => {
    return calculateKPI(getAgentDeals(agentId), getAgentPayments(agentId));
  };

  const getDealPayments = (dealId: string): Payment[] => {
    return state.payments.filter(p => p.dealId === dealId).sort((a, b) => a.monthNumber - b.monthNumber);
  };

  const getDealById = (dealId: string): Deal | undefined => {
    return state.deals.find(d => d.id === dealId);
  };

  const getPaymentsByStatus = (agentId: string, status: Payment['status']): Payment[] => {
    return getAgentPayments(agentId).filter(p => p.status === status);
  };

  const getTodayPayments = (agentId: string): Payment[] => {
    const today = new Date().toISOString().split('T')[0];
    return getAgentPayments(agentId).filter(p => {
      const effectiveDate = p.extendedDate || p.dueDate;
      return effectiveDate === today && p.status !== 'paid';
    });
  };

  const getOverduePayments = (agentId: string): Payment[] => {
    return getAgentPayments(agentId)
      .filter(p => p.status === 'overdue' || p.status === 'extended')
      .map(p => ({ ...p, overdueDays: calculateOverdueDays(p.dueDate, p.extendedDate) }))
      .sort((a, b) => (b.overdueDays || 0) - (a.overdueDays || 0));
  };

  const getUpcomingPayments = (agentId: string): Payment[] => {
    const now = new Date();
    const weekLater = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
    return getAgentPayments(agentId).filter(p => {
      if (p.status !== 'pending') return false;
      const due = new Date(p.dueDate);
      return due >= now && due <= weekLater;
    });
  };

  const getPaymentsInRange = (agentId: string, start: string, end: string): Payment[] => {
    const startDate = new Date(start);
    const endDate = new Date(end);
    return getAgentPayments(agentId).filter(p => {
      const due = new Date(p.dueDate);
      return due >= startDate && due <= endDate;
    });
  };

  const getDealsInRange = (agentId: string, start: string, end: string): Deal[] => {
    const paymentDealIds = new Set(getPaymentsInRange(agentId, start, end).map(p => p.dealId));
    return getAgentDeals(agentId).filter(d => paymentDealIds.has(d.id));
  };

  return (
    <AppContext.Provider
      value={{
        state,
        dispatch,
        refreshData,
        getAgentDeals,
        getAgentPayments,
        getKPIStats,
        getDealPayments,
        getDealById,
        getPaymentsByStatus,
        getTodayPayments,
        getOverduePayments,
        getUpcomingPayments,
        getPaymentsInRange,
        getDealsInRange,
        addDealToSupabase,
        updatePaymentInSupabase,
        saveUzsRate,
        addCashboxTransaction,
      }}
    >
      {children}
    </AppContext.Provider>
  );
}

export function useApp() {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error('useApp must be used within AppProvider');
  return ctx;
}
