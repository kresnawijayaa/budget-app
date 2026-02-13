SET search_path TO budget_app;

-- Add custom label and custom budget columns to daily_logs
ALTER TABLE daily_logs 
ADD COLUMN IF NOT EXISTS custom_label VARCHAR(100),
ADD COLUMN IF NOT EXISTS custom_budget INT;
