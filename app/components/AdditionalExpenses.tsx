'use client';

import { formatRupiah, CycleSummary } from '@/lib/budget-utils';

interface AdditionalExpensesProps {
    summary: CycleSummary;
}

export default function AdditionalExpenses({ summary }: AdditionalExpensesProps) {
    return (
        <div className="expenses-section">
            <div className="expenses-title">Pengeluaran Tambahan</div>
            <div className="expense-row">
                <div className="expense-info">
                    <span className="expense-icon">🅿️</span>
                    <div>
                        <div className="expense-label">Parkir</div>
                        <div className="expense-days">{summary.parking_days} hari</div>
                    </div>
                </div>
                <div className="expense-value">{formatRupiah(summary.parking_budget)}</div>
            </div>
            <div className="expense-row">
                <div className="expense-info">
                    <span className="expense-icon">⛽</span>
                    <div>
                        <div className="expense-label">Bensin</div>
                        <div className="expense-days">{summary.gas_days} hari</div>
                    </div>
                </div>
                <div className="expense-value">{formatRupiah(summary.gas_budget)}</div>
            </div>
        </div>
    );
}
