import { NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { Config, DailyLog, toDayEntry, calculateCycleSummary } from '@/lib/budget-utils';

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

        // Get cycle
        const cycleResult = await query(
            'SELECT * FROM cycles WHERE year = $1 AND month = $2',
            [year, month]
        );

        if (cycleResult.rows.length === 0) {
            return NextResponse.json({ error: 'Cycle not found', year, month }, { status: 404 });
        }

        const cycle = cycleResult.rows[0] as { id: number; year: number; month: number; start_date: string; end_date: string };

        // Get config
        const configResult = await query<Config>('SELECT * FROM config WHERE id = 1');
        const config = configResult.rows[0];

        // Get daily logs
        const logsResult = await query<DailyLog>(
            'SELECT * FROM daily_logs WHERE cycle_id = $1 ORDER BY log_date ASC',
            [cycle.id]
        );

        // Compute entries with budget info
        const entries = logsResult.rows.map(log => toDayEntry(log, config));

        // Compute summary
        const startDate = new Date(cycle.start_date + 'T00:00:00');
        const endDate = new Date(cycle.end_date + 'T00:00:00');
        const summary = calculateCycleSummary(entries, startDate, endDate, config);

        return NextResponse.json({
            cycle,
            entries,
            summary,
            config,
        });
    } catch (error) {
        console.error('GET /api/cycles/[yearMonth] error:', error);
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
