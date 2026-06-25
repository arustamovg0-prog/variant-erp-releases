import { supabase } from './supabase';
import type { Deal, Payment, CashboxTransaction } from '@/types';

export function setupWebApiFallback() {
  if (window.api) return;

  console.log('Web environment detected: Falling back to Supabase backend.');

  window.api = {
    login: async (email: string, password: string) => {
      const { data, error } = await supabase.from('Agent').select('*').eq('email', email).single();
      if (error || !data) return { success: false, error: 'Пользователь не найден' };
      if (data.password !== password) return { success: false, error: 'Неверный пароль' };
      return { success: true, data };
    },
    signup: async (email: string, password: string, name: string, phone: string) => {
      const { data, error } = await supabase.from('Agent').insert({
        id: crypto.randomUUID(),
        email, password, name, role: 'agent'
      }).select().single();
      if (error) return { success: false, error: error.message };
      return { success: true, data };
    },
    getDeals: async (agentId?: string) => {
      let query = supabase.from('Deal').select('*, payments:Payment(*)');
      if (agentId) query = query.eq('agentId', agentId);
      const { data, error } = await query;
      if (error) return { success: false, error: error.message };
      return { success: true, data: data || [] };
    },
    getCashboxTransactions: async (agentId?: string) => {
      let query = supabase.from('CashboxTransaction').select('*');
      if (agentId) query = query.eq('agentId', agentId);
      const { data, error } = await query;
      if (error) return { success: false, error: error.message };
      return { success: true, data: data || [] };
    },
    getSettings: async () => {
      const { data, error } = await supabase.from('Setting').select('*');
      if (error || !data) return { success: true, data: { uzs_rate: '12800' } };
      const res: Record<string, string> = {};
      data.forEach(s => { res[s.key] = s.value; });
      return { success: true, data: res };
    },
    createDeal: async (deal: Deal, payments: Payment[]) => {
      const dealWithId = { ...deal, id: deal.id || crypto.randomUUID() };
      const { error: dErr } = await supabase.from('Deal').insert(dealWithId);
      if (dErr) return { success: false, error: dErr.message };
      if (payments && payments.length > 0) {
        const paymentsWithIds = payments.map(p => ({ ...p, id: p.id || crypto.randomUUID(), dealId: dealWithId.id }));
        const { error: pErr } = await supabase.from('Payment').insert(paymentsWithIds);
        if (pErr) return { success: false, error: pErr.message };
      }
      return { success: true };
    },
    updatePayment: async (id: string, updates: Partial<Payment>) => {
      const { error } = await supabase.from('Payment').update(updates).eq('id', id);
      if (error) return { success: false, error: error.message };
      return { success: true };
    },
    createCashboxTransaction: async (transaction: CashboxTransaction) => {
      const txWithId = { ...transaction, id: (transaction as any).id || crypto.randomUUID() };
      const { data, error } = await supabase.from('CashboxTransaction').insert(txWithId).select().single();
      if (error) return { success: false, error: error.message };
      return { success: true, data };
    },
    updateSetting: async (key: string, value: string) => {
      await supabase.from('Setting').upsert({ key, value });
      return { success: true };
    },
    // Mock the sync functions so it doesn't crash
    getLocalSyncData: async () => ({ success: false, error: 'Not available in Web version' }),
    syncLocalDb: async () => ({ success: true }),
    // Mock other electron things
    backupDatabase: async () => ({ success: false, error: 'Web version' }),
    restoreDatabase: async () => ({ success: false, error: 'Web version' }),
    importDatabase: async () => ({ success: false, error: 'Web version' }),
    getAgentAnalytics: async () => ({ success: false, error: 'Not implemented in Web' }),
    getDashboardAnalytics: async () => ({ success: false, error: 'Not implemented in Web' }),
    getAllAgents: async () => {
      const { data, error } = await supabase.from('Agent').select('*');
      if (error) return { success: false, error: error.message };
      // Build stats for each agent
      const agentsWithStats = [];
      for (const a of (data || [])) {
        const { data: deals } = await supabase.from('Deal').select('totalAmount').eq('agentId', a.id);
        agentsWithStats.push({
          ...a,
          totalDeals: deals?.length || 0,
          totalPortfolio: deals?.reduce((s: number, d: any) => s + Number(d.totalAmount || 0), 0) || 0,
          overdueAmount: 0,
        });
      }
      return { success: true, data: agentsWithStats };
    },
    getGlobalStats: async () => {
      const { data: deals } = await supabase.from('Deal').select('totalAmount');
      return { success: true, data: {
        totalDeals: deals?.length || 0,
        totalPortfolio: deals?.reduce((s: number, d: any) => s + Number(d.totalAmount || 0), 0) || 0,
        totalPaid: 0, totalOverdue: 0,
      }};
    },
    updateAgentPassword: async (agentId: string, password: string) => {
      const { error } = await supabase.from('Agent').update({ password }).eq('id', agentId);
      if (error) return { success: false, error: error.message };
      return { success: true };
    },
    updateAgent: async (agentId: string, updates: any) => {
      const { error } = await supabase.from('Agent').update(updates).eq('id', agentId);
      if (error) return { success: false, error: error.message };
      return { success: true };
    },
    deleteAgent: async (agentId: string) => {
      // Reassign deals to first admin
      const { data: admins } = await supabase.from('Agent').select('id').eq('role', 'admin').neq('id', agentId).limit(1);
      if (admins && admins.length > 0) {
        await supabase.from('Deal').update({ agentId: admins[0].id }).eq('agentId', agentId);
        await supabase.from('CashboxTransaction').update({ agentId: admins[0].id }).eq('agentId', agentId);
      }
      const { error } = await supabase.from('Agent').delete().eq('id', agentId);
      if (error) return { success: false, error: error.message };
      return { success: true };
    },
    resetDatabaseSection: async (section: string, _password: string) => {
      // Simplified: delete from Supabase in FK-safe order
      try {
        if (section === 'clients' || section === 'deals' || section === 'all') {
          await supabase.from('CashboxTransaction').delete().neq('id', '');
          await supabase.from('Payment').delete().neq('id', '');
          await supabase.from('Deal').delete().neq('id', '');
        } else if (section === 'payments') {
          await supabase.from('Payment').delete().neq('id', '');
        } else if (section === 'cashbox') {
          await supabase.from('CashboxTransaction').delete().neq('id', '');
        } else if (section === 'reports') {
          await supabase.from('Payment').delete().neq('id', '');
          await supabase.from('CashboxTransaction').delete().neq('id', '');
        }
        return { success: true };
      } catch (err: any) {
        return { success: false, error: err.message };
      }
    },
    factoryReset: async () => {
      try {
        // Delete in FK-safe order: CashboxTransaction → Payment → Deal
        const { error: e1 } = await supabase.from('CashboxTransaction').delete().neq('id', '');
        if (e1) throw e1;
        const { error: e2 } = await supabase.from('Payment').delete().neq('id', '');
        if (e2) throw e2;
        const { error: e3 } = await supabase.from('Deal').delete().neq('id', '');
        if (e3) throw e3;
        return { success: true };
      } catch (err: any) {
        return { success: false, error: err.message };
      }
    },
  };
}

