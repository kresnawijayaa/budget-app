import { NextResponse } from 'next/server';
import { query } from '@/lib/db';

interface CycleVarianceRow {
    initial_savings: number | string | null;
    total_variance: number | string | null;
    variance_before_current_month: number | string | null;
    current_month_variance: number | string | null;
    [key: string]: unknown;
}

export async function GET(request: Request) {
    try {
        const { searchParams } = new URL(request.url);
        const currentYear = parseInt(searchParams.get('year') || '', 10);
        const currentMonth = parseInt(searchParams.get('month') || '', 10);
        const queryYear = Number.isInteger(currentYear) ? currentYear : 0;
        const queryMonth = Number.isInteger(currentMonth) ? currentMonth : 0;

        const savingsResult = await query<CycleVarianceRow>(`
            WITH latest_config AS (
                SELECT id
                FROM config_versions
                ORDER BY
                    (year IS NULL OR month IS NULL) ASC,
                    year DESC NULLS LAST,
                    month DESC NULLS LAST,
                    id DESC
                LIMIT 1
            ),
            cycle_variances AS (
                SELECT
                    c.year,
                    c.month,
                    COALESCE(SUM(
                        CASE
                            WHEN dl.actual_amount IS NULL THEN 0
                            ELSE (
                                CASE
                                    WHEN dl.custom_budget IS NOT NULL THEN dl.custom_budget
                                    WHEN dl.is_wfo THEN 0
                                    WHEN EXTRACT(DOW FROM dl.log_date) = 5 THEN cv.carbo_loading_budget
                                    WHEN EXTRACT(DOW FROM dl.log_date) IN (0, 6) THEN cv.weekend_budget
                                    ELSE cv.weekday_budget
                                END
                            ) - dl.actual_amount
                        END
                    ), 0)::int AS variance
                FROM cycles c
                LEFT JOIN latest_config lc ON TRUE
                JOIN config_versions cv ON cv.id = COALESCE(c.config_version_id, lc.id)
                LEFT JOIN daily_logs dl ON dl.cycle_id = c.id
                GROUP BY c.id, c.year, c.month
            )
            SELECT
                COALESCE((SELECT initial_savings FROM config WHERE id = 1), 0)::int AS initial_savings,
                COALESCE(SUM(variance), 0)::int AS total_variance,
                COALESCE(SUM(variance) FILTER (
                    WHERE year < $1 OR (year = $1 AND month < $2)
                ), 0)::int AS variance_before_current_month,
                COALESCE(SUM(variance) FILTER (
                    WHERE year = $1 AND month = $2
                ), 0)::int AS current_month_variance
            FROM cycle_variances
        `, [queryYear, queryMonth]);

        const row = savingsResult.rows[0];
        const initialSavings = Number(row?.initial_savings ?? 0);
        const totalVariance = Number(row?.total_variance ?? 0);
        const varianceBeforeCurrentMonth = Number(row?.variance_before_current_month ?? 0);
        const currentMonthVariance = Number(row?.current_month_variance ?? 0);

        const totalBalance = initialSavings + totalVariance;
        const balanceBeforeCurrentMonth = initialSavings + varianceBeforeCurrentMonth;

        return NextResponse.json({
            total_balance: totalBalance,
            balance_at_month_start: balanceBeforeCurrentMonth,
            current_month_variance: currentMonthVariance,
            current_balance: balanceBeforeCurrentMonth + currentMonthVariance,
        });
    } catch (error) {
        console.error('GET /api/savings error:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
