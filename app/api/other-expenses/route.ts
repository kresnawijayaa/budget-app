import { NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { parseDateString, parseInteger, parseOptionalText, readJsonObject } from '@/lib/validation';

// POST: Create a new other expense (parking/gas)
export async function POST(request: Request) {
    try {
        const bodyResult = await readJsonObject(request);
        if (!bodyResult.ok) return NextResponse.json({ error: bodyResult.error }, { status: 400 });
        const body = bodyResult.value;

        const cycleId = parseInteger(body.cycle_id, 'cycle_id', { required: true, min: 1 });
        if (!cycleId.ok) return NextResponse.json({ error: cycleId.error }, { status: 400 });

        if (body.category !== 'parking' && body.category !== 'gas') {
            return NextResponse.json({ error: 'category must be parking or gas' }, { status: 400 });
        }

        const amount = parseInteger(body.amount, 'amount', { required: true, min: 0 });
        if (!amount.ok) return NextResponse.json({ error: amount.error }, { status: 400 });

        const expenseDate = parseDateString(body.expense_date, 'expense_date', true);
        if (!expenseDate.ok) return NextResponse.json({ error: expenseDate.error }, { status: 400 });

        const description = parseOptionalText(body.description, 'description', 100);
        if (!description.ok) return NextResponse.json({ error: description.error }, { status: 400 });

        const result = await query(
            `INSERT INTO other_expenses (cycle_id, category, amount, expense_date, description)
             VALUES ($1, $2, $3, $4, $5)
             RETURNING *`,
            [cycleId.value, body.category, amount.value, expenseDate.value, description.value ?? null]
        );

        return NextResponse.json(result.rows[0], { status: 201 });
    } catch (error) {
        console.error('POST /api/other-expenses error:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
