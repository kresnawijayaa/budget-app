import { NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { ConfigVersion, DailyLog, toDayEntry, calculateCycleSummary, OtherExpense } from '@/lib/budget-utils';

interface CycleRow {
    id: number;
    year: number;
    month: number;
    start_date: string;
    end_date: string;
    config_version_id: number | null;
    [key: string]: unknown;
}

interface CyclePayloadRow {
    cycle: CycleRow;
    config: ConfigVersion;
    config_versions: ConfigVersion[] | null;
    daily_logs: DailyLog[] | null;
    other_expenses: OtherExpense[] | null;
    savings: {
        total_balance: number;
        balance_at_month_start: number;
        current_month_variance: number;
        current_balance: number;
    } | null;
    [key: string]: unknown;
}

export async function GET(
    _request: Request,
    { params }: { params: Promise<{ yearMonth: string }> }
) {
    try {
        const { yearMonth } = await params;
        const [yearStr, monthStr] = yearMonth.split('-');
        const year = parseInt(yearStr);
        const month = parseInt(monthStr);

        if (!year || !month) {
            return NextResponse.json({ error: 'Invalid yearMonth format. Use YYYY-MM' }, { status: 400 });
        }

        const cycleResult = await query<CyclePayloadRow>(
            `
            WITH selected_cycle AS (
                SELECT *
                FROM cycles
                WHERE year = $1 AND month = $2
            ),
            latest_config AS (
                SELECT id
                FROM config_versions
                ORDER BY id DESC
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
                                    WHEN EXTRACT(DOW FROM dl.log_date) = 5 THEN cv_for_sum.carbo_loading_budget
                                    WHEN EXTRACT(DOW FROM dl.log_date) IN (0, 6) THEN cv_for_sum.weekend_budget
                                    ELSE cv_for_sum.weekday_budget
                                END
                            ) - dl.actual_amount
                        END
                    ), 0)::int AS variance
                FROM cycles c
                LEFT JOIN latest_config lc ON TRUE
                JOIN config_versions cv_for_sum ON cv_for_sum.id = COALESCE(c.config_version_id, lc.id)
                LEFT JOIN daily_logs dl ON dl.cycle_id = c.id
                GROUP BY c.id, c.year, c.month
            ),
            savings_summary AS (
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
            )
            SELECT
                to_jsonb(c) AS cycle,
                to_jsonb(cv) AS config,
                jsonb_build_object(
                    'total_balance', ss.initial_savings + ss.total_variance,
                    'balance_at_month_start', ss.initial_savings + ss.variance_before_current_month,
                    'current_month_variance', ss.current_month_variance,
                    'current_balance', ss.initial_savings + ss.variance_before_current_month + ss.current_month_variance
                ) AS savings,
                COALESCE((
                    SELECT jsonb_agg(to_jsonb(all_cv) ORDER BY all_cv.id ASC)
                    FROM config_versions all_cv
                ), '[]'::jsonb) AS config_versions,
                COALESCE((
                    SELECT jsonb_agg(to_jsonb(dl) ORDER BY dl.log_date ASC)
                    FROM daily_logs dl
                    WHERE dl.cycle_id = c.id
                ), '[]'::jsonb) AS daily_logs,
                COALESCE((
                    SELECT jsonb_agg(to_jsonb(oe) ORDER BY oe.expense_date DESC, oe.id DESC)
                    FROM other_expenses oe
                    WHERE oe.cycle_id = c.id
                ), '[]'::jsonb) AS other_expenses
            FROM selected_cycle c
            LEFT JOIN latest_config lc ON TRUE
            JOIN config_versions cv ON cv.id = COALESCE(c.config_version_id, lc.id)
            CROSS JOIN savings_summary ss
            `,
            [year, month]
        );

        if (cycleResult.rows.length === 0) {
            return NextResponse.json({ error: 'Cycle not found', year, month }, { status: 404 });
        }

        const { cycle, config } = cycleResult.rows[0];
        const savings = cycleResult.rows[0].savings;
        const configVersions = cycleResult.rows[0].config_versions ?? [];
        const dailyLogs = cycleResult.rows[0].daily_logs ?? [];
        const otherExpenses = cycleResult.rows[0].other_expenses ?? [];

        // Compute entries with budget info
        const entries = dailyLogs.map(log => toDayEntry(log, config));

        // Compute summary
        const startDate = new Date(cycle.start_date + 'T00:00:00');
        const endDate = new Date(cycle.end_date + 'T00:00:00');
        const summary = calculateCycleSummary(entries, startDate, endDate, config, otherExpenses);

        return NextResponse.json({
            cycle,
            entries,
            summary,
            config,
            configVersions,
            savings,
        });
    } catch (error) {
        console.error('GET /api/cycles/[yearMonth] error:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}

export async function PATCH(
    request: Request,
    { params }: { params: Promise<{ yearMonth: string }> }
) {
    try {
        const { yearMonth } = await params;
        const [yearStr, monthStr] = yearMonth.split('-');
        const year = parseInt(yearStr);
        const month = parseInt(monthStr);
        const { config_version_id } = await request.json();

        const result = await query(
            'UPDATE cycles SET config_version_id = $1 WHERE year = $2 AND month = $3 RETURNING *',
            [config_version_id, year, month]
        );

        if (result.rows.length === 0) {
            return NextResponse.json({ error: 'Cycle not found' }, { status: 404 });
        }

        return NextResponse.json(result.rows[0]);
    } catch (error) {
        console.error('PATCH /api/cycles/[yearMonth] error:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}

export async function DELETE(
    _request: Request,
    { params }: { params: Promise<{ yearMonth: string }> }
) {
    try {
        const { yearMonth } = await params;
        const [yearStr, monthStr] = yearMonth.split('-');
        const year = parseInt(yearStr);
        const month = parseInt(monthStr);

        if (!year || !month) {
            return NextResponse.json({ error: 'Invalid yearMonth format' }, { status: 400 });
        }

        const result = await query(
            'DELETE FROM cycles WHERE year = $1 AND month = $2 RETURNING id',
            [year, month]
        );

        if (result.rows.length === 0) {
            return NextResponse.json({ error: 'Cycle not found' }, { status: 404 });
        }

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error('DELETE /api/cycles/[yearMonth] error:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
