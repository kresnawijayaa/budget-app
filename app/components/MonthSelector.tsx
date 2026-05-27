'use client';

import { useState } from 'react';
import { getCurrentCycleYearMonth, getMonthName, getNextCycleYearMonth } from '@/lib/budget-utils';
import ModalSheet from './ModalSheet';

interface MonthSelectorProps {
    year: number;
    month: number;
    onPrev: () => void;
    onNext: () => void;
    onChange: (year: number, month: number) => void;
    canNext: boolean;
    disabled?: boolean;
}

const MONTHS = Array.from({ length: 12 }, (_, index) => index + 1);

export default function MonthSelector({ year, month, onPrev, onNext, onChange, canNext, disabled }: MonthSelectorProps) {
    const [showPicker, setShowPicker] = useState(false);
    const [selectedYear, setSelectedYear] = useState(year);
    const [selectedMonth, setSelectedMonth] = useState(month);
    const isDisabled = !!disabled;
    const currentCycle = getCurrentCycleYearMonth();
    const maxCycle = getNextCycleYearMonth(currentCycle.year, currentCycle.month);
    const minYear = 2000;
    const maxYear = maxCycle.year;
    const titleId = 'month-picker-title';

    const openPicker = () => {
        setSelectedYear(year);
        setSelectedMonth(month);
        setShowPicker(true);
    };

    const handleApply = () => {
        onChange(selectedYear, selectedMonth);
        setShowPicker(false);
    };

    const isMonthDisabled = (monthValue: number) => (
        selectedYear > maxCycle.year || (selectedYear === maxCycle.year && monthValue > maxCycle.month)
    );

    return (
        <>
            <div className="month-selector">
                <button className="month-nav-btn" onClick={onPrev} disabled={isDisabled} aria-label="Bulan sebelumnya">{'<'}</button>
                <button
                    type="button"
                    className="month-picker-btn"
                    onClick={openPicker}
                    disabled={isDisabled}
                    aria-haspopup="dialog"
                >
                    {getMonthName(month)} {year}
                </button>
                <button className="month-nav-btn" onClick={onNext} disabled={!canNext || isDisabled} aria-label="Bulan berikutnya">{'>'}</button>
            </div>

            {showPicker && (
                <ModalSheet titleId={titleId} onClose={() => setShowPicker(false)} className="modal-narrow">
                    <div className="sheet-title" id={titleId}>Pilih Siklus</div>

                    <div className="month-picker-controls with-top-gap">
                        <label className="sheet-label" htmlFor="cycle-year">Tahun</label>
                        <input
                            id="cycle-year"
                            className="sheet-input compact-input"
                            type="number"
                            inputMode="numeric"
                            min={minYear}
                            max={maxYear}
                            value={selectedYear}
                            onChange={event => setSelectedYear(Math.min(maxYear, Math.max(minYear, parseInt(event.target.value, 10) || year)))}
                        />
                    </div>

                    <div className="month-grid" role="group" aria-label="Pilih bulan">
                        {MONTHS.map(monthValue => (
                            <button
                                key={monthValue}
                                type="button"
                                className={`month-chip ${selectedMonth === monthValue ? 'active' : ''}`}
                                onClick={() => setSelectedMonth(monthValue)}
                                disabled={isMonthDisabled(monthValue)}
                                aria-pressed={selectedMonth === monthValue}
                            >
                                {getMonthName(monthValue).slice(0, 3)}
                            </button>
                        ))}
                    </div>

                    <div className="sheet-actions loose">
                        <button className="btn btn-ghost" onClick={() => setShowPicker(false)}>Batal</button>
                        <button className="btn btn-primary" onClick={handleApply} disabled={isMonthDisabled(selectedMonth)}>Buka</button>
                    </div>
                </ModalSheet>
            )}
        </>
    );
}
