import { NextResponse } from 'next/server';
import { query } from '@/lib/db';

export async function PATCH(
    request: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await params;
        const logId = parseInt(id);
        if (isNaN(logId)) {
            return NextResponse.json({ error: 'Invalid ID' }, { status: 400 });
        }

        const body = await request.json();
        const updates: string[] = [];
        const values: unknown[] = [];
        let paramIndex = 1;

        if (body.actual_amount !== undefined) {
            // Allow null to clear the value
            updates.push(`actual_amount = $${paramIndex}`);
            values.push(body.actual_amount);
            paramIndex++;
        }

        if (body.is_wfo !== undefined) {
            updates.push(`is_wfo = $${paramIndex}`);
            values.push(body.is_wfo);
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
