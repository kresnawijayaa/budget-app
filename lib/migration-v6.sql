SET search_path TO budget_app;

-- Add initial cash balance for operational cash tracking.

ALTER TABLE config
ADD COLUMN IF NOT EXISTS initial_cash INT NOT NULL DEFAULT 0;
