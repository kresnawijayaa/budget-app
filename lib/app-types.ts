import { ConfigVersion, CycleSummary, DayEntry } from './budget-utils';

export interface CycleData {
  cycle: {
    id: number;
    year: number;
    month: number;
    start_date: string;
    end_date: string;
    config_version_id: number | null;
  };
  entries: DayEntry[];
  summary: CycleSummary;
  config: ConfigVersion;
  configVersions?: ConfigVersion[];
  savings?: SavingsSnapshot;
  operationalCash?: OperationalCashSnapshot;
}

export interface SavingsSnapshot {
  balance_at_month_start: number;
  current_month_variance: number;
  current_balance: number;
}

export interface OperationalCashSnapshot {
  balance_at_month_start: number;
  current_month_budget: number;
  current_month_actual: number;
  current_month_variance: number;
  current_balance: number;
}

export interface LogUpdate {
  actual_amount?: number | null;
  is_wfo?: boolean;
  custom_label?: string | null;
  custom_budget?: number | null;
}
