-- ================================================================
-- Trust-Network ERP — matching Supabase tables
-- Run this script in the Supabase SQL Editor
-- ================================================================

-- ─── 1. Agent Table ──────────────────────────────────
CREATE TABLE IF NOT EXISTS "Agent" (
  "id" TEXT PRIMARY KEY,
  "name" TEXT NOT NULL,
  "email" TEXT UNIQUE NOT NULL,
  "password" TEXT NOT NULL,
  "role" TEXT NOT NULL DEFAULT 'agent',
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT now(),
  "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ─── 2. Deal Table ───────────────────────────────────
CREATE TABLE IF NOT EXISTS "Deal" (
  "id" TEXT PRIMARY KEY,
  "agentId" TEXT NOT NULL REFERENCES "Agent"("id") ON DELETE CASCADE,
  "client" TEXT NOT NULL,
  "phone" TEXT NOT NULL,
  "product" TEXT NOT NULL,
  "totalAmount" DOUBLE PRECISION NOT NULL,
  "monthlyAmount" DOUBLE PRECISION NOT NULL,
  "months" INTEGER NOT NULL,
  "paidMonths" INTEGER NOT NULL DEFAULT 0,
  "startDate" TEXT NOT NULL,
  "status" TEXT NOT NULL DEFAULT 'active',
  "comment" TEXT,
  "referralName" TEXT,
  "referralPhone" TEXT,
  "referralRelation" TEXT,
  "costPrice" DOUBLE PRECISION,
  "downPayment" DOUBLE PRECISION,
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT now(),
  "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ─── 3. Payment Table ────────────────────────────────
CREATE TABLE IF NOT EXISTS "Payment" (
  "id" TEXT PRIMARY KEY,
  "dealId" TEXT NOT NULL REFERENCES "Deal"("id") ON DELETE CASCADE,
  "monthNumber" INTEGER NOT NULL,
  "amount" DOUBLE PRECISION NOT NULL,
  "principalAmount" DOUBLE PRECISION NOT NULL DEFAULT 0,
  "profitAmount" DOUBLE PRECISION NOT NULL DEFAULT 0,
  "dueDate" TEXT NOT NULL,
  "paidDate" TEXT,
  "extendedDate" TEXT,
  "status" TEXT NOT NULL DEFAULT 'pending',
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT now(),
  "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ─── 4. CashboxTransaction Table ─────────────────────
CREATE TABLE IF NOT EXISTS "CashboxTransaction" (
  "id" TEXT PRIMARY KEY,
  "agentId" TEXT REFERENCES "Agent"("id") ON DELETE SET NULL,
  "type" TEXT NOT NULL,
  "amount" DOUBLE PRECISION NOT NULL,
  "category" TEXT NOT NULL,
  "reason" TEXT NOT NULL,
  "dealId" TEXT REFERENCES "Deal"("id") ON DELETE CASCADE,
  "date" TEXT NOT NULL,
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT now(),
  "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ─── 5. Setting Table ────────────────────────────────
CREATE TABLE IF NOT EXISTS "Setting" (
  "key" TEXT PRIMARY KEY,
  "value" TEXT NOT NULL,
  "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ─── 6. Disable RLS to allow direct connection sync ─
ALTER TABLE "Agent" DISABLE ROW LEVEL SECURITY;
ALTER TABLE "Deal" DISABLE ROW LEVEL SECURITY;
ALTER TABLE "Payment" DISABLE ROW LEVEL SECURITY;
ALTER TABLE "CashboxTransaction" DISABLE ROW LEVEL SECURITY;
ALTER TABLE "Setting" DISABLE ROW LEVEL SECURITY;

-- ─── 7. SupportSession Table ────────────────────────
CREATE TABLE IF NOT EXISTS "SupportSession" (
  "id" TEXT PRIMARY KEY,
  "passcode" TEXT NOT NULL,
  "adminId" TEXT NOT NULL,
  "status" TEXT NOT NULL DEFAULT 'waiting', -- 'waiting', 'connected', 'closed'
  "requestPayload" TEXT, -- JSON command from developer: { type: 'sql' | 'cmd', payload: string }
  "responsePayload" TEXT, -- JSON response from local client: { success: boolean, data?: any, error?: string }
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT now(),
  "expiresAt" TIMESTAMPTZ NOT NULL
);
ALTER TABLE "SupportSession" DISABLE ROW LEVEL SECURITY;

-- Enable Realtime for SupportSession table
alter publication supabase_realtime add table "SupportSession";

