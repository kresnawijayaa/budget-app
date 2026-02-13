import { NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { AppSettings } from '@/lib/budget-utils';

// GET: return initial_savings only
export async function GET() {
    try {
        const result = await query<AppSettings>('SELECT initial_savings FROM config WHERE id = 1');
        return NextResponse.json(result.rows[0] || { initial_savings: 0 });
    } catch (error) {
        console.error('GET /api/config error:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}

// PUT: update initial_savings only
export async function PUT(request: Request) {
    try {
        const { initial_savings } = await request.json();

        const result = await query<AppSettings>(
            'UPDATE config SET initial_savings = $1, updated_at = NOW() WHERE id = 1 RETURNING initial_savings',
            [initial_savings ?? 0]
        );

        return NextResponse.json(result.rows[0]);
    } catch (error) {
        console.error('PUT /api/config error:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
