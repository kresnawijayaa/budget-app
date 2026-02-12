import { NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { Config } from '@/lib/budget-utils';

export async function GET() {
    try {
        const result = await query<Config>('SELECT * FROM config WHERE id = 1');
        if (result.rows.length === 0) {
            return NextResponse.json({ error: 'Config not found' }, { status: 404 });
        }
        return NextResponse.json(result.rows[0]);
    } catch (error) {
        console.error('GET /api/config error:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}

export async function PUT(request: Request) {
    try {
        const body = await request.json();
        const {
            weekday_budget,
            weekend_budget,
            carbo_loading_budget,
            parking_per_day,
            gas_per_fill,
            gas_fill_interval_days,
            initial_savings,
        } = body;

        const result = await query<Config>(
            `UPDATE config SET
        weekday_budget = COALESCE($1, weekday_budget),
        weekend_budget = COALESCE($2, weekend_budget),
        carbo_loading_budget = COALESCE($3, carbo_loading_budget),
        parking_per_day = COALESCE($4, parking_per_day),
        gas_per_fill = COALESCE($5, gas_per_fill),
        gas_fill_interval_days = COALESCE($6, gas_fill_interval_days),
        initial_savings = COALESCE($7, initial_savings),
        updated_at = NOW()
      WHERE id = 1
      RETURNING *`,
            [weekday_budget, weekend_budget, carbo_loading_budget, parking_per_day, gas_per_fill, gas_fill_interval_days, initial_savings]
        );

        return NextResponse.json(result.rows[0]);
    } catch (error) {
        console.error('PUT /api/config error:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
