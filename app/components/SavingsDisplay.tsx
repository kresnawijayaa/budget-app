'use client';

import { useState } from 'react';
import { formatRupiah } from '@/lib/budget-utils';
import ModalSheet from './ModalSheet';

interface SavingsDisplayProps {
    balanceAtMonthStart: number;
    cycleBudget: number;
    cycleActual: number;
    isLoading?: boolean;
}

export default function SavingsDisplay({ balanceAtMonthStart, cycleBudget, cycleActual, isLoading }: SavingsDisplayProps) {
    const [showInfo, setShowInfo] = useState(false);
    const currentBalance = balanceAtMonthStart + cycleBudget - cycleActual;
    const variance = cycleBudget - cycleActual;
    const titleId = 'savings-info-title';

    if (isLoading) {
        return (
            <div className="savings-card">
                <div className="savings-label">🏦 Saldo Rekening</div>
                <div className="skeleton-stack" aria-hidden="true">
                    <div className="skeleton skeleton-large" />
                    <div className="skeleton skeleton-wide" />
                    <div className="skeleton skeleton-medium" />
                    <div className="skeleton skeleton-long" />
                </div>
            </div>
        );
    }

    return (
        <div className="savings-card">
            <div className="savings-header-row">
                <div className="savings-label">🏦 Saldo Rekening</div>
                <button
                    className="info-btn"
                    onClick={() => setShowInfo(true)}
                    aria-label="Lihat perhitungan saldo"
                >
                    ℹ️
                </button>
            </div>
            <div className="savings-value">
                {formatRupiah(currentBalance)}
            </div>

            <div className="savings-breakdown">
                <div className="savings-detail">
                    <span className="savings-detail-label">💰 Saldo awal bulan</span>
                    <span className="savings-detail-value">{formatRupiah(balanceAtMonthStart)}</span>
                </div>
                <div className="savings-detail">
                    <span className="savings-detail-label">💸 Total Pengeluaran</span>
                    <span className="savings-detail-value negative">-{formatRupiah(cycleActual)}</span>
                </div>
                <div className="savings-detail savings-detail-total">
                    <span className="savings-detail-label">📊 Sisa Budget Bulan Ini</span>
                    <span className={`savings-detail-value ${variance >= 0 ? 'positive' : 'negative'}`}>
                        {formatRupiah(variance)}
                    </span>
                </div>
            </div>

            {showInfo && (
                <ModalSheet titleId={titleId} onClose={() => setShowInfo(false)} className="modal-narrow">
                    <div className="sheet-title" id={titleId}>Perhitungan Saldo</div>
                    <div className="sheet-content with-top-gap">
                        <p className="sheet-copy">
                            Saldo rekening dihitung dari budget harian yang tersisa. Pengeluaran parkir dan bensin tidak masuk rumus ini karena dicatat sebagai cash operasional.
                        </p>
                        <div className="formula-box">
                            <div className="formula-label">Rumus:</div>
                            <div className="formula-value">Saldo Awal + (Total Budget - Total Pengeluaran)</div>
                        </div>

                        <div className="formula-rows">
                            <div className="formula-row">
                                <span>Saldo Awal:</span>
                                <span>{formatRupiah(balanceAtMonthStart)}</span>
                            </div>
                            <div className="formula-row">
                                <span>Total Budget:</span>
                                <span>{formatRupiah(cycleBudget)}</span>
                            </div>
                            <div className="formula-row">
                                <span>Total Pengeluaran:</span>
                                <span className="negative">-{formatRupiah(cycleActual)}</span>
                            </div>
                            <hr className="formula-divider" />
                            <div className="formula-row formula-total">
                                <span>Final Saldo:</span>
                                <span>{formatRupiah(currentBalance)}</span>
                            </div>
                        </div>
                    </div>
                    <button className="btn btn-primary full-width spacious-top" onClick={() => setShowInfo(false)}>
                        Paham
                    </button>
                </ModalSheet>
            )}
        </div>
    );
}
