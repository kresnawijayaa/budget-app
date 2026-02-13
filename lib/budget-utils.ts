export interface ConfigVersion {
    id: number;
    name: string;
    weekday_budget: number;
    weekend_budget: number;
    carbo_loading_budget: number;
    parking_per_day: number;
    gas_per_fill: number;
    gas_fill_interval_days: number;
    [key: string]: unknown;
}

export interface AppSettings {
    initial_savings: number;
    [key: string]: unknown;
}

// Alias for backward compatibility in calculation functions
export type Config = ConfigVersion;

export interface DailyLog {
    id: number;
    cycle_id: number;
    log_date: string;
    is_wfo: boolean;
    actual_amount: number | null;
    custom_label?: string | null;
    custom_budget?: number | null;
    [key: string]: unknown;
}

export interface DayEntry extends DailyLog {
    day_of_week: number; // 0=Sun, 1=Mon, ..., 6=Sat
    day_name: string;
    detail: string;
    budget: number;
    variance: number | null;
}

export interface CycleSummary {
    budget_sum: number;
    actual_sum: number;
    total_variance: number;
    parking_days: number;
    parking_budget: number;
    gas_days: number;
    gas_budget: number;
}

const DAY_NAMES_ID = ['Min', 'Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab'];

/**
 * Format a Date to YYYY-MM-DD string using local timezone (avoids UTC shift)
 */
export function dateToString(date: Date): string {
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, '0');
    const d = String(date.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
}

/**
 * Get the cycle start date (28th of the previous month)
 */
export function getCycleStartDate(year: number, month: number): Date {
    // Cycle for "March 2026" starts on Feb 28, 2026
    const prevMonth = month - 1;
    const prevYear = prevMonth <= 0 ? year - 1 : year;
    const actualPrevMonth = prevMonth <= 0 ? 12 : prevMonth;
    return new Date(prevYear, actualPrevMonth - 1, 28);
}

/**
 * Get the cycle end date (27th of the current month)
 */
export function getCycleEndDate(year: number, month: number): Date {
    return new Date(year, month - 1, 27);
}

/**
 * Generate all dates in a cycle (inclusive)
 */
export function getCycleDates(startDate: Date, endDate: Date): Date[] {
    const dates: Date[] = [];
    const current = new Date(startDate);
    while (current <= endDate) {
        dates.push(new Date(current));
        current.setDate(current.getDate() + 1);
    }
    return dates;
}

/**
 * Count total days in a cycle (inclusive)
 */
export function countCycleDays(startDate: Date, endDate: Date): number {
    const diffTime = endDate.getTime() - startDate.getTime();
    return Math.floor(diffTime / (1000 * 60 * 60 * 24)) + 1;
}

/**
 * Calculate the budget for a single day
 */
export function getDailyBudget(date: Date, isWfo: boolean, config: Config): number {
    if (isWfo) return 0;

    const dayOfWeek = date.getDay(); // 0=Sun, 6=Sat

    if (dayOfWeek === 5) return config.carbo_loading_budget; // Friday = carbo loading
    if (dayOfWeek === 0 || dayOfWeek === 6) return config.weekend_budget; // Sat/Sun
    return config.weekday_budget; // Mon-Thu
}

/**
 * Get detail label for a day
 */
export function getDayDetail(date: Date, isWfo: boolean): string {
    if (isWfo) return 'WFO';
    const dayOfWeek = date.getDay();
    if (dayOfWeek === 5) return 'Carbo Loading';
    return '';
}

/**
 * Get the Indonesian day name
 */
export function getDayName(date: Date): string {
    return DAY_NAMES_ID[date.getDay()];
}

/**
 * Transform a daily log into a full day entry with computed fields
 */
export function parseLogDate(logDate: string): Date {
    // Handle both "2026-02-28" and "2026-02-27T17:00:00.000Z" (PostgreSQL DATE in UTC)
    // Extract just the date portion and create a local Date
    const dateStr = logDate.includes('T') ? logDate.split('T')[0] : logDate;
    const [y, m, d] = dateStr.split('-').map(Number);

    // If original was an ISO timestamp, PostgreSQL shifted the date back.
    // A DATE of "2026-02-28" stored in UTC+7 becomes "2026-02-27T17:00:00.000Z"
    // So we need to parse the original date by creating from the full ISO and getting local date
    if (logDate.includes('T')) {
        const utcDate = new Date(logDate);
        return new Date(utcDate.getFullYear(), utcDate.getMonth(), utcDate.getDate());
    }

    return new Date(y, m - 1, d);
}

export function toDayEntry(log: DailyLog, config: Config): DayEntry {
    const date = parseLogDate(log.log_date);
    const dayOfWeek = date.getDay();
    const dayName = DAY_NAMES_ID[dayOfWeek];

    // Budget priority: custom_budget > is_wfo (0) > config-based
    let budget: number;
    if (log.custom_budget !== undefined && log.custom_budget !== null) {
        budget = log.custom_budget;
    } else if (log.is_wfo) {
        budget = 0;
    } else {
        // Config-based calculation
        if (dayOfWeek === 5) budget = config.carbo_loading_budget;
        else if (dayOfWeek === 0 || dayOfWeek === 6) budget = config.weekend_budget;
        else budget = config.weekday_budget;
    }

    // Detail priority: custom_label > WFO > Carbo Loading > empty
    let detail = '';
    if (log.custom_label) {
        detail = log.custom_label;
    } else if (log.is_wfo) {
        detail = 'WFO';
    } else if (dayOfWeek === 5) {
        detail = 'Carbo Loading';
    }

    const variance = log.actual_amount !== null ? budget - log.actual_amount : null; // Reverted variance calculation to budget - actual

    // Store the normalized date string for consistent comparison
    const normalizedLogDate = dateToString(date);

    return {
        ...log,
        log_date: normalizedLogDate, // Added back normalizedLogDate
        day_of_week: dayOfWeek,
        day_name: dayName,
        detail,
        budget,
        variance,
    };
}

/**
 * Calculate cycle summary (budget sum, actual sum, variance, parking, gas)
 */
export function calculateCycleSummary(
    entries: DayEntry[],
    startDate: Date,
    endDate: Date,
    config: Config
): CycleSummary {
    let budget_sum = 0;
    let actual_sum = 0;
    let parking_days = 0;

    for (const entry of entries) {
        budget_sum += entry.budget;
        if (entry.actual_amount !== null) {
            actual_sum += entry.actual_amount;
        }
        // Parking = weekday (Mon-Fri) and NOT WFO
        const dow = entry.day_of_week;
        if (dow >= 1 && dow <= 5 && !entry.is_wfo) {
            parking_days++;
        }
    }

    const total_variance = budget_sum - actual_sum;
    const parking_budget = parking_days * config.parking_per_day;

    const gas_days = countCycleDays(startDate, endDate);
    const gas_budget = config.gas_fill_interval_days > 0
        ? Math.round((gas_days * config.gas_per_fill) / config.gas_fill_interval_days)
        : 0;

    return {
        budget_sum,
        actual_sum,
        total_variance,
        parking_days,
        parking_budget,
        gas_days,
        gas_budget,
    };
}

/**
 * Format number as Indonesian Rupiah
 */
export function formatRupiah(amount: number): string {
    const prefix = amount < 0 ? '-' : '';
    const absAmount = Math.abs(amount);
    return prefix + 'Rp' + absAmount.toLocaleString('id-ID');
}

/**
 * Format date as "DD" (day number only)
 */
export function formatDateDay(dateStr: string): string {
    const date = new Date(dateStr + 'T00:00:00');
    return date.getDate().toString();
}

/**
 * Get month name in Indonesian
 */
export function getMonthName(month: number): string {
    const months = [
        '', 'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
        'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'
    ];
    return months[month] || '';
}

/**
 * Get the current cycle's year and month based on today's date
 */
export function getCurrentCycleYearMonth(): { year: number; month: number } {
    const today = new Date();
    const day = today.getDate();
    let month = today.getMonth() + 1; // 1-indexed
    let year = today.getFullYear();

    // If today is 28th or later, we're in the next month's cycle
    if (day >= 28) {
        month++;
        if (month > 12) {
            month = 1;
            year++;
        }
    }

    return { year, month };
}

/**
 * Get the previous cycle's year and month
 */
export function getPrevCycleYearMonth(year: number, month: number): { year: number; month: number } {
    let prevMonth = month - 1;
    let prevYear = year;
    if (prevMonth <= 0) {
        prevMonth = 12;
        prevYear--;
    }
    return { year: prevYear, month: prevMonth };
}

/**
 * Get the next cycle's year and month
 */
export function getNextCycleYearMonth(year: number, month: number): { year: number; month: number } {
    let nextMonth = month + 1;
    let nextYear = year;
    if (nextMonth > 12) {
        nextMonth = 1;
        nextYear++;
    }
    return { year: nextYear, month: nextMonth };
}
