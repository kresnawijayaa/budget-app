import { NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { Config, DailyLog, toDayEntry, calculateCycleSummary } from '@/lib/budget-utils';

export async function GET() {
    try {
        // Get config (for initial_savings and budget calculations)
        const configResult = await query<Config>('SELECT * FROM config WHERE id = 1');
        const config = configResult.rows[0];

        // Get all cycles ordered chronologically
        const cyclesResult = await query(
            'SELECT * FROM cycles ORDER BY year ASC, month ASC'
        );

        let totalVariance = 0;

        const cycleDetails = [];

        for (const cycle of cyclesResult.rows as { id: number; year: number; month: number; start_date: string; end_date: string }[]) {
            const logsResult = await query<DailyLog>(
                'SELECT * FROM daily_logs WHERE cycle_id = $1 ORDER BY log_date ASC',
                [cycle.id]
            );

            const entries = logsResult.rows.map(log => toDayEntry(log, config));
            const startDate = new Date(cycle.start_date + 'T00:00:00');
            const endDate = new Date(cycle.end_date + 'T00:00:00');
            const summary = calculateCycleSummary(entries, startDate, endDate, config);

            totalVariance += summary.total_variance;

            cycleDetails.push({
                year: cycle.year,
                month: cycle.month,
                total_variance: summary.total_variance,
            });
        }

        const total_savings = config.initial_savings + totalVariance;

        return NextResponse.json({
            initial_savings: config.initial_savings,
            cumulative_variance: totalVariance,
            total_savings,
            cycles: cycleDetails,
        });
    } catch (error) {
        console.error('GET /api/savings error:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
