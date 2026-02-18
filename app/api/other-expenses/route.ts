import { NextResponse } from 'next/server';
import { query } from '@/lib/db';

// POST: Create a new other expense (parking/gas)
export async function POST(request: Request) {
    try {
        const body = await request.json();
        const { cycle_id, category, amount, expense_date, description } = body;

        if (!cycle_id || !category || amount === undefined || !expense_date) {
            return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
        }

        const result = await query(
            `INSERT INTO other_expenses (cycle_id, category, amount, expense_date, description)
             VALUES ($1, $2, $3, $4, $5)
             RETURNING *`,
            [cycle_id, category, amount, expense_date, description || null]
        );

        return NextResponse.json(result.rows[0], { status: 201 });
    } catch (error) {
        console.error('POST /api/other-expenses error:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
