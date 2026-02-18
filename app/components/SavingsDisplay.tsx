'use client';

import { useState } from 'react';
import { formatRupiah } from '@/lib/budget-utils';

interface SavingsDisplayProps {
    balanceAtMonthStart: number;
    cycleBudget: number;
    cycleActual: number;
    isLoading?: boolean;
}

export default function SavingsDisplay({ balanceAtMonthStart, cycleBudget, cycleActual, isLoading }: SavingsDisplayProps) {
    const [showInfo, setShowInfo] = useState(false);

    // New Logic: Saldo Rekening = Saldo Awal + Budget - Actual
    const currentBalance = balanceAtMonthStart + cycleBudget - cycleActual;
    const variance = cycleBudget - cycleActual;

    if (isLoading) {
        return (
            <div className="savings-card">
                <div className="savings-label">🏦 Saldo Rekening</div>
                <div style={{ marginTop: '12px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
                    <div className="skeleton" style={{ height: '36px', width: '60%', borderRadius: '8px' }} />
                    <div className="skeleton" style={{ height: '14px', width: '80%', borderRadius: '6px' }} />
                    <div className="skeleton" style={{ height: '14px', width: '70%', borderRadius: '6px' }} />
                    <div className="skeleton" style={{ height: '14px', width: '75%', borderRadius: '6px' }} />
                </div>
                <style jsx>{`
                    .skeleton {
                        background: linear-gradient(90deg, rgba(255,255,255,0.04) 25%, rgba(255,255,255,0.09) 50%, rgba(255,255,255,0.04) 75%);
                        background-size: 200% 100%;
                        animation: shimmer 1.4s infinite;
                    }
                    @keyframes shimmer {
                        0% { background-position: 200% 0; }
                        100% { background-position: -200% 0; }
                    }
                `}</style>
            </div>
        );
    }

    return (
        <div className="savings-card">
            <div className="savings-header-row" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div className="savings-label">
                    🏦 Saldo Rekening
                </div>
                <button
                    className="info-btn"
                    onClick={() => setShowInfo(true)}
                    style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '1.1rem', opacity: 0.7 }}
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
                <div className="savings-detail" style={{ borderTop: '1px dashed rgba(255,255,255,0.1)', marginTop: '4px', paddingTop: '4px' }}>
                    <span className="savings-detail-label">📊 Sisa Budget Bulan Ini</span>
                    <span className={`savings-detail-value ${variance >= 0 ? 'positive' : 'negative'}`}>
                        {formatRupiah(variance)}
                    </span>
                </div>
            </div>

            {showInfo && (
                <div className="modal-overlay" onClick={() => setShowInfo(false)} style={{ zIndex: 1000 }}>
                    <div className="bottom-sheet" onClick={e => e.stopPropagation()} style={{ maxWidth: '360px' }}>
                        <div className="sheet-handle" />
                        <div className="sheet-title">Perhitungan Saldo</div>
                        <div className="sheet-content" style={{ marginTop: '16px' }}>
                            <p style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', marginBottom: '12px' }}>
                                Saldo rekening Anda dihitung berdasarkan rumus berikut:
                            </p>
                            <div style={{ background: 'var(--bg-input)', padding: '12px', borderRadius: 'var(--radius-md)', border: '1px solid var(--border)', marginBottom: '16px' }}>
                                <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '4px' }}>Rumus:</div>
                                <div style={{ fontWeight: '700', fontSize: '0.95rem' }}>
                                    Saldo Awal + (Total Budget - Total Pengeluaran)
                                </div>
                            </div>

                            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem' }}>
                                    <span>Saldo Awal:</span>
                                    <span>{formatRupiah(balanceAtMonthStart)}</span>
                                </div>
                                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem' }}>
                                    <span>Total Budget:</span>
                                    <span>{formatRupiah(cycleBudget)}</span>
                                </div>
                                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem' }}>
                                    <span>Total Pengeluaran:</span>
                                    <span style={{ color: 'var(--red)' }}>-{formatRupiah(cycleActual)}</span>
                                </div>
                                <hr style={{ border: 'none', borderTop: '1px solid var(--border)' }} />
                                <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: '800', fontSize: '1rem', color: 'var(--accent-light)' }}>
                                    <span>Final Saldo:</span>
                                    <span>{formatRupiah(currentBalance)}</span>
                                </div>
                            </div>
                        </div>
                        <button className="btn btn-primary" onClick={() => setShowInfo(false)} style={{ width: '100%', marginTop: '24px' }}>
                            Paham
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
}
