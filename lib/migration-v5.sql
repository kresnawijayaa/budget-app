SET search_path TO public;

-- Align existing databases with the current schema constraints.
-- Constraints are added NOT VALID so existing historical rows do not block
-- deployment; PostgreSQL still enforces them for new or updated rows.

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'config_versions_weekday_budget_nonnegative') THEN
    ALTER TABLE config_versions ADD CONSTRAINT config_versions_weekday_budget_nonnegative CHECK (weekday_budget >= 0) NOT VALID;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'config_versions_weekend_budget_nonnegative') THEN
    ALTER TABLE config_versions ADD CONSTRAINT config_versions_weekend_budget_nonnegative CHECK (weekend_budget >= 0) NOT VALID;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'config_versions_carbo_loading_budget_nonnegative') THEN
    ALTER TABLE config_versions ADD CONSTRAINT config_versions_carbo_loading_budget_nonnegative CHECK (carbo_loading_budget >= 0) NOT VALID;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'config_versions_parking_per_day_nonnegative') THEN
    ALTER TABLE config_versions ADD CONSTRAINT config_versions_parking_per_day_nonnegative CHECK (parking_per_day >= 0) NOT VALID;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'config_versions_gas_per_fill_nonnegative') THEN
    ALTER TABLE config_versions ADD CONSTRAINT config_versions_gas_per_fill_nonnegative CHECK (gas_per_fill >= 0) NOT VALID;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'config_versions_gas_fill_interval_nonnegative') THEN
    ALTER TABLE config_versions ADD CONSTRAINT config_versions_gas_fill_interval_nonnegative CHECK (gas_fill_interval_days >= 0) NOT VALID;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'cycles_year_range') THEN
    ALTER TABLE cycles ADD CONSTRAINT cycles_year_range CHECK (year BETWEEN 2000 AND 2100) NOT VALID;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'cycles_month_range') THEN
    ALTER TABLE cycles ADD CONSTRAINT cycles_month_range CHECK (month BETWEEN 1 AND 12) NOT VALID;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'cycles_date_range') THEN
    ALTER TABLE cycles ADD CONSTRAINT cycles_date_range CHECK (start_date <= end_date) NOT VALID;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'daily_logs_actual_amount_nonnegative') THEN
    ALTER TABLE daily_logs ADD CONSTRAINT daily_logs_actual_amount_nonnegative CHECK (actual_amount IS NULL OR actual_amount >= 0) NOT VALID;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'daily_logs_custom_budget_nonnegative') THEN
    ALTER TABLE daily_logs ADD CONSTRAINT daily_logs_custom_budget_nonnegative CHECK (custom_budget IS NULL OR custom_budget >= 0) NOT VALID;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'other_expenses_amount_nonnegative') THEN
    ALTER TABLE other_expenses ADD CONSTRAINT other_expenses_amount_nonnegative CHECK (amount >= 0) NOT VALID;
  END IF;
END $$;
