-- HBZ Finance - Supabase Database Setup
-- Run this in Supabase SQL Editor

-- Enable RLS
alter table if exists profiles enable row level security;
alter table if exists accounts enable row level security;
alter table if exists transactions enable row level security;
alter table if exists categories enable row level security;
alter table if exists exchange_rates enable row level security;
alter table if exists funds enable row level security;
alter table if exists user_funds enable row level security;
alter table if exists net_worth_history enable row level security;

-- Profiles Table
CREATE TABLE IF NOT EXISTS profiles (
  id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
  username TEXT NOT NULL,
  full_name TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Accounts Table
CREATE TABLE IF NOT EXISTS accounts (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('bank')),
  currency TEXT NOT NULL DEFAULT 'TRY',
  balance DECIMAL(15,2) NOT NULL DEFAULT 0,
  initial_balance DECIMAL(15,2) NOT NULL DEFAULT 0,
  color TEXT DEFAULT '#2563eb',
  icon TEXT DEFAULT 'wallet',
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Categories Table
CREATE TABLE IF NOT EXISTS categories (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('income', 'expense')),
  color TEXT DEFAULT '#2563eb',
  icon TEXT DEFAULT 'tag',
  is_default BOOLEAN DEFAULT false
);

-- Transactions Table
CREATE TABLE IF NOT EXISTS transactions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  account_id UUID REFERENCES accounts(id) ON DELETE CASCADE NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('income', 'expense', 'transfer')),
  category_id UUID REFERENCES categories(id) ON DELETE SET NULL,
  amount DECIMAL(15,2) NOT NULL DEFAULT 0,
  currency TEXT NOT NULL DEFAULT 'TRY',
  description TEXT,
  payment_method TEXT DEFAULT 'other',
  transaction_date DATE NOT NULL DEFAULT CURRENT_DATE,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Exchange Rates Table
CREATE TABLE IF NOT EXISTS exchange_rates (
  currency_code TEXT PRIMARY KEY,
  rate_to_try DECIMAL(15,6) NOT NULL DEFAULT 1,
  rate_type TEXT NOT NULL CHECK (rate_type IN ('doviz', 'altin')),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Funds Table (TEFAS)
CREATE TABLE IF NOT EXISTS funds (
  code TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  category TEXT NOT NULL,
  company TEXT NOT NULL,
  currency TEXT NOT NULL DEFAULT 'TRY'
);

-- User Funds Table
CREATE TABLE IF NOT EXISTS user_funds (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  fund_code TEXT REFERENCES funds(code) ON DELETE CASCADE NOT NULL,
  shares DECIMAL(15,4) NOT NULL DEFAULT 0,
  purchase_price DECIMAL(15,4) NOT NULL DEFAULT 0,
  current_price DECIMAL(15,4) NOT NULL DEFAULT 0,
  last_price_update TIMESTAMPTZ DEFAULT now(),
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Net Worth History
CREATE TABLE IF NOT EXISTS net_worth_history (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  total_try DECIMAL(15,2) NOT NULL DEFAULT 0,
  record_date DATE NOT NULL DEFAULT CURRENT_DATE,
  UNIQUE(user_id, record_date)
);

-- RLS Policies

-- Profiles: Users can only see/edit their own
CREATE POLICY "profiles_select" ON profiles FOR SELECT USING (auth.uid() = id);
CREATE POLICY "profiles_insert" ON profiles FOR INSERT WITH CHECK (auth.uid() = id);
CREATE POLICY "profiles_update" ON profiles FOR UPDATE USING (auth.uid() = id);

-- Accounts: Users can only see/edit their own
CREATE POLICY "accounts_select" ON accounts FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "accounts_insert" ON accounts FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "accounts_update" ON accounts FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "accounts_delete" ON accounts FOR DELETE USING (auth.uid() = user_id);

-- Transactions
CREATE POLICY "transactions_select" ON transactions FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "transactions_insert" ON transactions FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "transactions_update" ON transactions FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "transactions_delete" ON transactions FOR DELETE USING (auth.uid() = user_id);

-- Categories
CREATE POLICY "categories_select" ON categories FOR SELECT USING (auth.uid() = user_id OR is_default = true);
CREATE POLICY "categories_insert" ON categories FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "categories_update" ON categories FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "categories_delete" ON categories FOR DELETE USING (auth.uid() = user_id);

-- Exchange Rates (public read, admin write)
CREATE POLICY "exchange_rates_select" ON exchange_rates FOR SELECT TO authenticated USING (true);
CREATE POLICY "exchange_rates_insert" ON exchange_rates FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "exchange_rates_update" ON exchange_rates FOR UPDATE TO authenticated USING (true);

-- Funds (public read-only)
CREATE POLICY "funds_select" ON funds FOR SELECT TO authenticated USING (true);

-- User Funds
CREATE POLICY "user_funds_select" ON user_funds FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "user_funds_insert" ON user_funds FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "user_funds_update" ON user_funds FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "user_funds_delete" ON user_funds FOR DELETE USING (auth.uid() = user_id);

-- Net Worth History
CREATE POLICY "net_worth_select" ON net_worth_history FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "net_worth_insert" ON net_worth_history FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Realtime subscriptions
BEGIN;
  DROP PUBLICATION IF EXISTS supabase_realtime;
  CREATE PUBLICATION supabase_realtime;
COMMIT;

ALTER PUBLICATION supabase_realtime ADD TABLE accounts;
ALTER PUBLICATION supabase_realtime ADD TABLE transactions;
ALTER PUBLICATION supabase_realtime ADD TABLE user_funds;

-- Insert initial exchange rates (will be updated by app)
INSERT INTO exchange_rates (currency_code, rate_to_try, rate_type) VALUES
  ('TRY', 1, 'doviz'),
  ('USD', 35, 'doviz'),
  ('EUR', 38, 'doviz'),
  ('GBP', 45, 'doviz'),
  ('CHF', 40, 'doviz'),
  ('JPY', 0.25, 'doviz'),
  ('XAU', 2200, 'altin'),
  ('XAG', 28, 'altin'),
  ('CUM', 3500, 'altin'),
  ('YAR', 7000, 'altin'),
  ('TAM', 14000, 'altin')
ON CONFLICT (currency_code) DO NOTHING;

-- Migrations for existing databases

-- 1. Add payment_method column to transactions if missing
ALTER TABLE transactions ADD COLUMN IF NOT EXISTS payment_method TEXT DEFAULT 'other';

-- 2. Normalize old account types to 'bank' before restricting constraint
UPDATE accounts SET type = 'bank' WHERE type NOT IN ('bank');

-- 3. Replace accounts type check constraint with only 'bank'
DO $$
BEGIN
  ALTER TABLE accounts DROP CONSTRAINT IF EXISTS accounts_type_check;
  ALTER TABLE accounts ADD CONSTRAINT accounts_type_check CHECK (type IN ('bank'));
EXCEPTION
  WHEN others THEN
    NULL;
END $$;
