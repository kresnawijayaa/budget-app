import { NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { getCycleStartDate, getCycleEndDate, getCycleDates, dateToString } from '@/lib/budget-utils';

export async function GET() {
    try {
        const result = await query('SELECT * FROM cycles ORDER BY year DESC, month DESC');
        return NextResponse.json(result.rows);
    } catch (error) {
        console.error('GET /api/cycles error:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}

export async function POST(request: Request) {
    try {
        const { year, month, config_version_id } = await request.json();

        if (!year || !month || month < 1 || month > 12) {
            return NextResponse.json({ error: 'Invalid year or month' }, { status: 400 });
        }

        // Check if cycle already exists
        const existing = await query('SELECT id FROM cycles WHERE year = $1 AND month = $2', [year, month]);
        if (existing.rows.length > 0) {
            return NextResponse.json({ error: 'Cycle already exists', cycle_id: (existing.rows[0] as { id: number }).id }, { status: 409 });
        }

        // Determine config version: use provided, or latest
        let versionId = config_version_id;
        if (!versionId) {
            const latestVersion = await query('SELECT id FROM config_versions ORDER BY id DESC LIMIT 1');
            versionId = latestVersion.rows.length > 0 ? (latestVersion.rows[0] as { id: number }).id : null;
        }

        const startDate = getCycleStartDate(year, month);
        const endDate = getCycleEndDate(year, month);

        const startStr = dateToString(startDate);
        const endStr = dateToString(endDate);

        // Create cycle
        const cycleResult = await query<{ id: number }>(
            'INSERT INTO cycles (year, month, start_date, end_date, config_version_id) VALUES ($1, $2, $3, $4, $5) RETURNING id',
            [year, month, startStr, endStr, versionId]
        );
        const cycleId = cycleResult.rows[0].id;

        // Generate daily log entries
        const dates = getCycleDates(startDate, endDate);
        const values: string[] = [];
        const params: unknown[] = [];
        let paramIndex = 1;

        for (const date of dates) {
            const dateStr = dateToString(date);
            values.push(`($${paramIndex}, $${paramIndex + 1})`);
            params.push(cycleId, dateStr);
            paramIndex += 2;
        }

        await query(
            `INSERT INTO daily_logs (cycle_id, log_date) VALUES ${values.join(', ')}`,
            params
        );

        return NextResponse.json({ id: cycleId, year, month, start_date: startStr, end_date: endStr, config_version_id: versionId, days: dates.length }, { status: 201 });
    } catch (error) {
        console.error('POST /api/cycles error:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
