'use client';

import { formatRupiah } from '@/lib/budget-utils';

interface SavingsDisplayProps {
    totalSavings: number;
}

export default function SavingsDisplay({ totalSavings }: SavingsDisplayProps) {
    return (
        <div className="savings-card">
            <div className="savings-label">
                💰 Total Tabungan
            </div>
            <div className="savings-value">
                {formatRupiah(totalSavings)}
            </div>
        </div>
    );
}
