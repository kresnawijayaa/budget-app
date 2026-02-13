'use client';

import { formatRupiah } from '@/lib/budget-utils';

interface SavingsDisplayProps {
    balanceAtMonthStart: number;
    currentMonthVariance: number;
    currentBalance: number;
}

export default function SavingsDisplay({ balanceAtMonthStart, currentMonthVariance, currentBalance }: SavingsDisplayProps) {
    return (
        <div className="savings-card">
            <div className="savings-label">
                🏦 Saldo Rekening
            </div>
            <div className="savings-value">
                {formatRupiah(currentBalance)}
            </div>
            <div className="savings-breakdown">
                <div className="savings-detail">
                    <span className="savings-detail-label">💰 Saldo awal bulan</span>
                    <span className="savings-detail-value">{formatRupiah(balanceAtMonthStart)}</span>
                </div>
                <div className="savings-detail">
                    <span className="savings-detail-label">📊 Variance bulan ini</span>
                    <span className={`savings-detail-value ${currentMonthVariance >= 0 ? 'positive' : 'negative'}`}>
                        {currentMonthVariance >= 0 ? '+' : ''}{formatRupiah(currentMonthVariance)}
                    </span>
                </div>
            </div>
        </div>
    );
}
