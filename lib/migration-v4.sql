SET search_path TO budget_app;

-- Create other_expenses table for tracking parking and gas
CREATE TABLE IF NOT EXISTS other_expenses (
  id SERIAL PRIMARY KEY,
  cycle_id INT NOT NULL REFERENCES cycles(id) ON DELETE CASCADE,
  category VARCHAR(20) NOT NULL CHECK (category IN ('parking', 'gas')),
  amount INT NOT NULL DEFAULT 0,
  expense_date DATE NOT NULL,
  description VARCHAR(100),
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Index for faster lookup by cycle and category
CREATE INDEX IF NOT EXISTS idx_other_expenses_cycle ON other_expenses(cycle_id);
CREATE INDEX IF NOT EXISTS idx_other_expenses_category ON other_expenses(category);
