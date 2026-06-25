import { NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { ConfigVersion } from '@/lib/budget-utils';
import { parseInteger, parseRequiredText, readJsonObject } from '@/lib/validation';

export async function PUT(
    request: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await params;
        const versionId = Number(id);
        if (!Number.isInteger(versionId) || versionId < 1) {
            return NextResponse.json({ error: 'Invalid version ID' }, { status: 400 });
        }

        const bodyResult = await readJsonObject(request);
        if (!bodyResult.ok) return NextResponse.json({ error: bodyResult.error }, { status: 400 });
        const body = bodyResult.value;

        const name = body.name === undefined ? undefined : parseRequiredText(body.name, 'name', 100);
        if (name && !name.ok) return NextResponse.json({ error: name.error }, { status: 400 });

        const year = parseInteger(body.year, 'year', { min: 2000, max: 2100 });
        if (!year.ok) return NextResponse.json({ error: year.error }, { status: 400 });
        const month = parseInteger(body.month, 'month', { min: 1, max: 12 });
        if (!month.ok) return NextResponse.json({ error: month.error }, { status: 400 });

        const weekdayBudget = parseInteger(body.weekday_budget, 'weekday_budget', { min: 0 });
        if (!weekdayBudget.ok) return NextResponse.json({ error: weekdayBudget.error }, { status: 400 });
        const weekendBudget = parseInteger(body.weekend_budget, 'weekend_budget', { min: 0 });
        if (!weekendBudget.ok) return NextResponse.json({ error: weekendBudget.error }, { status: 400 });
        const carboLoadingBudget = parseInteger(body.carbo_loading_budget, 'carbo_loading_budget', { min: 0 });
        if (!carboLoadingBudget.ok) return NextResponse.json({ error: carboLoadingBudget.error }, { status: 400 });
        const parkingPerDay = parseInteger(body.parking_per_day, 'parking_per_day', { min: 0 });
        if (!parkingPerDay.ok) return NextResponse.json({ error: parkingPerDay.error }, { status: 400 });
        const gasPerFill = parseInteger(body.gas_per_fill, 'gas_per_fill', { min: 0 });
        if (!gasPerFill.ok) return NextResponse.json({ error: gasPerFill.error }, { status: 400 });
        const gasFillIntervalDays = parseInteger(body.gas_fill_interval_days, 'gas_fill_interval_days', { min: 0 });
        if (!gasFillIntervalDays.ok) return NextResponse.json({ error: gasFillIntervalDays.error }, { status: 400 });

        const result = await query<ConfigVersion>(
            `UPDATE config_versions SET
                name = COALESCE($1, name),
                year = COALESCE($2, year),
                month = COALESCE($3, month),
                weekday_budget = COALESCE($4, weekday_budget),
                weekend_budget = COALESCE($5, weekend_budget),
                carbo_loading_budget = COALESCE($6, carbo_loading_budget),
                parking_per_day = COALESCE($7, parking_per_day),
                gas_per_fill = COALESCE($8, gas_per_fill),
                gas_fill_interval_days = COALESCE($9, gas_fill_interval_days)
             WHERE id = $10 RETURNING *`,
            [
                name?.value,
                year.value,
                month.value,
                weekdayBudget.value,
                weekendBudget.value,
                carboLoadingBudget.value,
                parkingPerDay.value,
                gasPerFill.value,
                gasFillIntervalDays.value,
                versionId
            ]
        );

        if (result.rows.length === 0) {
            return NextResponse.json({ error: 'Version not found' }, { status: 404 });
        }

        return NextResponse.json(result.rows[0]);
    } catch (error) {
        console.error('PUT /api/config-versions/[id] error:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}

export async function DELETE(
    _request: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await params;
        const versionId = Number(id);
        if (!Number.isInteger(versionId) || versionId < 1) {
            return NextResponse.json({ error: 'Invalid version ID' }, { status: 400 });
        }

        // Check if any cycle uses this version
        const usageCheck = await query(
            'SELECT COUNT(*) as count FROM cycles WHERE config_version_id = $1',
            [versionId]
        );
        const count = parseInt((usageCheck.rows[0] as { count: string }).count);
        if (count > 0) {
            return NextResponse.json(
                { error: `Tidak bisa dihapus, ${count} siklus menggunakan versi ini` },
                { status: 409 }
            );
        }

        const result = await query(
            'DELETE FROM config_versions WHERE id = $1 RETURNING id',
            [versionId]
        );

        if (result.rows.length === 0) {
            return NextResponse.json({ error: 'Version not found' }, { status: 404 });
        }

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error('DELETE /api/config-versions/[id] error:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
