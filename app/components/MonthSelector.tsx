'use client';

import { getMonthName } from '@/lib/budget-utils';

interface MonthSelectorProps {
    year: number;
    month: number;
    onPrev: () => void;
    onNext: () => void;
    canNext: boolean;
    disabled?: boolean;
}

export default function MonthSelector({ year, month, onPrev, onNext, canNext, disabled }: MonthSelectorProps) {
    return (
        <div className="month-selector">
            <button className="month-nav-btn" onClick={onPrev} disabled={disabled} aria-label="Bulan sebelumnya">‹</button>
            <span className="month-label">{getMonthName(month)} {year}</span>
            <button className="month-nav-btn" onClick={onNext} disabled={!canNext || disabled} aria-label="Bulan berikutnya">›</button>
        </div>
    );
}
