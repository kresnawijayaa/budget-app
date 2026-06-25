-- Budget App Schema (current)
-- Use this file for a fresh database. Existing databases should apply
-- migration-v2.sql through the latest migration instead.
SET search_path TO public;

-- Config versions (budget presets)
CREATE TABLE IF NOT EXISTS config_versions (
  id SERIAL PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  year INT CHECK (year IS NULL OR year BETWEEN 2000 AND 2100),
  month INT CHECK (month IS NULL OR month BETWEEN 1 AND 12),
  weekday_budget INT NOT NULL DEFAULT 80000 CHECK (weekday_budget >= 0),
  weekend_budget INT NOT NULL DEFAULT 70000 CHECK (weekend_budget >= 0),
  carbo_loading_budget INT NOT NULL DEFAULT 115000 CHECK (carbo_loading_budget >= 0),
  parking_per_day INT NOT NULL DEFAULT 5000 CHECK (parking_per_day >= 0),
  gas_per_fill INT NOT NULL DEFAULT 50000 CHECK (gas_per_fill >= 0),
  gas_fill_interval_days INT NOT NULL DEFAULT 3 CHECK (gas_fill_interval_days >= 0),
  created_at TIMESTAMP DEFAULT NOW()
);

-- App settings (global, not versioned)
CREATE TABLE IF NOT EXISTS config (
  id INT PRIMARY KEY DEFAULT 1 CHECK (id = 1),
  initial_savings INT NOT NULL DEFAULT 0,
  initial_cash INT NOT NULL DEFAULT 0,
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Cycles table
CREATE TABLE IF NOT EXISTS cycles (
  id SERIAL PRIMARY KEY,
  year INT NOT NULL CHECK (year BETWEEN 2000 AND 2100),
  month INT NOT NULL CHECK (month BETWEEN 1 AND 12),
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  config_version_id INT REFERENCES config_versions(id),
  created_at TIMESTAMP DEFAULT NOW(),
  CHECK (start_date <= end_date),
  UNIQUE(year, month)
);

-- Daily logs table
CREATE TABLE IF NOT EXISTS daily_logs (
  id SERIAL PRIMARY KEY,
  cycle_id INT NOT NULL REFERENCES cycles(id) ON DELETE CASCADE,
  log_date DATE NOT NULL,
  is_wfo BOOLEAN NOT NULL DEFAULT FALSE,
  actual_amount INT CHECK (actual_amount IS NULL OR actual_amount >= 0),
  custom_label VARCHAR(100),
  custom_budget INT CHECK (custom_budget IS NULL OR custom_budget >= 0),
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(cycle_id, log_date)
);

-- Other operational expenses tracked as cash logs, not included in account balance
CREATE TABLE IF NOT EXISTS other_expenses (
  id SERIAL PRIMARY KEY,
  cycle_id INT NOT NULL REFERENCES cycles(id) ON DELETE CASCADE,
  category VARCHAR(20) NOT NULL CHECK (category IN ('parking', 'gas')),
  amount INT NOT NULL DEFAULT 0 CHECK (amount >= 0),
  expense_date DATE NOT NULL,
  description VARCHAR(100),
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_other_expenses_cycle ON other_expenses(cycle_id);
CREATE INDEX IF NOT EXISTS idx_other_expenses_category ON other_expenses(category);

-- Seed defaults
INSERT INTO config (id) VALUES (1) ON CONFLICT (id) DO NOTHING;
INSERT INTO config_versions (name) VALUES ('Versi 1') ON CONFLICT DO NOTHING;
