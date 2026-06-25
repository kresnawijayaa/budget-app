import { NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { ConfigVersion } from '@/lib/budget-utils';
import { parseInteger, parseRequiredText, readJsonObject } from '@/lib/validation';

interface PgError {
    code?: string;
    constraint?: string;
}

function isConfigVersionPrimaryKeyDuplicate(error: unknown): boolean {
    const pgError = error as PgError;
    return pgError.code === '23505' && pgError.constraint === 'config_versions_pkey';
}

async function realignConfigVersionIdSequence() {
    await query(
        `SELECT setval(
            pg_get_serial_sequence('config_versions', 'id'),
            COALESCE((SELECT MAX(id) FROM config_versions), 1),
            (SELECT COUNT(*) > 0 FROM config_versions)
        )`
    );
}

async function insertConfigVersion(values: [string, number, number, number, number, number, number, number, number]) {
    return query<ConfigVersion>(
        `INSERT INTO config_versions (name, year, month, weekday_budget, weekend_budget, carbo_loading_budget, parking_per_day, gas_per_fill, gas_fill_interval_days)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
         RETURNING *`,
        values
    );
}

export async function GET() {
    try {
        const result = await query<ConfigVersion>(
            `SELECT *
             FROM config_versions
             ORDER BY
                (year IS NULL OR month IS NULL) ASC,
                year DESC NULLS LAST,
                month DESC NULLS LAST,
                id DESC`
        );
        return NextResponse.json(result.rows);
    } catch (error) {
        console.error('GET /api/config-versions error:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}

export async function POST(request: Request) {
    try {
        const bodyResult = await readJsonObject(request);
        if (!bodyResult.ok) return NextResponse.json({ error: bodyResult.error }, { status: 400 });
        const body = bodyResult.value;

        const name = parseRequiredText(body.name, 'name', 100);
        if (!name.ok) return NextResponse.json({ error: name.error }, { status: 400 });

        const year = parseInteger(body.year, 'year', { required: true, min: 2000, max: 2100 });
        if (!year.ok) return NextResponse.json({ error: year.error }, { status: 400 });
        const month = parseInteger(body.month, 'month', { required: true, min: 1, max: 12 });
        if (!month.ok) return NextResponse.json({ error: month.error }, { status: 400 });

        const weekdayBudget = parseInteger(body.weekday_budget ?? 80000, 'weekday_budget', { min: 0 });
        if (!weekdayBudget.ok) return NextResponse.json({ error: weekdayBudget.error }, { status: 400 });
        const weekendBudget = parseInteger(body.weekend_budget ?? 70000, 'weekend_budget', { min: 0 });
        if (!weekendBudget.ok) return NextResponse.json({ error: weekendBudget.error }, { status: 400 });
        const carboLoadingBudget = parseInteger(body.carbo_loading_budget ?? 115000, 'carbo_loading_budget', { min: 0 });
        if (!carboLoadingBudget.ok) return NextResponse.json({ error: carboLoadingBudget.error }, { status: 400 });
        const parkingPerDay = parseInteger(body.parking_per_day ?? 5000, 'parking_per_day', { min: 0 });
        if (!parkingPerDay.ok) return NextResponse.json({ error: parkingPerDay.error }, { status: 400 });
        const gasPerFill = parseInteger(body.gas_per_fill ?? 50000, 'gas_per_fill', { min: 0 });
        if (!gasPerFill.ok) return NextResponse.json({ error: gasPerFill.error }, { status: 400 });
        const gasFillIntervalDays = parseInteger(body.gas_fill_interval_days ?? 3, 'gas_fill_interval_days', { min: 0 });
        if (!gasFillIntervalDays.ok) return NextResponse.json({ error: gasFillIntervalDays.error }, { status: 400 });

        const values: [string, number, number, number, number, number, number, number, number] = [
            name.value,
            year.value ?? 2000,
            month.value ?? 1,
            weekdayBudget.value ?? 80000,
            weekendBudget.value ?? 70000,
            carboLoadingBudget.value ?? 115000,
            parkingPerDay.value ?? 5000,
            gasPerFill.value ?? 50000,
            gasFillIntervalDays.value ?? 3
        ];

        let result: Awaited<ReturnType<typeof insertConfigVersion>>;
        try {
            result = await insertConfigVersion(values);
        } catch (error) {
            if (!isConfigVersionPrimaryKeyDuplicate(error)) throw error;
            await realignConfigVersionIdSequence();
            result = await insertConfigVersion(values);
        }

        return NextResponse.json(result.rows[0], { status: 201 });
    } catch (error) {
        console.error('POST /api/config-versions error:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
