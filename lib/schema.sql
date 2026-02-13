-- Budget App Schema (v2 - with config versioning)
CREATE SCHEMA IF NOT EXISTS budget_app;
SET search_path TO budget_app;

-- Config versions (budget presets)
CREATE TABLE IF NOT EXISTS config_versions (
  id SERIAL PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  weekday_budget INT NOT NULL DEFAULT 80000,
  weekend_budget INT NOT NULL DEFAULT 70000,
  carbo_loading_budget INT NOT NULL DEFAULT 115000,
  parking_per_day INT NOT NULL DEFAULT 5000,
  gas_per_fill INT NOT NULL DEFAULT 50000,
  gas_fill_interval_days INT NOT NULL DEFAULT 3,
  created_at TIMESTAMP DEFAULT NOW()
);

-- App settings (global, not versioned)
CREATE TABLE IF NOT EXISTS config (
  id INT PRIMARY KEY DEFAULT 1 CHECK (id = 1),
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
  config_version_id INT REFERENCES config_versions(id),
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
  custom_label VARCHAR(100),
  custom_budget INT,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(cycle_id, log_date)
);

-- Seed defaults
INSERT INTO config (id) VALUES (1) ON CONFLICT (id) DO NOTHING;
INSERT INTO config_versions (name) VALUES ('Versi 1') ON CONFLICT DO NOTHING;
