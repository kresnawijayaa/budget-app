'use client';

import { useState } from 'react';
import { DayEntry, formatRupiah } from '@/lib/budget-utils';
import RupiahInput from './RupiahInput';

interface DayCardProps {
    entry: DayEntry;
    isToday: boolean;
    onUpdate: (id: number, data: { actual_amount?: number | null; is_wfo?: boolean }) => void;
}

export default function DayCard({ entry, isToday, onUpdate }: DayCardProps) {
    const [showSheet, setShowSheet] = useState(false);
    const [editValue, setEditValue] = useState(entry.actual_amount ?? 0);

    const dateNum = new Date(entry.log_date + 'T00:00:00').getDate();

    const handleOpen = () => {
        setEditValue(entry.actual_amount ?? 0);
        setShowSheet(true);
    };

    const handleSave = () => {
        const amount = editValue === 0 ? null : editValue;
        onUpdate(entry.id, { actual_amount: amount });
        setShowSheet(false);
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

    const cardClasses = [
        'day-card',
        isToday ? 'today' : '',
        entry.is_wfo ? 'wfo' : '',
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
                        <span className={`day-detail ${entry.detail === 'WFO' ? 'wfo-badge' : 'carbo-badge'}`}>
                            {entry.detail === 'WFO' ? '🏢 WFO' : '🍝 Carbo'}
                        </span>
                    )}
                    <span className="day-budget">
                        {entry.budget > 0 ? formatRupiah(entry.budget) : entry.is_wfo ? '' : formatRupiah(0)}
                    </span>
                </div>

                <div className="day-right">
                    {entry.actual_amount !== null ? (
                        <>
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

                        {!entry.is_wfo && (
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
                        )}

                        <div className="sheet-actions">
                            <button className="btn btn-ghost" onClick={() => setShowSheet(false)}>Batal</button>
                            {!entry.is_wfo && (
                                <button className="btn btn-primary" onClick={handleSave}>Simpan</button>
                            )}
                        </div>

                        {entry.actual_amount !== null && !entry.is_wfo && (
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
