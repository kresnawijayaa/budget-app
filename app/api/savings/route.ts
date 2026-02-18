import { NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { ConfigVersion, DailyLog, toDayEntry } from '@/lib/budget-utils';

export async function GET(request: Request) {
    try {
        const { searchParams } = new URL(request.url);
        const currentYear = searchParams.get('year');
        const currentMonth = searchParams.get('month');

        // Get initial savings
        const settingsResult = await query<{ initial_savings: number }>('SELECT initial_savings FROM config WHERE id = 1');
        const initialSavings = settingsResult.rows[0]?.initial_savings || 0;

        // Get all cycles ordered chronologically
        const cyclesResult = await query(
            'SELECT * FROM cycles ORDER BY year ASC, month ASC'
        );

        let totalBalance = initialSavings;
        let balanceBeforeCurrentMonth = initialSavings;
        let currentMonthVariance = 0;

        for (const cycle of cyclesResult.rows as { id: number; year: number; month: number; config_version_id: number | null }[]) {
            // Load correct config version for this cycle
            let config: ConfigVersion;
            if (cycle.config_version_id) {
                const cvResult = await query<ConfigVersion>('SELECT * FROM config_versions WHERE id = $1', [cycle.config_version_id]);
                config = cvResult.rows[0];
            } else {
                const cvResult = await query<ConfigVersion>('SELECT * FROM config_versions ORDER BY id DESC LIMIT 1');
                config = cvResult.rows[0];
            }

            // Get daily logs for this cycle
            const logsResult = await query<DailyLog>(
                'SELECT * FROM daily_logs WHERE cycle_id = $1',
                [cycle.id]
            );

            // Sum variance from filled days
            let cycleVariance = 0;
            for (const log of logsResult.rows) {
                if (log.actual_amount !== null) {
                    const entry = toDayEntry(log, config);
                    if (entry.variance !== null) {
                        cycleVariance += entry.variance;
                    }
                }
            }

            totalBalance += cycleVariance;

            // Check if this is before the current month
            const isBeforeCurrent = currentYear && currentMonth &&
                (cycle.year < parseInt(currentYear) ||
                    (cycle.year === parseInt(currentYear) && cycle.month < parseInt(currentMonth)));

            const isCurrentMonth = currentYear && currentMonth &&
                cycle.year === parseInt(currentYear) && cycle.month === parseInt(currentMonth);

            if (isBeforeCurrent) {
                balanceBeforeCurrentMonth += cycleVariance;
            }

            if (isCurrentMonth) {
                currentMonthVariance = cycleVariance;
            }
        }

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
