import { NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { parseBoolean, parseInteger, parseOptionalText, readJsonObject } from '@/lib/validation';

export async function PATCH(
    request: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await params;
        const logId = Number(id);
        if (!Number.isInteger(logId) || logId < 1) {
            return NextResponse.json({ error: 'Invalid ID' }, { status: 400 });
        }

        const bodyResult = await readJsonObject(request);
        if (!bodyResult.ok) return NextResponse.json({ error: bodyResult.error }, { status: 400 });
        const body = bodyResult.value;

        const allowedFields = new Set(['actual_amount', 'is_wfo', 'custom_label', 'custom_budget']);
        const unknownField = Object.keys(body).find(key => !allowedFields.has(key));
        if (unknownField) {
            return NextResponse.json({ error: `Unknown field: ${unknownField}` }, { status: 400 });
        }

        const updates: string[] = [];
        const values: unknown[] = [];
        let paramIndex = 1;

        if (body.actual_amount !== undefined) {
            let amount: number | null = null;
            if (body.actual_amount !== null) {
                const amountResult = parseInteger(body.actual_amount, 'actual_amount', { min: 0 });
                if (!amountResult.ok) return NextResponse.json({ error: amountResult.error }, { status: 400 });
                amount = amountResult.value ?? null;
            }
            // Allow null to clear the value
            updates.push(`actual_amount = $${paramIndex}`);
            values.push(amount);
            paramIndex++;
        }

        if (body.is_wfo !== undefined) {
            const isWfo = parseBoolean(body.is_wfo, 'is_wfo');
            if (!isWfo.ok) return NextResponse.json({ error: isWfo.error }, { status: 400 });
            updates.push(`is_wfo = $${paramIndex}`);
            values.push(isWfo.value);
            paramIndex++;
        }

        if (body.custom_label !== undefined) {
            const label = parseOptionalText(body.custom_label, 'custom_label', 100);
            if (!label.ok) return NextResponse.json({ error: label.error }, { status: 400 });
            updates.push(`custom_label = $${paramIndex}`);
            values.push(label.value ?? null);
            paramIndex++;
        }

        if (body.custom_budget !== undefined) {
            let budget: number | null = null;
            if (body.custom_budget !== null) {
                const budgetResult = parseInteger(body.custom_budget, 'custom_budget', { min: 0 });
                if (!budgetResult.ok) return NextResponse.json({ error: budgetResult.error }, { status: 400 });
                budget = budgetResult.value ?? null;
            }
            updates.push(`custom_budget = $${paramIndex}`);
            values.push(budget);
            paramIndex++;
        }

        if (updates.length === 0) {
            return NextResponse.json({ error: 'No fields to update' }, { status: 400 });
        }

        updates.push(`updated_at = NOW()`);
        values.push(logId);

        const result = await query(
            `UPDATE daily_logs SET ${updates.join(', ')} WHERE id = $${paramIndex} RETURNING *`,
            values
        );

        if (result.rows.length === 0) {
            return NextResponse.json({ error: 'Log not found' }, { status: 404 });
        }

        return NextResponse.json(result.rows[0]);
    } catch (error) {
        console.error('PATCH /api/daily-logs/[id] error:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
