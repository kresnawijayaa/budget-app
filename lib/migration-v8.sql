SET search_path TO public;

-- Historical configs may use gas_fill_interval_days = 0 when gas_per_fill is 0.
-- The app calculation already treats zero as no gas budget, so allow it at the
-- database level as well.

ALTER TABLE config_versions
DROP CONSTRAINT IF EXISTS config_versions_gas_fill_interval_days_check,
DROP CONSTRAINT IF EXISTS config_versions_gas_fill_interval_positive,
DROP CONSTRAINT IF EXISTS config_versions_gas_fill_interval_nonnegative;

ALTER TABLE config_versions
ADD CONSTRAINT config_versions_gas_fill_interval_nonnegative
CHECK (gas_fill_interval_days >= 0) NOT VALID;
