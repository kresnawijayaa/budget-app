'use client';

import { useState } from 'react';
import { formatRupiah, CycleSummary, OtherExpense } from '@/lib/budget-utils';
import RupiahInput from './RupiahInput';

interface AdditionalExpensesProps {
    summary: CycleSummary;
    expenses: OtherExpense[];
    cycleId: number;
    onUpdateExpense: (id: number | null, data: Partial<OtherExpense>) => void;
    onDeleteExpense: (id: number) => void;
}

export default function AdditionalExpenses({ summary, expenses, cycleId, onUpdateExpense, onDeleteExpense }: AdditionalExpensesProps) {
    const [showModal, setShowModal] = useState(false);
    const [modalCategory, setModalCategory] = useState<'parking' | 'gas'>('parking');
    const [editId, setEditId] = useState<number | null>(null);
    const [amount, setAmount] = useState<number | null>(0);
    const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
    const [description, setDescription] = useState('');

    const parkingExpenses = expenses.filter(e => e.category === 'parking');
    const gasExpenses = expenses.filter(e => e.category === 'gas');

    const totalParkingActual = parkingExpenses.reduce((sum, e) => sum + e.amount, 0);
    const totalGasActual = gasExpenses.reduce((sum, e) => sum + e.amount, 0);

    const openAdd = (category: 'parking' | 'gas') => {
        setModalCategory(category);
        setEditId(null);
        setAmount(category === 'parking' ? 5000 : 50000);
        setDate(new Date().toISOString().split('T')[0]);
        setDescription('');
        setShowModal(true);
    };

    const openEdit = (expense: OtherExpense) => {
        setModalCategory(expense.category);
        setEditId(expense.id);
        setAmount(expense.amount);
        setDate(expense.expense_date);
        setDescription(expense.description || '');
        setShowModal(true);
    };

    const handleSave = () => {
        if (amount === null || !date) return;
        onUpdateExpense(editId, {
            cycle_id: cycleId,
            category: modalCategory,
            amount: amount,
            expense_date: date,
            description: description
        });
        setShowModal(false);
    };

    const handleDelete = (id: number) => {
        if (!confirm('Hapus pengeluaran ini?')) return;
        onDeleteExpense(id);
    };

    return (
        <div className="expenses-section">
            <div className="expenses-title">🎯 Tracking Operasional</div>

            {/* PARKING */}
            <div className="category-block" style={{ marginBottom: '24px' }}>
                <div className="category-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                    <div className="expense-info">
                        <span className="expense-icon">🅿️</span>
                        <div>
                            <div className="expense-label" style={{ fontWeight: '700' }}>Parkir</div>
                            <div className="expense-days">Budget: {formatRupiah(summary.parking_budget)}</div>
                        </div>
                    </div>
                    <button className="btn-mini" onClick={() => openAdd('parking')}>+ Tambah</button>
                </div>

                {parkingExpenses.length > 0 && (
                    <div className="expense-list" style={{ marginBottom: '8px' }}>
                        {parkingExpenses.map(e => (
                            <div key={e.id} className="expense-item" style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', padding: '6px 0', borderBottom: '1px solid rgba(255,255,255,0.03)' }}>
                                <div onClick={() => openEdit(e)} style={{ cursor: 'pointer' }}>
                                    <span style={{ color: 'var(--text-muted)', marginRight: '8px' }}>{new Date(e.expense_date).getDate()} Rab</span>
                                    <span>{e.description || 'P' + new Date(e.expense_date).getDate()}</span>
                                </div>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                    <span style={{ fontWeight: '600' }}>{formatRupiah(e.amount)}</span>
                                    <button onClick={() => handleDelete(e.id)} style={{ background: 'none', border: 'none', opacity: 0.3 }}>✕</button>
                                </div>
                            </div>
                        ))}
                    </div>
                )}

                <div className="category-footer" style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', background: 'rgba(255,255,255,0.03)', padding: '8px', borderRadius: '6px' }}>
                    <span style={{ color: 'var(--text-muted)' }}>Sisa Budget:</span>
                    <span style={{ fontWeight: '700', color: (summary.parking_budget - totalParkingActual) >= 0 ? 'var(--green)' : 'var(--red)' }}>
                        {formatRupiah(summary.parking_budget - totalParkingActual)}
                    </span>
                </div>
            </div>

            {/* GAS */}
            <div className="category-block">
                <div className="category-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                    <div className="expense-info">
                        <span className="expense-icon">⛽</span>
                        <div>
                            <div className="expense-label" style={{ fontWeight: '700' }}>Bensin</div>
                            <div className="expense-days">Budget: {formatRupiah(summary.gas_budget)}</div>
                        </div>
                    </div>
                    <button className="btn-mini" onClick={() => openAdd('gas')}>+ Tambah</button>
                </div>

                {gasExpenses.length > 0 && (
                    <div className="expense-list" style={{ marginBottom: '8px' }}>
                        {gasExpenses.map(e => (
                            <div key={e.id} className="expense-item" style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', padding: '6px 0', borderBottom: '1px solid rgba(255,255,255,0.03)' }}>
                                <div onClick={() => openEdit(e)} style={{ cursor: 'pointer' }}>
                                    <span style={{ color: 'var(--text-muted)', marginRight: '8px' }}>{new Date(e.expense_date).getDate()}/{new Date(e.expense_date).getMonth() + 1}</span>
                                    <span>{e.description || 'Isi Bensin'}</span>
                                </div>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                    <span style={{ fontWeight: '600' }}>{formatRupiah(e.amount)}</span>
                                    <button onClick={() => handleDelete(e.id)} style={{ background: 'none', border: 'none', opacity: 0.3 }}>✕</button>
                                </div>
                            </div>
                        ))}
                    </div>
                )}

                <div className="category-footer" style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', background: 'rgba(255,255,255,0.03)', padding: '8px', borderRadius: '6px' }}>
                    <span style={{ color: 'var(--text-muted)' }}>Sisa Budget:</span>
                    <span style={{ fontWeight: '700', color: (summary.gas_budget - totalGasActual) >= 0 ? 'var(--green)' : 'var(--red)' }}>
                        {formatRupiah(summary.gas_budget - totalGasActual)}
                    </span>
                </div>
            </div>

            {showModal && (
                <div className="modal-overlay" onClick={() => setShowModal(false)} style={{ zIndex: 1000 }}>
                    <div className="bottom-sheet" onClick={e => e.stopPropagation()}>
                        <div className="sheet-handle" />
                        <div className="sheet-title">{editId ? 'Edit' : 'Tambah'} {modalCategory === 'parking' ? 'Parkir' : 'Bensin'}</div>

                        <div className="sheet-input-group" style={{ marginTop: '16px' }}>
                            <label className="sheet-label">Jumlah (Rp)</label>
                            <RupiahInput
                                className="sheet-input"
                                value={amount}
                                onChange={setAmount}
                                autoFocus
                            />
                        </div>

                        <div className="sheet-input-group">
                            <label className="sheet-label">Tanggal</label>
                            <input
                                type="date"
                                className="sheet-input"
                                value={date}
                                onChange={e => setDate(e.target.value)}
                            />
                        </div>

                        <div className="sheet-input-group">
                            <label className="sheet-label">Keterangan (Opsional)</label>
                            <input
                                type="text"
                                className="sheet-input"
                                placeholder="Cth: Parkir Mall, Pertamax..."
                                value={description}
                                onChange={e => setDescription(e.target.value)}
                            />
                        </div>

                        <div className="sheet-actions" style={{ marginTop: '24px' }}>
                            <button className="btn btn-ghost" onClick={() => setShowModal(false)}>Batal</button>
                            <button className="btn btn-primary" onClick={handleSave}>
                                Simpan
                            </button>
                        </div>
                    </div>
                </div>
            )}

            <style jsx>{`
                .category-block {
                    background: rgba(255, 255, 255, 0.02);
                    border: 1px solid var(--border);
                    border-radius: var(--radius-md);
                    padding: 14px;
                }
                .btn-mini {
                    background: var(--accent);
                    color: black;
                    border: none;
                    padding: 6px 14px;
                    border-radius: 20px;
                    font-size: 0.75rem;
                    font-weight: 700;
                    cursor: pointer;
                    transition: all 0.2s;
                    box-shadow: 0 2px 10px var(--accent-glow);
                }
                .btn-mini:hover {
                    background: var(--accent-light);
                    transform: translateY(-1px);
                    box-shadow: 0 4px 15px var(--accent-glow);
                }
                .expense-item {
                    transition: background 0.2s;
                    border-radius: 4px;
                    padding: 8px 4px !important;
                }
                .expense-item:hover {
                    background: rgba(255,255,255,0.05);
                }
            `}</style>
        </div>
    );
}
