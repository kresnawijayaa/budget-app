import { NextResponse } from 'next/server';
import { query, transaction } from '@/lib/db';
import { getCycleStartDate, getCycleEndDate, getCycleDates, dateToString } from '@/lib/budget-utils';
import { parseInteger, readJsonObject } from '@/lib/validation';

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
        const bodyResult = await readJsonObject(request);
        if (!bodyResult.ok) {
            return NextResponse.json({ error: bodyResult.error }, { status: 400 });
        }
        const body = bodyResult.value;

        const yearResult = parseInteger(body.year, 'year', { required: true, min: 2000, max: 2100 });
        if (!yearResult.ok) return NextResponse.json({ error: yearResult.error }, { status: 400 });

        const monthResult = parseInteger(body.month, 'month', { required: true, min: 1, max: 12 });
        if (!monthResult.ok) return NextResponse.json({ error: monthResult.error }, { status: 400 });

        const configVersionResult = parseInteger(body.config_version_id, 'config_version_id', { min: 1 });
        if (!configVersionResult.ok) return NextResponse.json({ error: configVersionResult.error }, { status: 400 });

        const year = yearResult.value;
        const month = monthResult.value;
        if (year === undefined || month === undefined) {
            return NextResponse.json({ error: 'year and month are required' }, { status: 400 });
        }
        const requestedVersionId = configVersionResult.value;

        // Check if cycle already exists
        const existing = await query('SELECT id FROM cycles WHERE year = $1 AND month = $2', [year, month]);
        if (existing.rows.length > 0) {
            return NextResponse.json({ error: 'Cycle already exists', cycle_id: (existing.rows[0] as { id: number }).id }, { status: 409 });
        }

        // Determine config version: use provided, or latest
        let versionId: number | null = requestedVersionId ?? null;
        if (!versionId) {
            const latestVersion = await query('SELECT id FROM config_versions ORDER BY id DESC LIMIT 1');
            versionId = latestVersion.rows.length > 0 ? (latestVersion.rows[0] as { id: number }).id : null;
        } else {
            const versionExists = await query('SELECT id FROM config_versions WHERE id = $1', [versionId]);
            if (versionExists.rows.length === 0) {
                return NextResponse.json({ error: 'Config version not found' }, { status: 400 });
            }
        }

        const startDate = getCycleStartDate(year, month);
        const endDate = getCycleEndDate(year, month);

        const startStr = dateToString(startDate);
        const endStr = dateToString(endDate);

        // Generate daily log entries
        const dates = getCycleDates(startDate, endDate);

        const cycleId = await transaction(async client => {
            const cycleResult = await client.query<{ id: number }>(
                'INSERT INTO cycles (year, month, start_date, end_date, config_version_id) VALUES ($1, $2, $3, $4, $5) RETURNING id',
                [year, month, startStr, endStr, versionId]
            );
            const newCycleId = cycleResult.rows[0].id;

            const values: string[] = [];
            const params: unknown[] = [];
            let paramIndex = 1;

            for (const date of dates) {
                const dateStr = dateToString(date);
                values.push(`($${paramIndex}, $${paramIndex + 1})`);
                params.push(newCycleId, dateStr);
                paramIndex += 2;
            }

            await client.query(
                `INSERT INTO daily_logs (cycle_id, log_date) VALUES ${values.join(', ')}`,
                params
            );

            return newCycleId;
        });

        return NextResponse.json({ id: cycleId, year, month, start_date: startStr, end_date: endStr, config_version_id: versionId, days: dates.length }, { status: 201 });
    } catch (error) {
        console.error('POST /api/cycles error:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
