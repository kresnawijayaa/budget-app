SET search_path TO public;

-- Add an effective month/year to each config version so the app can choose
-- the newest config by period instead of by insertion id.

ALTER TABLE config_versions
ADD COLUMN IF NOT EXISTS year INT,
ADD COLUMN IF NOT EXISTS month INT;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'config_versions_year_range') THEN
    ALTER TABLE config_versions ADD CONSTRAINT config_versions_year_range CHECK (year IS NULL OR year BETWEEN 2000 AND 2100) NOT VALID;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'config_versions_month_range') THEN
    ALTER TABLE config_versions ADD CONSTRAINT config_versions_month_range CHECK (month IS NULL OR month BETWEEN 1 AND 12) NOT VALID;
  END IF;
END $$;
