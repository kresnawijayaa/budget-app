'use client';

import { useState } from 'react';
import { OperationalCashSnapshot } from '@/lib/app-types';
import { formatRupiah, CycleSummary, OtherExpense, dateToString } from '@/lib/budget-utils';
import ModalSheet from './ModalSheet';
import RupiahInput from './RupiahInput';

interface AdditionalExpensesProps {
    summary: CycleSummary;
    expenses: OtherExpense[];
    operationalCash: OperationalCashSnapshot | null;
    cycleId: number;
    onUpdateExpense: (id: number | null, data: Partial<OtherExpense>) => void;
    onDeleteExpense: (id: number) => void;
}

export default function AdditionalExpenses({
    summary,
    expenses,
    operationalCash,
    cycleId,
    onUpdateExpense,
    onDeleteExpense,
}: AdditionalExpensesProps) {
    const [showModal, setShowModal] = useState(false);
    const [showLogs, setShowLogs] = useState(false);
    const [modalCategory, setModalCategory] = useState<'parking' | 'gas'>('parking');
    const [editId, setEditId] = useState<number | null>(null);
    const [amount, setAmount] = useState<number | null>(0);
    const [date, setDate] = useState(dateToString(new Date()));
    const [description, setDescription] = useState('');

    const parkingExpenses = expenses.filter(expense => expense.category === 'parking');
    const gasExpenses = expenses.filter(expense => expense.category === 'gas');
    const totalParkingActual = parkingExpenses.reduce((sum, expense) => sum + expense.amount, 0);
    const totalGasActual = gasExpenses.reduce((sum, expense) => sum + expense.amount, 0);
    const totalActual = totalParkingActual + totalGasActual;
    const totalBudget = summary.parking_budget + summary.gas_budget;
    const variance = totalBudget - totalActual;
    const balanceAtMonthStart = operationalCash?.balance_at_month_start ?? 0;
    const currentBalance = balanceAtMonthStart + variance;
    const modalTitleId = 'operational-expense-title';

    const openAdd = (category: 'parking' | 'gas') => {
        setModalCategory(category);
        setEditId(null);
        setAmount(category === 'parking' ? 5000 : 50000);
        setDate(dateToString(new Date()));
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
            amount,
            expense_date: date,
            description,
        });
        setShowModal(false);
    };

    const handleDelete = (id: number) => {
        if (!confirm('Hapus pengeluaran ini?')) return;
        onDeleteExpense(id);
    };

    const renderExpenseList = (items: OtherExpense[], fallbackDescription: string) => (
        items.length > 0 && (
            <div className="expense-list compact-expense-list">
                {items.map(expense => {
                    const expenseDate = new Date(expense.expense_date + 'T00:00:00');
                    return (
                        <div key={expense.id} className="expense-item compact-expense-item">
                            <button className="expense-edit-btn compact-expense-edit" onClick={() => openEdit(expense)}>
                                <span className="expense-date">{expenseDate.getDate()}/{expenseDate.getMonth() + 1}</span>
                                <span>{expense.description || fallbackDescription}</span>
                            </button>
                            <div className="expense-item-actions">
                                <span className="expense-amount">{formatRupiah(expense.amount)}</span>
                                <button
                                    className="expense-delete-btn compact-delete-btn"
                                    onClick={() => handleDelete(expense.id)}
                                    aria-label={`Hapus ${expense.description || fallbackDescription}`}
                                >
                                    x
                                </button>
                            </div>
                        </div>
                    );
                })}
            </div>
        )
    );

    return (
        <div className="expenses-section">
            <div className="operational-header">
                <div>
                    <div className="expenses-title no-margin">Tracking Operasional</div>
                    <div className="operational-balance-label">Cash sekarang</div>
                    <div className="operational-balance">{formatRupiah(currentBalance)}</div>
                </div>
                <div className="operational-actions">
                    <button className="btn-mini" onClick={() => openAdd('parking')}>+ Parkir</button>
                    <button className="btn-mini" onClick={() => openAdd('gas')}>+ Bensin</button>
                </div>
            </div>

            <div className="operational-metrics" aria-label="Ringkasan saldo cash operasional">
                <div>
                    <span>Saldo awal bulan</span>
                    <strong>{formatRupiah(balanceAtMonthStart)}</strong>
                </div>
                <div>
                    <span>Total pengeluaran</span>
                    <strong className="negative">-{formatRupiah(totalActual)}</strong>
                </div>
                <div>
                    <span>Budget bulan ini</span>
                    <strong>{formatRupiah(totalBudget)}</strong>
                </div>
                <div>
                    <span>Sisa budget</span>
                    <strong className={variance >= 0 ? 'positive' : 'negative'}>{formatRupiah(variance)}</strong>
                </div>
            </div>

            <div className="operational-category-grid">
                <div className="operational-category">
                    <span className="expense-icon">P</span>
                    <span>
                        <span className="expense-label strong">Parkir</span>
                        <span className="expense-days">{formatRupiah(totalParkingActual)} / {formatRupiah(summary.parking_budget)}</span>
                    </span>
                    <span className={(summary.parking_budget - totalParkingActual) >= 0 ? 'positive' : 'negative'}>
                        {formatRupiah(summary.parking_budget - totalParkingActual)}
                    </span>
                </div>
                <div className="operational-category">
                    <span className="expense-icon">B</span>
                    <span>
                        <span className="expense-label strong">Bensin</span>
                        <span className="expense-days">{formatRupiah(totalGasActual)} / {formatRupiah(summary.gas_budget)}</span>
                    </span>
                    <span className={(summary.gas_budget - totalGasActual) >= 0 ? 'positive' : 'negative'}>
                        {formatRupiah(summary.gas_budget - totalGasActual)}
                    </span>
                </div>
            </div>

            {expenses.length > 0 && (
                <div className="operational-log">
                    <button
                        className="operational-log-toggle"
                        onClick={() => setShowLogs(value => !value)}
                        aria-expanded={showLogs}
                    >
                        <span>{showLogs ? 'Sembunyikan log' : `Lihat log (${expenses.length})`}</span>
                        <span aria-hidden="true">{showLogs ? '^' : 'v'}</span>
                    </button>
                    {showLogs && (
                        <div>
                            {renderExpenseList(parkingExpenses, 'Parkir')}
                            {renderExpenseList(gasExpenses, 'Isi Bensin')}
                        </div>
                    )}
                </div>
            )}

            {showModal && (
                <ModalSheet titleId={modalTitleId} onClose={() => setShowModal(false)} className="modal-elevated">
                    <div className="sheet-title" id={modalTitleId}>
                        {editId ? 'Edit' : 'Tambah'} {modalCategory === 'parking' ? 'Parkir' : 'Bensin'}
                    </div>

                    <div className="operational-form-grid with-top-gap">
                        <div className="sheet-input-group compact-input-group">
                            <label className="sheet-label" htmlFor="operational-amount">Jumlah</label>
                            <RupiahInput
                                id="operational-amount"
                                className="sheet-input compact-input"
                                value={amount}
                                onChange={setAmount}
                                autoFocus
                            />
                        </div>

                        <div className="sheet-input-group compact-input-group">
                            <label className="sheet-label" htmlFor="operational-date">Tanggal</label>
                            <input
                                id="operational-date"
                                type="date"
                                className="sheet-input compact-input"
                                value={date}
                                onChange={event => setDate(event.target.value)}
                            />
                        </div>

                        <div className="sheet-input-group compact-input-group operational-description-field">
                            <label className="sheet-label" htmlFor="operational-description">Keterangan</label>
                            <input
                                id="operational-description"
                                type="text"
                                className="sheet-input compact-input"
                                placeholder="Opsional"
                                value={description}
                                onChange={event => setDescription(event.target.value)}
                            />
                        </div>
                    </div>

                    <div className="sheet-actions loose">
                        <button className="btn btn-ghost" onClick={() => setShowModal(false)}>Batal</button>
                        <button className="btn btn-primary" onClick={handleSave}>Simpan</button>
                    </div>
                </ModalSheet>
            )}
        </div>
    );
}
