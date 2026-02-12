'use client';

import { formatRupiah } from '@/lib/budget-utils';

interface SavingsDisplayProps {
    initialSavings: number;
    filledVariance: number;
    totalSavings: number;
}

export default function SavingsDisplay({ initialSavings, filledVariance, totalSavings }: SavingsDisplayProps) {
    return (
        <div className="savings-card">
            <div className="savings-label">
                💰 Total Tabungan
            </div>
            <div className="savings-value">
                {formatRupiah(totalSavings)}
            </div>
            <div className="savings-breakdown">
                <div className="savings-detail">
                    <span className="savings-detail-label">🏦 Di rekening</span>
                    <span className="savings-detail-value">{formatRupiah(initialSavings)}</span>
                </div>
                <div className="savings-detail">
                    <span className="savings-detail-label">📊 Variance terisi</span>
                    <span className={`savings-detail-value ${filledVariance >= 0 ? 'positive' : 'negative'}`}>
                        {filledVariance >= 0 ? '+' : ''}{formatRupiah(filledVariance)}
                    </span>
                </div>
            </div>
        </div>
    );
}
