import { NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { parseDateString, parseInteger, readJsonObject } from '@/lib/validation';

export async function PATCH(request: Request) {
    try {
        const bodyResult = await readJsonObject(request);
        if (!bodyResult.ok) return NextResponse.json({ error: bodyResult.error }, { status: 400 });
        const body = bodyResult.value;

        const cycleId = parseInteger(body.cycle_id, 'cycle_id', { required: true, min: 1 });
        if (!cycleId.ok) return NextResponse.json({ error: cycleId.error }, { status: 400 });

        if (!Array.isArray(body.wfo_dates)) {
            return NextResponse.json({ error: 'wfo_dates must be an array' }, { status: 400 });
        }

        const wfoDates: string[] = [];
        for (const [index, date] of body.wfo_dates.entries()) {
            const parsedDate = parseDateString(date, `wfo_dates[${index}]`, true);
            if (!parsedDate.ok) return NextResponse.json({ error: parsedDate.error }, { status: 400 });
            if (parsedDate.value === undefined) {
                return NextResponse.json({ error: `wfo_dates[${index}] is required` }, { status: 400 });
            }
            wfoDates.push(parsedDate.value);
        }

        // First, reset all days in this cycle to NOT WFO
        await query('UPDATE daily_logs SET is_wfo = FALSE, updated_at = NOW() WHERE cycle_id = $1', [cycleId.value]);

        // Then set the specified dates as WFO
        if (wfoDates.length > 0) {
            const placeholders = wfoDates.map((_: string, i: number) => `$${i + 2}`).join(', ');
            await query(
                `UPDATE daily_logs SET is_wfo = TRUE, updated_at = NOW() WHERE cycle_id = $1 AND log_date IN (${placeholders})`,
                [cycleId.value, ...wfoDates]
            );
        }

        // Return updated logs
        const result = await query(
            'SELECT * FROM daily_logs WHERE cycle_id = $1 ORDER BY log_date ASC',
            [cycleId.value]
        );

        return NextResponse.json(result.rows);
    } catch (error) {
        console.error('PATCH /api/daily-logs/bulk-wfo error:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
