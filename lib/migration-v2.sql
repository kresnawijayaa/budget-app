SET search_path TO budget_app;

-- 1. Create config_versions table
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

-- 2. Migrate current config row into Versi 1 (only if empty)
INSERT INTO config_versions (name, weekday_budget, weekend_budget, carbo_loading_budget, parking_per_day, gas_per_fill, gas_fill_interval_days)
SELECT 'Versi 1', weekday_budget, weekend_budget, carbo_loading_budget, parking_per_day, gas_per_fill, gas_fill_interval_days
FROM config WHERE id = 1
AND NOT EXISTS (SELECT 1 FROM config_versions);

-- 3. Add config_version_id column to cycles
ALTER TABLE cycles ADD COLUMN IF NOT EXISTS config_version_id INT REFERENCES config_versions(id);

-- 4. Link existing cycles to Versi 1
UPDATE cycles SET config_version_id = 1 WHERE config_version_id IS NULL;
