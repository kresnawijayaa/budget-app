import { NextResponse } from 'next/server';
import { query } from '@/lib/db';

export async function PATCH(
    request: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await params;
        const expenseId = parseInt(id);
        const body = await request.json();

        const updates: string[] = [];
        const values: unknown[] = [];
        let paramIndex = 1;

        if (body.amount !== undefined) {
            updates.push(`amount = $${paramIndex}`);
            values.push(body.amount);
            paramIndex++;
        }
        if (body.expense_date !== undefined) {
            updates.push(`expense_date = $${paramIndex}`);
            values.push(body.expense_date);
            paramIndex++;
        }
        if (body.description !== undefined) {
            updates.push(`description = $${paramIndex}`);
            values.push(body.description);
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
        const result = await query(
            'DELETE FROM other_expenses WHERE id = $1 RETURNING id',
            [parseInt(id)]
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
