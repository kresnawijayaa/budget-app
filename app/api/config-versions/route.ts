import { NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { ConfigVersion } from '@/lib/budget-utils';
import { parseInteger, parseRequiredText, readJsonObject } from '@/lib/validation';

export async function GET() {
    try {
        const result = await query<ConfigVersion>(
            'SELECT * FROM config_versions ORDER BY id ASC'
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
        const gasFillIntervalDays = parseInteger(body.gas_fill_interval_days ?? 3, 'gas_fill_interval_days', { min: 1 });
        if (!gasFillIntervalDays.ok) return NextResponse.json({ error: gasFillIntervalDays.error }, { status: 400 });

        const result = await query<ConfigVersion>(
            `INSERT INTO config_versions (name, weekday_budget, weekend_budget, carbo_loading_budget, parking_per_day, gas_per_fill, gas_fill_interval_days)
             VALUES ($1, $2, $3, $4, $5, $6, $7)
             RETURNING *`,
            [
                name.value,
                weekdayBudget.value,
                weekendBudget.value,
                carboLoadingBudget.value,
                parkingPerDay.value,
                gasPerFill.value,
                gasFillIntervalDays.value
            ]
        );

        return NextResponse.json(result.rows[0], { status: 201 });
    } catch (error) {
        console.error('POST /api/config-versions error:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
