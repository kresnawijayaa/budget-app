import { NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { parseDateString, parseInteger, parseOptionalText, readJsonObject } from '@/lib/validation';

export async function PATCH(
    request: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await params;
        const expenseId = Number(id);
        if (!Number.isInteger(expenseId) || expenseId < 1) {
            return NextResponse.json({ error: 'Invalid ID' }, { status: 400 });
        }

        const bodyResult = await readJsonObject(request);
        if (!bodyResult.ok) return NextResponse.json({ error: bodyResult.error }, { status: 400 });
        const body = bodyResult.value;

        const allowedFields = new Set(['amount', 'expense_date', 'description']);
        const unknownField = Object.keys(body).find(key => !allowedFields.has(key));
        if (unknownField) {
            return NextResponse.json({ error: `Unknown field: ${unknownField}` }, { status: 400 });
        }

        const updates: string[] = [];
        const values: unknown[] = [];
        let paramIndex = 1;

        if (body.amount !== undefined) {
            const amount = parseInteger(body.amount, 'amount', { min: 0 });
            if (!amount.ok) return NextResponse.json({ error: amount.error }, { status: 400 });
            updates.push(`amount = $${paramIndex}`);
            values.push(amount.value);
            paramIndex++;
        }
        if (body.expense_date !== undefined) {
            const expenseDate = parseDateString(body.expense_date, 'expense_date');
            if (!expenseDate.ok) return NextResponse.json({ error: expenseDate.error }, { status: 400 });
            updates.push(`expense_date = $${paramIndex}`);
            values.push(expenseDate.value);
            paramIndex++;
        }
        if (body.description !== undefined) {
            const description = parseOptionalText(body.description, 'description', 100);
            if (!description.ok) return NextResponse.json({ error: description.error }, { status: 400 });
            updates.push(`description = $${paramIndex}`);
            values.push(description.value ?? null);
            paramIndex++;
        }

        if (updates.length === 0) {
            return NextResponse.json({ error: 'No fields to update' }, { status: 400 });
        }

        updates.push(`updated_at = NOW()`);
        values.push(expenseId);

        const result = await query(
            `UPDATE other_expenses SET ${updates.join(', ')} WHERE id = $${paramIndex} RETURNING *`,
            values
        );

        if (result.rows.length === 0) {
            return NextResponse.json({ error: 'Expense not found' }, { status: 404 });
        }

        return NextResponse.json(result.rows[0]);
    } catch (error) {
        console.error('PATCH /api/other-expenses/[id] error:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}

export async function DELETE(
    _request: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await params;
        const expenseId = Number(id);
        if (!Number.isInteger(expenseId) || expenseId < 1) {
            return NextResponse.json({ error: 'Invalid ID' }, { status: 400 });
        }

        const result = await query(
            'DELETE FROM other_expenses WHERE id = $1 RETURNING id',
            [expenseId]
        );

        if (result.rows.length === 0) {
            return NextResponse.json({ error: 'Expense not found' }, { status: 404 });
        }

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error('DELETE /api/other-expenses/[id] error:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
