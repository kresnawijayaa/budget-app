import { NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { ConfigVersion } from '@/lib/budget-utils';

export async function PUT(
    request: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await params;
        const versionId = parseInt(id);
        if (!versionId) {
            return NextResponse.json({ error: 'Invalid version ID' }, { status: 400 });
        }

        const body = await request.json();
        const { name, weekday_budget, weekend_budget, carbo_loading_budget, parking_per_day, gas_per_fill, gas_fill_interval_days } = body;

        const result = await query<ConfigVersion>(
            `UPDATE config_versions SET
                name = COALESCE($1, name),
                weekday_budget = COALESCE($2, weekday_budget),
                weekend_budget = COALESCE($3, weekend_budget),
                carbo_loading_budget = COALESCE($4, carbo_loading_budget),
                parking_per_day = COALESCE($5, parking_per_day),
                gas_per_fill = COALESCE($6, gas_per_fill),
                gas_fill_interval_days = COALESCE($7, gas_fill_interval_days)
             WHERE id = $8 RETURNING *`,
            [name, weekday_budget, weekend_budget, carbo_loading_budget, parking_per_day, gas_per_fill, gas_fill_interval_days, versionId]
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
        const versionId = parseInt(id);

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
