import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { supabase } from './supabase';
import { useAuth } from './auth';
import { useApp } from './store';

export type SyncStatus = 'idle' | 'syncing' | 'error' | 'offline';

interface SyncContextValue {
  syncStatus: SyncStatus;
  lastSynced: string | null;
  syncNow: () => Promise<void>;
  isOnline: boolean;
}

const SyncContext = createContext<SyncContextValue | null>(null);

export function SyncProvider({ children }: { children: React.ReactNode }) {
  const { agent, isAuthenticated } = useAuth();
  const { refreshData } = useApp();
  const [isOnline, setIsOnline] = useState<boolean>(navigator.onLine);
  const [syncStatus, setSyncStatus] = useState<SyncStatus>('idle');
  const [lastSynced, setLastSynced] = useState<string | null>(null);

  // Monitor network status
  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // Retrieve last synced time from localStorage
  useEffect(() => {
    const saved = localStorage.getItem('last_synced_time');
    if (saved) {
      setLastSynced(saved);
    }
  }, []);

  // The actual synchronization task
  const syncNow = useCallback(async () => {
    if (!navigator.onLine) {
      setSyncStatus('offline');
      return;
    }

    if (!isAuthenticated || !agent) {
      return;
    }

    setSyncStatus('syncing');
    console.log('[SYNC] Starting synchronization...');

    try {
      if (!window.api || !window.api.getLocalSyncData || !window.api.syncLocalDb) {
        throw new Error('Electron API is not available.');
      }

      // 1. Fetch all local SQLite data
      const localRes = await window.api.getLocalSyncData();
      if (!localRes.success || !localRes.data) {
        throw new Error(localRes.error || 'Failed to fetch local database data.');
      }

      const { agents, deals, payments, cashboxTransactions, settings } = localRes.data;

      // Helper function to upload in batches to Supabase
      const batchUpsert = async (table: string, data: any[]) => {
        if (!data || data.length === 0) return;
        const BATCH_SIZE = 100;
        for (let i = 0; i < data.length; i += BATCH_SIZE) {
          const batch = data.slice(i, i + BATCH_SIZE);
          const { error } = await supabase.from(table).upsert(batch);
          if (error) {
            console.error(`[SYNC] Error uploading batch to ${table}:`, error);
            throw new Error(`Failed to upload ${table}: ${error.message}`);
          }
        }
      };

      // 2. Map and Push local data to Supabase (ordered by foreign key dependencies)
      console.log('[SYNC] Pushing local data to Supabase...');

      const mappedAgents = agents.map((a: any) => ({
        id: a.id,
        name: a.name,
        email: a.email,
        password: a.password || '',
        role: a.role || 'agent',
        createdAt: a.createdAt ? new Date(a.createdAt).toISOString() : new Date().toISOString(),
        updatedAt: a.updatedAt ? new Date(a.updatedAt).toISOString() : new Date().toISOString(),
      }));
      await batchUpsert('Agent', mappedAgents);

      const mappedDeals = deals.map((d: any) => ({
        id: d.id,
        agentId: d.agentId,
        client: d.client,
        phone: d.phone,
        product: d.product,
        totalAmount: Number(d.totalAmount),
        monthlyAmount: Number(d.monthlyAmount),
        months: Number(d.months),
        paidMonths: Number(d.paidMonths || 0),
        startDate: d.startDate,
        status: d.status || 'active',
        comment: d.comment || null,
        referralName: d.referralName || null,
        referralPhone: d.referralPhone || null,
        referralRelation: d.referralRelation || null,
        costPrice: d.costPrice !== null && d.costPrice !== undefined ? Number(d.costPrice) : null,
        downPayment: d.downPayment !== null && d.downPayment !== undefined ? Number(d.downPayment) : null,
        createdAt: d.createdAt ? new Date(d.createdAt).toISOString() : new Date().toISOString(),
        updatedAt: d.updatedAt ? new Date(d.updatedAt).toISOString() : new Date().toISOString(),
      }));
      await batchUpsert('Deal', mappedDeals);

      const mappedPayments = payments.map((p: any) => ({
        id: p.id,
        dealId: p.dealId,
        monthNumber: Number(p.monthNumber),
        amount: Number(p.amount),
        principalAmount: Number(p.principalAmount || 0),
        profitAmount: Number(p.profitAmount || 0),
        dueDate: p.dueDate,
        paidDate: p.paidDate || null,
        extendedDate: p.extendedDate || null,
        status: p.status || 'pending',
        createdAt: p.createdAt ? new Date(p.createdAt).toISOString() : new Date().toISOString(),
        updatedAt: p.updatedAt ? new Date(p.updatedAt).toISOString() : new Date().toISOString(),
      }));
      await batchUpsert('Payment', mappedPayments);

      const mappedTransactions = cashboxTransactions.map((t: any) => ({
        id: t.id,
        agentId: t.agentId || null,
        type: t.type,
        amount: Number(t.amount),
        category: t.category,
        reason: t.reason,
        dealId: t.dealId || null,
        date: t.date,
        createdAt: t.createdAt ? new Date(t.createdAt).toISOString() : new Date().toISOString(),
        updatedAt: t.updatedAt ? new Date(t.updatedAt).toISOString() : new Date().toISOString(),
      }));
      await batchUpsert('CashboxTransaction', mappedTransactions);

      const mappedSettings = settings.map((s: any) => ({
        key: s.key,
        value: String(s.value),
        updatedAt: s.updatedAt ? new Date(s.updatedAt).toISOString() : new Date().toISOString(),
      }));
      await batchUpsert('Setting', mappedSettings);

      console.log('[SYNC] Successfully pushed local data.');

      // 3. If Admin: Pull all data from Supabase and merge locally
      if (agent.role === 'admin') {
        console.log('[SYNC] Admin detected: pulling all agent data from Supabase...');

        const getSupabaseData = async (table: string) => {
          const { data, error } = await supabase.from(table).select('*');
          if (error) {
            throw new Error(`Failed to pull ${table}: ${error.message}`);
          }
          return data || [];
        };

        const sbAgents = await getSupabaseData('Agent');
        const sbDeals = await getSupabaseData('Deal');
        const sbPayments = await getSupabaseData('Payment');
        const sbTransactions = await getSupabaseData('CashboxTransaction');
        const sbSettings = await getSupabaseData('Setting');

        console.log('[SYNC] Integrating Supabase data into local SQLite...');
        const mergeRes = await window.api.syncLocalDb({
          agents: sbAgents,
          deals: sbDeals,
          payments: sbPayments,
          cashboxTransactions: sbTransactions,
          settings: sbSettings,
        });

        if (!mergeRes.success) {
          throw new Error(mergeRes.error || 'Failed to merge Supabase data into local database.');
        }

        console.log('[SYNC] Local database merge completed successfully.');
      }

      // Refresh application React state from SQLite
      await refreshData();

      // Update sync time
      const nowStr = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }) + 
                   ' ' + new Date().toLocaleDateString();
      setLastSynced(nowStr);
      localStorage.setItem('last_synced_time', nowStr);
      setSyncStatus('idle');
      console.log('[SYNC] Sync finished successfully.');
    } catch (err: any) {
      console.error('[SYNC] Sync failed:', err);
      setSyncStatus('error');
    }
  }, [agent, isAuthenticated, refreshData]);

  // Trigger sync on login or online change
  useEffect(() => {
    if (isAuthenticated && isOnline) {
      syncNow();
    }
  }, [isAuthenticated, isOnline]);

  // Listen to manual or auto data-mutation triggers
  useEffect(() => {
    const handleTriggerSync = () => {
      if (navigator.onLine && isAuthenticated) {
        syncNow();
      }
    };
    window.addEventListener('trigger-db-sync', handleTriggerSync);
    return () => window.removeEventListener('trigger-db-sync', handleTriggerSync);
  }, [isAuthenticated, syncNow]);

  // Set up periodic sync (every 5 minutes)
  useEffect(() => {
    if (!isAuthenticated) return;

    const timer = setInterval(() => {
      if (navigator.onLine) {
        syncNow();
      }
    }, 5 * 60 * 1000);

    return () => clearInterval(timer);
  }, [isAuthenticated, syncNow]);


  return (
    <SyncContext.Provider value={{ syncStatus, lastSynced, syncNow, isOnline }}>
      {children}
    </SyncContext.Provider>
  );
}

export function useSync() {
  const ctx = useContext(SyncContext);
  if (!ctx) {
    throw new Error('useSync must be used within SyncProvider');
  }
  return ctx;
}
