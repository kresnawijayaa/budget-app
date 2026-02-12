'use client';

import { getMonthName } from '@/lib/budget-utils';

interface MonthSelectorProps {
    year: number;
    month: number;
    onPrev: () => void;
    onNext: () => void;
    canNext: boolean;
}

export default function MonthSelector({ year, month, onPrev, onNext, canNext }: MonthSelectorProps) {
    return (
        <div className="month-selector">
            <button className="month-nav-btn" onClick={onPrev} aria-label="Bulan sebelumnya">
                ◀
            </button>
            <span className="month-label">
                {getMonthName(month).toUpperCase()} {year}
            </span>
            <button
                className="month-nav-btn"
                onClick={onNext}
                disabled={!canNext}
                aria-label="Bulan berikutnya"
            >
                ▶
            </button>
        </div>
    );
}
