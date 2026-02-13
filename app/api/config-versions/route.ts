import { NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { ConfigVersion } from '@/lib/budget-utils';

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
        const body = await request.json();
        const { name, weekday_budget, weekend_budget, carbo_loading_budget, parking_per_day, gas_per_fill, gas_fill_interval_days } = body;

        if (!name) {
            return NextResponse.json({ error: 'Name is required' }, { status: 400 });
        }

        const result = await query<ConfigVersion>(
            `INSERT INTO config_versions (name, weekday_budget, weekend_budget, carbo_loading_budget, parking_per_day, gas_per_fill, gas_fill_interval_days)
             VALUES ($1, $2, $3, $4, $5, $6, $7)
             RETURNING *`,
            [name, weekday_budget ?? 80000, weekend_budget ?? 70000, carbo_loading_budget ?? 115000, parking_per_day ?? 5000, gas_per_fill ?? 50000, gas_fill_interval_days ?? 3]
        );

        return NextResponse.json(result.rows[0], { status: 201 });
    } catch (error) {
        console.error('POST /api/config-versions error:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
