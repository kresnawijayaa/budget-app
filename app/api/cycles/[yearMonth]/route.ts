import { NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { ConfigVersion, DailyLog, toDayEntry, calculateCycleSummary, OtherExpense } from '@/lib/budget-utils';

export async function GET(
    _request: Request,
    { params }: { params: Promise<{ yearMonth: string }> }
) {
    try {
        const { yearMonth } = await params;
        const [yearStr, monthStr] = yearMonth.split('-');
        const year = parseInt(yearStr);
        const month = parseInt(monthStr);

        if (!year || !month) {
            return NextResponse.json({ error: 'Invalid yearMonth format. Use YYYY-MM' }, { status: 400 });
        }

        // Get cycle
        const cycleResult = await query(
            'SELECT * FROM cycles WHERE year = $1 AND month = $2',
            [year, month]
        );

        if (cycleResult.rows.length === 0) {
            return NextResponse.json({ error: 'Cycle not found', year, month }, { status: 404 });
        }

        const cycle = cycleResult.rows[0] as { id: number; year: number; month: number; start_date: string; end_date: string; config_version_id: number | null };

        // Get config version for this cycle
        let config: ConfigVersion;
        if (cycle.config_version_id) {
            const cvResult = await query<ConfigVersion>('SELECT * FROM config_versions WHERE id = $1', [cycle.config_version_id]);
            config = cvResult.rows[0];
        } else {
            // Fallback to latest version
            const cvResult = await query<ConfigVersion>('SELECT * FROM config_versions ORDER BY id DESC LIMIT 1');
            config = cvResult.rows[0];
        }

        // Get daily logs
        const logsResult = await query<DailyLog>(
            'SELECT * FROM daily_logs WHERE cycle_id = $1 ORDER BY log_date ASC',
            [cycle.id]
        );

        // Compute entries with budget info
        const entries = logsResult.rows.map(log => toDayEntry(log, config));

        // Get other expenses (parking/gas)
        const otherExpensesResult = await query<OtherExpense>(
            'SELECT * FROM other_expenses WHERE cycle_id = $1 ORDER BY expense_date DESC, id DESC',
            [cycle.id]
        );
        const otherExpenses = otherExpensesResult.rows;

        // Compute summary
        const startDate = new Date(cycle.start_date + 'T00:00:00');
        const endDate = new Date(cycle.end_date + 'T00:00:00');
        const summary = calculateCycleSummary(entries, startDate, endDate, config, otherExpenses);

        return NextResponse.json({
            cycle,
            entries,
            summary,
            config,
        });
    } catch (error) {
        console.error('GET /api/cycles/[yearMonth] error:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}

export async function PATCH(
    request: Request,
    { params }: { params: Promise<{ yearMonth: string }> }
) {
    try {
        const { yearMonth } = await params;
        const [yearStr, monthStr] = yearMonth.split('-');
        const year = parseInt(yearStr);
        const month = parseInt(monthStr);
        const { config_version_id } = await request.json();

        const result = await query(
            'UPDATE cycles SET config_version_id = $1 WHERE year = $2 AND month = $3 RETURNING *',
            [config_version_id, year, month]
        );

        if (result.rows.length === 0) {
            return NextResponse.json({ error: 'Cycle not found' }, { status: 404 });
        }

        return NextResponse.json(result.rows[0]);
    } catch (error) {
        console.error('PATCH /api/cycles/[yearMonth] error:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}

export async function DELETE(
    _request: Request,
    { params }: { params: Promise<{ yearMonth: string }> }
) {
    try {
        const { yearMonth } = await params;
        const [yearStr, monthStr] = yearMonth.split('-');
        const year = parseInt(yearStr);
        const month = parseInt(monthStr);

        if (!year || !month) {
            return NextResponse.json({ error: 'Invalid yearMonth format' }, { status: 400 });
        }

        const result = await query(
            'DELETE FROM cycles WHERE year = $1 AND month = $2 RETURNING id',
            [year, month]
        );

        if (result.rows.length === 0) {
            return NextResponse.json({ error: 'Cycle not found' }, { status: 404 });
        }

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error('DELETE /api/cycles/[yearMonth] error:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
