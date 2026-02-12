-- Budget App Schema
CREATE SCHEMA IF NOT EXISTS budget_app;
SET search_path TO budget_app;

-- Config table (singleton)
CREATE TABLE IF NOT EXISTS config (
  id INT PRIMARY KEY DEFAULT 1 CHECK (id = 1),
  weekday_budget INT NOT NULL DEFAULT 80000,
  weekend_budget INT NOT NULL DEFAULT 70000,
  carbo_loading_budget INT NOT NULL DEFAULT 115000,
  parking_per_day INT NOT NULL DEFAULT 5000,
  gas_per_fill INT NOT NULL DEFAULT 50000,
  gas_fill_interval_days INT NOT NULL DEFAULT 3,
  initial_savings INT NOT NULL DEFAULT 0,
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Cycles table
CREATE TABLE IF NOT EXISTS cycles (
  id SERIAL PRIMARY KEY,
  year INT NOT NULL,
  month INT NOT NULL,
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  created_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(year, month)
);

-- Daily logs table
CREATE TABLE IF NOT EXISTS daily_logs (
  id SERIAL PRIMARY KEY,
  cycle_id INT NOT NULL REFERENCES cycles(id) ON DELETE CASCADE,
  log_date DATE NOT NULL,
  is_wfo BOOLEAN NOT NULL DEFAULT FALSE,
  actual_amount INT,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(cycle_id, log_date)
);

-- Seed default config
INSERT INTO config (id) VALUES (1) ON CONFLICT (id) DO NOTHING;
