import { NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { Config, DailyLog, toDayEntry } from '@/lib/budget-utils';

export async function GET() {
    try {
        // Get config (for initial_savings and budget calculations)
        const configResult = await query<Config>('SELECT * FROM config WHERE id = 1');
        const config = configResult.rows[0];

        // Get all daily logs across all cycles (only filled ones contribute)
        const logsResult = await query<DailyLog>(
            'SELECT * FROM daily_logs ORDER BY log_date ASC'
        );

        // Sum variance only from days where actual_amount has been filled
        let filledVariance = 0;
        for (const log of logsResult.rows) {
            if (log.actual_amount !== null) {
                const entry = toDayEntry(log, config);
                if (entry.variance !== null) {
                    filledVariance += entry.variance;
                }
            }
        }

        const total_savings = (config.initial_savings as number) + filledVariance;

        return NextResponse.json({
            initial_savings: config.initial_savings,
            filled_variance: filledVariance,
            total_savings,
        });
    } catch (error) {
        console.error('GET /api/savings error:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
