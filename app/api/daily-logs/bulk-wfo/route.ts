import { NextResponse } from 'next/server';
import { query } from '@/lib/db';

export async function PATCH(request: Request) {
    try {
        const { cycle_id, wfo_dates } = await request.json();

        if (!cycle_id || !Array.isArray(wfo_dates)) {
            return NextResponse.json({ error: 'cycle_id and wfo_dates[] required' }, { status: 400 });
        }

        // First, reset all days in this cycle to NOT WFO
        await query('UPDATE daily_logs SET is_wfo = FALSE, updated_at = NOW() WHERE cycle_id = $1', [cycle_id]);

        // Then set the specified dates as WFO
        if (wfo_dates.length > 0) {
            const placeholders = wfo_dates.map((_: string, i: number) => `$${i + 2}`).join(', ');
            await query(
                `UPDATE daily_logs SET is_wfo = TRUE, updated_at = NOW() WHERE cycle_id = $1 AND log_date IN (${placeholders})`,
                [cycle_id, ...wfo_dates]
            );
        }

        // Return updated logs
        const result = await query(
            'SELECT * FROM daily_logs WHERE cycle_id = $1 ORDER BY log_date ASC',
            [cycle_id]
        );

        return NextResponse.json(result.rows);
    } catch (error) {
        console.error('PATCH /api/daily-logs/bulk-wfo error:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
