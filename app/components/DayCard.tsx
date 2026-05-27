'use client';

import { memo, useState } from 'react';
import { DayEntry, formatRupiah } from '@/lib/budget-utils';
import { LogUpdate } from '@/lib/app-types';
import ModalSheet from './ModalSheet';
import RupiahInput from './RupiahInput';

interface DayCardProps {
    entry: DayEntry;
    isToday: boolean;
    onUpdate: (id: number, data: LogUpdate) => void;
}

type BudgetMode = 'default' | 'wfo' | 'custom';

function getBudgetMode(entry: DayEntry): BudgetMode {
    const hasCustom = (entry.custom_label && entry.custom_label.trim() !== '') || (entry.custom_budget !== null && entry.custom_budget !== undefined);
    if (hasCustom) return 'custom';
    if (entry.is_wfo) return 'wfo';
    return 'default';
}

function getSelectedBudgetLabel(mode: BudgetMode, entry: DayEntry, customBudget: number): string {
    if (mode === 'wfo') return formatRupiah(0);
    if (mode === 'custom') return formatRupiah(customBudget);
    if (getBudgetMode(entry) === 'custom' || entry.is_wfo) return 'Ikuti config';
    return formatRupiah(entry.budget);
}

function DayCard({ entry, isToday, onUpdate }: DayCardProps) {
    const [showSheet, setShowSheet] = useState(false);
    const [editValue, setEditValue] = useState<number | null>(entry.actual_amount);
    const [budgetMode, setBudgetMode] = useState<BudgetMode>(getBudgetMode(entry));
    const [customLabel, setCustomLabel] = useState(entry.custom_label || '');
    const [customBudget, setCustomBudget] = useState(entry.custom_budget ?? 0);

    const dateNum = new Date(entry.log_date + 'T00:00:00').getDate();
    const sheetTitleId = `day-sheet-title-${entry.id}`;
    const selectedBudgetLabel = getSelectedBudgetLabel(budgetMode, entry, customBudget);

    const handleOpen = () => {
        setEditValue(entry.actual_amount);
        setBudgetMode(getBudgetMode(entry));
        setCustomLabel(entry.custom_label || '');
        setCustomBudget(entry.custom_budget ?? 0);
        setShowSheet(true);
    };

    const handleSave = () => {
        const amount = editValue;
        if (budgetMode === 'custom') {
            onUpdate(entry.id, {
                actual_amount: amount,
                is_wfo: false,
                custom_label: customLabel.trim() === '' ? null : customLabel.trim(),
                custom_budget: customBudget,
            });
        } else if (budgetMode === 'wfo') {
            onUpdate(entry.id, {
                actual_amount: amount,
                is_wfo: true,
                custom_label: null,
                custom_budget: null,
            });
        } else {
            onUpdate(entry.id, {
                actual_amount: amount,
                is_wfo: false,
                custom_label: null,
                custom_budget: null,
            });
        }
        setShowSheet(false);
    };

    const handleClear = () => {
        onUpdate(entry.id, { actual_amount: null });
        setEditValue(null);
        setShowSheet(false);
    };

    const isWeekend = entry.day_of_week === 0 || entry.day_of_week === 6;
    const cardClasses = [
        'day-card',
        isToday ? 'today' : '',
        entry.is_wfo ? 'wfo' : '',
        isWeekend ? 'weekend' : '',
    ].filter(Boolean).join(' ');

    return (
        <>
            <button
                type="button"
                className={cardClasses}
                onClick={handleOpen}
                id={isToday ? 'today-card' : undefined}
                aria-label={`${dateNum} ${entry.day_name}, ${entry.actual_amount === null ? 'belum diisi' : formatRupiah(entry.actual_amount)}`}
            >
                <span className="day-date-block">
                    <span className="day-date-num">{dateNum}</span>
                    <span className="day-date-name">{entry.day_name}</span>
                </span>

                <span className="day-middle">
                    {entry.detail && (
                        <span className={`day-detail ${entry.detail === 'WFO' ? 'wfo-badge'
                            : entry.detail === 'Carbo Loading' ? 'carbo-badge'
                                : 'custom-badge'
                            }`}>
                            {entry.detail === 'WFO' ? '🏢 WFO'
                                : entry.detail === 'Carbo Loading' ? '🍝 Carbo'
                                    : `📌 ${entry.detail}`}
                        </span>
                    )}
                    <span className="day-budget">
                        {entry.budget > 0 ? formatRupiah(entry.budget) : entry.is_wfo ? '' : formatRupiah(0)}
                    </span>
                </span>

                <span className="day-right">
                    {entry.actual_amount !== null ? (
                        <>
                            <span className="day-budget">
                                Budget: {formatRupiah(entry.budget)}
                                {(entry.custom_label || entry.custom_budget) && <span className="custom-indicator"> ⭐</span>}
                            </span>
                            <span className="day-actual filled">{formatRupiah(entry.actual_amount)}</span>
                            {entry.variance !== null && (
                                <span className={`day-variance ${entry.variance >= 0 ? 'positive' : 'negative'}`}>
                                    {entry.variance >= 0 ? '+' : ''}{formatRupiah(entry.variance)}
                                </span>
                            )}
                        </>
                    ) : (
                        <span className="day-actual empty">{entry.is_wfo ? '—' : 'tap to input'}</span>
                    )}
                </span>
            </button>

            {showSheet && (
                <ModalSheet titleId={sheetTitleId} onClose={() => setShowSheet(false)}>
                    <div className="day-sheet-header">
                        <div>
                            <div className="sheet-title" id={sheetTitleId}>
                                {dateNum} {entry.day_name}
                            </div>
                            <div className="sheet-subtitle compact-subtitle">
                                Budget dipilih: {selectedBudgetLabel}
                            </div>
                        </div>
                    </div>

                    <div className="budget-mode-panel">
                        <div className="sheet-label">Budget Hari Ini</div>
                        <div className="budget-mode-grid" role="group" aria-label="Mode budget hari ini">
                            <button
                                type="button"
                                className={`budget-mode-btn ${budgetMode === 'default' ? 'active' : ''}`}
                                onClick={() => setBudgetMode('default')}
                                aria-pressed={budgetMode === 'default'}
                            >
                                <span>Default</span>
                                <small>Ikuti config</small>
                            </button>
                            <button
                                type="button"
                                className={`budget-mode-btn ${budgetMode === 'wfo' ? 'active' : ''}`}
                                onClick={() => {
                                    setBudgetMode('wfo');
                                    setEditValue(0);
                                }}
                                aria-pressed={budgetMode === 'wfo'}
                            >
                                <span>WFO</span>
                                <small>Budget Rp0</small>
                            </button>
                            <button
                                type="button"
                                className={`budget-mode-btn ${budgetMode === 'custom' ? 'active' : ''}`}
                                onClick={() => setBudgetMode('custom')}
                                aria-pressed={budgetMode === 'custom'}
                            >
                                <span>Khusus</span>
                                <small>Manual</small>
                            </button>
                        </div>

                        {budgetMode === 'custom' && (
                            <div className="custom-budget-grid">
                                <div className="sheet-input-group compact-input-group">
                                    <label className="sheet-label" htmlFor={`custom-label-${entry.id}`}>Label</label>
                                    <input
                                        id={`custom-label-${entry.id}`}
                                        className="sheet-input compact-input"
                                        type="text"
                                        placeholder="Event, outing..."
                                        value={customLabel}
                                        onChange={event => setCustomLabel(event.target.value)}
                                    />
                                </div>
                                <div className="sheet-input-group compact-input-group">
                                    <label className="sheet-label" htmlFor={`custom-budget-${entry.id}`}>Budget</label>
                                    <RupiahInput
                                        id={`custom-budget-${entry.id}`}
                                        className="sheet-input compact-input"
                                        value={customBudget}
                                        onChange={value => setCustomBudget(value ?? 0)}
                                        placeholder="Rp 0"
                                    />
                                </div>
                            </div>
                        )}
                    </div>

                    <div className="sheet-input-group sheet-panel compact-panel">
                        <div className="sheet-input-header spaced">
                            <label className="sheet-label no-margin" htmlFor={`expense-${entry.id}`}>Pengeluaran Hari Ini</label>
                            <button
                                type="button"
                                className={`spent-zero-toggle ${editValue === 0 ? 'active' : ''}`}
                                onClick={() => setEditValue(editValue === 0 ? null : 0)}
                                aria-pressed={editValue === 0}
                            >
                                <span className="toggle-label">Set Rp 0</span>
                                <span className="toggle-dot" aria-hidden="true" />
                            </button>
                        </div>
                        <RupiahInput
                            id={`expense-${entry.id}`}
                            className="sheet-input compact-input"
                            value={editValue}
                            onChange={setEditValue}
                            onEnter={handleSave}
                            autoFocus
                        />
                        <p className="sheet-help">
                            {editValue === null ? '💡 Belum diisi (tap tombol atau ketik 0)' : editValue === 0 ? '✅ Tercatat Rp 0 (hemat)' : `📝 Tercatat ${formatRupiah(editValue)}`}
                        </p>
                    </div>

                    <div className="sheet-actions">
                        <button className="btn btn-ghost" onClick={() => setShowSheet(false)}>Batal</button>
                        <button className="btn btn-primary" onClick={handleSave}>Simpan</button>
                    </div>

                    {entry.actual_amount !== null && (
                        <button className="btn btn-danger full-width with-top-gap" onClick={handleClear}>
                            Hapus Pengeluaran
                        </button>
                    )}
                </ModalSheet>
            )}
        </>
    );
}

export default memo(DayCard);
