'use client';

import { formatRupiah, CycleSummary } from '@/lib/budget-utils';

interface SummaryCardsProps {
    summary: CycleSummary;
}

export default function SummaryCards({ summary }: SummaryCardsProps) {
    const varianceClass = summary.total_variance >= 0 ? 'positive' : 'negative';

    return (
        <div className="summary-grid">
            <div className="summary-card budget">
                <div className="summary-label">Budget</div>
                <div className="summary-value budget">{formatRupiah(summary.budget_sum)}</div>
            </div>
            <div className="summary-card actual">
                <div className="summary-label">Actual</div>
                <div className="summary-value actual">{formatRupiah(summary.actual_sum)}</div>
            </div>
            <div className={`summary-card variance ${varianceClass}`}>
                <div className="summary-label">Sisa</div>
                <div className={`summary-value ${varianceClass}`}>
                    {formatRupiah(summary.total_variance)}
                </div>
            </div>
        </div>
    );
}
