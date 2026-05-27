import { NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { AppSettings } from '@/lib/budget-utils';
import { parseInteger, readJsonObject } from '@/lib/validation';

// GET: return global app settings
export async function GET() {
    try {
        const result = await query<AppSettings>('SELECT initial_savings, initial_cash FROM config WHERE id = 1');
        return NextResponse.json(result.rows[0] || { initial_savings: 0, initial_cash: 0 });
    } catch (error) {
        console.error('GET /api/config error:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}

// PUT: update global app settings
export async function PUT(request: Request) {
    try {
        const bodyResult = await readJsonObject(request);
        if (!bodyResult.ok) return NextResponse.json({ error: bodyResult.error }, { status: 400 });

        const initialSavings = parseInteger(bodyResult.value.initial_savings, 'initial_savings');
        if (!initialSavings.ok) return NextResponse.json({ error: initialSavings.error }, { status: 400 });
        const initialCash = parseInteger(bodyResult.value.initial_cash, 'initial_cash');
        if (!initialCash.ok) return NextResponse.json({ error: initialCash.error }, { status: 400 });

        if (initialSavings.value === undefined && initialCash.value === undefined) {
            return NextResponse.json({ error: 'No fields to update' }, { status: 400 });
        }

        const result = await query<AppSettings>(
            `UPDATE config SET
                initial_savings = COALESCE($1, initial_savings),
                initial_cash = COALESCE($2, initial_cash),
                updated_at = NOW()
             WHERE id = 1
             RETURNING initial_savings, initial_cash`,
            [initialSavings.value, initialCash.value]
        );

        return NextResponse.json(result.rows[0]);
    } catch (error) {
        console.error('PUT /api/config error:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
