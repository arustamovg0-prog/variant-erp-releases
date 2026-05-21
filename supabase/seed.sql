-- ================================================================
-- Trust-Network ERP — Seed Data
-- Run AFTER migration.sql in the Supabase SQL Editor
-- ================================================================
-- This creates 3 agent users via Supabase Auth and their profiles.
-- 
-- IMPORTANT: You must create users via the Supabase Dashboard
-- (Authentication → Users → Invite User) or use the SQL below
-- which directly inserts into auth.users.
--
-- Agents:
--   1. Ахметов Руслан  — ruslan@trust-network.uz / trust123
--   2. Каримова Нилуфар — nilufar@trust-network.uz / trust123
--   3. Юсупов Шерзод   — sherzod@trust-network.uz / trust123
-- ================================================================

-- Note: The proper way to create users is via the Supabase Auth API
-- or the Dashboard. The below approach inserts directly for seeding
-- purposes. You may need to create users via Dashboard instead.

-- ALTERNATIVE: Create users via Supabase Dashboard:
-- 1. Go to Authentication → Users → Add User
-- 2. Create user with email ruslan@trust-network.uz, password trust123
-- 3. Note the UUID and use it below for the agents table insert
-- 4. Repeat for nilufar and sherzod

-- After creating users in the Dashboard, insert agent profiles:
-- Replace the UUIDs below with the actual user UUIDs from the Dashboard

-- INSERT INTO agents (id, name, phone, login) VALUES
--   ('UUID-FROM-DASHBOARD-1', 'Ахметов Руслан', '+998 90 123 0001', 'ruslan'),
--   ('UUID-FROM-DASHBOARD-2', 'Каримова Нилуфар', '+998 90 123 0002', 'nilufar'),
--   ('UUID-FROM-DASHBOARD-3', 'Юсупов Шерзод', '+998 90 123 0003', 'sherzod');
