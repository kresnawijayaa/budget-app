SET search_path TO public;

-- Add initial cash balance for operational cash tracking.

ALTER TABLE config
ADD COLUMN IF NOT EXISTS initial_cash INT NOT NULL DEFAULT 0;
