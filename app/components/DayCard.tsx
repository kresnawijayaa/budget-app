'use client';

import { useState } from 'react';
import { DayEntry, formatRupiah } from '@/lib/budget-utils';
import RupiahInput from './RupiahInput';

interface DayCardProps {
    entry: DayEntry;
    isToday: boolean;
    onUpdate: (id: number, data: { actual_amount?: number | null; is_wfo?: boolean; custom_label?: string | null; custom_budget?: number | null }) => void;
}

export default function DayCard({ entry, isToday, onUpdate }: DayCardProps) {
    const [showSheet, setShowSheet] = useState(false);
    const [editValue, setEditValue] = useState(entry.actual_amount ?? 0);

    // Check if entry has custom settings
    const hasCustom = (entry.custom_label && entry.custom_label.trim() !== '') || (entry.custom_budget !== null && entry.custom_budget !== undefined);
    const [useCustom, setUseCustom] = useState(hasCustom);
    const [customLabel, setCustomLabel] = useState(entry.custom_label || '');
    const [customBudget, setCustomBudget] = useState(entry.custom_budget ?? 0);

    const dateNum = new Date(entry.log_date + 'T00:00:00').getDate();

    const handleOpen = () => {
        setEditValue(entry.actual_amount ?? 0);
        const hasCustom = (entry.custom_label && entry.custom_label.trim() !== '') || (entry.custom_budget !== null && entry.custom_budget !== undefined);
        setUseCustom(hasCustom);
        setCustomLabel(entry.custom_label || '');
        setCustomBudget(entry.custom_budget ?? 0);
        setShowSheet(true);
    };

    const handleSave = () => {
        const amount = editValue === 0 ? null : editValue;

        // Only save custom values if toggle is ON
        if (useCustom) {
            const label = customLabel.trim() === '' ? null : customLabel.trim();
            // Budget: allow 0 as a valid custom budget
            const budget = customBudget;
            onUpdate(entry.id, { actual_amount: amount, custom_label: label, custom_budget: budget });
        } else {
            // If toggle OFF, clear custom values
            onUpdate(entry.id, { actual_amount: amount, custom_label: null, custom_budget: null });
        }
        setShowSheet(false);
    };

    const handleResetCustom = () => {
        setUseCustom(false);
        setCustomLabel('');
        setCustomBudget(0);
    };

    const handleWfoToggle = () => {
        onUpdate(entry.id, { is_wfo: !entry.is_wfo });
        setShowSheet(false);
    };

    const handleClear = () => {
        onUpdate(entry.id, { actual_amount: null });
        setEditValue(0);
        setShowSheet(false);
    };

    const isWeekend = entry.day_of_week === 0 || entry.day_of_week === 6; // Sunday or Saturday

    const cardClasses = [
        'day-card',
        isToday ? 'today' : '',
        entry.is_wfo ? 'wfo' : '',
        isWeekend ? 'weekend' : '',
    ].filter(Boolean).join(' ');

    return (
        <>
            <div className={cardClasses} onClick={handleOpen} id={isToday ? 'today-card' : undefined}>
                <div className="day-date-block">
                    <div className="day-date-num">{dateNum}</div>
                    <div className="day-date-name">{entry.day_name}</div>
                </div>

                <div className="day-middle">
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
                </div>

                <div className="day-right">
                    {entry.actual_amount !== null ? (
                        <>
                            <div className="day-budget">
                                Budget: {formatRupiah(entry.budget)}
                                {(entry.custom_label || entry.custom_budget) && <span className="custom-indicator"> ⭐</span>}
                            </div>
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
                </div>
            </div>

            {showSheet && (
                <div className="modal-overlay" onClick={() => setShowSheet(false)}>
                    <div className="bottom-sheet" onClick={e => e.stopPropagation()}>
                        <div className="sheet-handle" />
                        <div className="sheet-title">
                            {dateNum} {entry.day_name}
                            {entry.detail ? ` · ${entry.detail}` : ''}
                        </div>
                        <div className="sheet-subtitle">
                            Budget: {formatRupiah(entry.budget)}
                        </div>

                        <div className="sheet-wfo-toggle">
                            <span className="sheet-wfo-label">🏢 WFO (Budget = 0)</span>
                            <button
                                className={`toggle ${entry.is_wfo ? 'active' : ''}`}
                                onClick={handleWfoToggle}
                                aria-label="Toggle WFO"
                            />
                        </div>

                        {/* Custom Settings */}
                        <div className="sheet-custom-section">
                            <div className="sheet-wfo-toggle">
                                <span className="sheet-wfo-label">✨ Pengaturan Khusus</span>
                                <button
                                    className={`toggle ${useCustom ? 'active' : ''}`}
                                    onClick={() => setUseCustom(!useCustom)}
                                    aria-label="Toggle Custom Settings"
                                />
                            </div>

                            {useCustom && (
                                <>
                                    <div className="sheet-input-group">
                                        <label className="sheet-label">Label Khusus</label>
                                        <input
                                            className="sheet-input"
                                            type="text"
                                            placeholder="Cth: Ulang Tahun, Liburan..."
                                            value={customLabel}
                                            onChange={e => setCustomLabel(e.target.value)}
                                        />
                                    </div>

                                    <div className="sheet-input-group">
                                        <label className="sheet-label">Budget Khusus</label>
                                        <RupiahInput
                                            className="sheet-input"
                                            value={customBudget}
                                            onChange={setCustomBudget}
                                            placeholder="Rp 0"
                                        />
                                    </div>

                                    <button className="btn btn-ghost" onClick={handleResetCustom} style={{ width: '100%', fontSize: '0.8rem', marginTop: 8 }}>
                                        🔄 Reset ke Default
                                    </button>
                                </>
                            )}
                        </div>

                        {/* Pengeluaran */}
                        <div className="sheet-input-group">
                            <label className="sheet-label">Pengeluaran Hari Ini</label>
                            <RupiahInput
                                className="sheet-input"
                                value={editValue}
                                onChange={setEditValue}
                                onEnter={handleSave}
                                autoFocus
                            />
                        </div>

                        <div className="sheet-actions">
                            <button className="btn btn-ghost" onClick={() => setShowSheet(false)}>Batal</button>
                            <button className="btn btn-primary" onClick={handleSave}>Simpan</button>
                        </div>

                        {entry.actual_amount !== null && (
                            <button
                                className="btn btn-danger"
                                onClick={handleClear}
                                style={{ width: '100%', marginTop: 8 }}
                            >
                                Hapus Pengeluaran
                            </button>
                        )}
                    </div>
                </div>
            )}
        </>
    );
}
