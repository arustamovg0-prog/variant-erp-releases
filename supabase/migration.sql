-- ================================================================
-- Trust-Network ERP — Supabase Migration
-- Run this in the Supabase SQL Editor
-- ================================================================

-- ─── 1. Agents Table ──────────────────────────────────
-- Note: Supabase Auth handles user accounts.
-- This table stores agent profile metadata linked to auth.users.
CREATE TABLE IF NOT EXISTS agents (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  phone TEXT NOT NULL DEFAULT '',
  login TEXT UNIQUE NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ─── 2. Settings Table (exchange rate, etc) ───────────
CREATE TABLE IF NOT EXISTS settings (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_by UUID REFERENCES agents(id)
);

-- Insert default UZS rate
INSERT INTO settings (key, value)
VALUES ('uzs_rate', '12800')
ON CONFLICT (key) DO NOTHING;

-- ─── 3. Deals Table ──────────────────────────────────
CREATE TABLE IF NOT EXISTS deals (
  id TEXT PRIMARY KEY,                     -- e.g. 'D-001'
  agent_id UUID NOT NULL REFERENCES agents(id),
  client TEXT NOT NULL,
  phone TEXT NOT NULL,
  product TEXT NOT NULL,
  total_amount NUMERIC(12,2) NOT NULL,     -- USD
  monthly_amount NUMERIC(12,2) NOT NULL,   -- USD
  months INTEGER NOT NULL,
  paid_months INTEGER NOT NULL DEFAULT 0,
  start_date DATE NOT NULL,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'completed', 'overdue')),
  referral_name TEXT,
  referral_phone TEXT,
  referral_relation TEXT,
  comment TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ─── 4. Payments Table ───────────────────────────────
CREATE TABLE IF NOT EXISTS payments (
  id TEXT PRIMARY KEY,                     -- e.g. 'P-D-001-01'
  deal_id TEXT NOT NULL REFERENCES deals(id) ON DELETE CASCADE,
  month_number INTEGER NOT NULL,
  due_date DATE NOT NULL,
  paid_date DATE,
  extended_date DATE,
  amount NUMERIC(12,2) NOT NULL,           -- USD
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('paid', 'pending', 'overdue', 'extended')),
  overdue_days INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ─── 5. Indexes ──────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_deals_agent_id ON deals(agent_id);
CREATE INDEX IF NOT EXISTS idx_payments_deal_id ON payments(deal_id);
CREATE INDEX IF NOT EXISTS idx_payments_status ON payments(status);
CREATE INDEX IF NOT EXISTS idx_payments_due_date ON payments(due_date);

-- ─── 6. Row Level Security (RLS) ─────────────────────
-- Agents can only see/modify their own deals and payments.

ALTER TABLE agents ENABLE ROW LEVEL SECURITY;
ALTER TABLE deals ENABLE ROW LEVEL SECURITY;
ALTER TABLE payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE settings ENABLE ROW LEVEL SECURITY;

-- Agents: can read own profile
CREATE POLICY "agents_own_read" ON agents
  FOR SELECT USING (auth.uid() = id);

CREATE POLICY "agents_own_update" ON agents
  FOR UPDATE USING (auth.uid() = id);

-- Deals: agent sees only their deals
CREATE POLICY "deals_own_select" ON deals
  FOR SELECT USING (agent_id = auth.uid());

CREATE POLICY "deals_own_insert" ON deals
  FOR INSERT WITH CHECK (agent_id = auth.uid());

CREATE POLICY "deals_own_update" ON deals
  FOR UPDATE USING (agent_id = auth.uid());

-- Payments: agent sees payments of their deals
CREATE POLICY "payments_own_select" ON payments
  FOR SELECT USING (
    deal_id IN (SELECT id FROM deals WHERE agent_id = auth.uid())
  );

CREATE POLICY "payments_own_insert" ON payments
  FOR INSERT WITH CHECK (
    deal_id IN (SELECT id FROM deals WHERE agent_id = auth.uid())
  );

CREATE POLICY "payments_own_update" ON payments
  FOR UPDATE USING (
    deal_id IN (SELECT id FROM deals WHERE agent_id = auth.uid())
  );

-- Settings: all authenticated users can read, only update
CREATE POLICY "settings_read" ON settings
  FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "settings_update" ON settings
  FOR UPDATE USING (auth.role() = 'authenticated');
